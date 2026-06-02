// This function is injected into the page via chrome.scripting.executeScript.
// It is serialized with .toString(), so it MUST be fully self-contained:
// every helper lives inside it and it references nothing from module scope.
export function fillForms(profile) {
  profile = profile || {};

  // ---- derived values ----
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim();
  const location =
    (profile.location || '').trim() ||
    [profile.city, profile.state, profile.country].filter(Boolean).join(', ');

  // ---- helpers ----
  function labelText(el) {
    let text = '';
    if (el.id) {
      try {
        const lbl = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
        if (lbl) text += ' ' + lbl.textContent;
      } catch (e) { /* invalid selector */ }
    }
    const wrap = el.closest('label');
    if (wrap) text += ' ' + wrap.textContent;
    const labelledby = el.getAttribute('aria-labelledby');
    if (labelledby) {
      labelledby.split(/\s+/).forEach(function (id) {
        const n = document.getElementById(id);
        if (n) text += ' ' + n.textContent;
      });
    }
    return text;
  }

  // Fallback for forms whose visible label isn't linked to the input via
  // for=/wrapping/aria (common in React-based ATS forms): grab the nearest
  // preceding text that isn't itself a field container.
  function nearbyText(el) {
    let node = el;
    for (let depth = 0; depth < 4 && node; depth++) {
      let prev = node.previousElementSibling;
      while (prev) {
        const hasControl = prev.querySelector && prev.querySelector('input, select, textarea, button');
        if (!hasControl) {
          const t = (prev.textContent || '').replace(/\*/g, '').trim();
          if (t && t.length <= 60) return t;
        }
        prev = prev.previousElementSibling;
      }
      node = node.parentElement;
    }
    return '';
  }

  function signals(el) {
    return [
      el.name,
      el.id,
      el.getAttribute('placeholder'),
      el.getAttribute('aria-label'),
      el.getAttribute('autocomplete'),
      el.getAttribute('data-test') || el.getAttribute('data-testid'),
      labelText(el),
      nearbyText(el),
    ].filter(Boolean).join(' ').toLowerCase();
  }

  function visible(el) {
    if (el.type === 'hidden') return false;
    if (el.getClientRects().length === 0) return false; // display:none / detached
    const style = window.getComputedStyle(el);
    return style.visibility !== 'hidden' && style.opacity !== '0';
  }

  function isFillable(el) {
    if (el.disabled || el.readOnly) return false;
    if (!visible(el)) return false; // skip hidden honeypot fields
    const tag = el.tagName.toLowerCase();
    if (tag === 'select') return el.selectedIndex <= 0; // only if nothing chosen
    const t = (el.getAttribute('type') || 'text').toLowerCase();
    const bad = ['hidden', 'submit', 'button', 'reset', 'checkbox', 'radio',
      'file', 'password', 'image', 'range', 'color', 'date', 'datetime-local', 'time', 'month', 'week'];
    if (bad.indexOf(t) !== -1) return false;
    if (el.value && el.value.trim()) return false; // don't clobber existing input
    return true;
  }

  function matchesRule(sig, type, rule) {
    if (rule.neg.some(function (n) { return sig.indexOf(n) !== -1; })) return false;
    if (rule.types && type && rule.types.indexOf(type) !== -1) return true;
    if (rule.auto.some(function (a) {
      return new RegExp('\\b' + a.replace(/-/g, '\\-') + '\\b').test(sig);
    })) return true;
    // short abbreviations (fname/lname) must match as whole words, otherwise
    // "lname" would match inside "fullname", "fname" inside other tokens, etc.
    if (rule.word && rule.word.some(function (w) {
      return new RegExp('\\b' + w + '\\b').test(sig);
    })) return true;
    return rule.kw.some(function (k) { return sig.indexOf(k) !== -1; });
  }

  // React/Vue track values via the native setter; bypass any framework override
  // so the change actually registers in their state.
  function setNativeValue(el, value) {
    const proto = Object.getPrototypeOf(el);
    const ownDesc = Object.getOwnPropertyDescriptor(el, 'value');
    const protoDesc = Object.getOwnPropertyDescriptor(proto, 'value');
    const ownSetter = ownDesc && ownDesc.set;
    const protoSetter = protoDesc && protoDesc.set;
    if (protoSetter && ownSetter && ownSetter !== protoSetter) {
      protoSetter.call(el, value);
    } else if (protoSetter) {
      protoSetter.call(el, value);
    } else {
      el.value = value;
    }
  }

  function fire(el) {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function fillSelect(el, value) {
    const v = String(value).toLowerCase().trim();
    let match = null;
    for (const opt of el.options) {
      const ot = (opt.textContent || '').toLowerCase().trim();
      const ov = (opt.value || '').toLowerCase().trim();
      if (ot === v || ov === v) { match = opt; break; }
    }
    if (!match) {
      for (const opt of el.options) {
        const ot = (opt.textContent || '').toLowerCase().trim();
        if (ot.length > 1 && (ot.indexOf(v) !== -1 || v.indexOf(ot) !== -1)) { match = opt; break; }
      }
    }
    if (!match) return false;
    el.value = match.value;
    fire(el);
    return true;
  }

  function fillField(el, value) {
    if (el.tagName.toLowerCase() === 'select') return fillSelect(el, value);
    el.focus();
    setNativeValue(el, String(value));
    fire(el);
    el.blur();
    return true;
  }

  // ---- scan the form once to understand its name layout ----
  const entries = Array.from(document.querySelectorAll('input, textarea, select'))
    .map(function (el) {
      return { el: el, sig: signals(el), type: (el.getAttribute('type') || '').toLowerCase() };
    });

  // Does the form split the name into separate fields? If a dedicated
  // surname/last-name field exists, then a field labelled merely "Name"
  // means the FIRST name, not the full name.
  const LAST_RE = /(sur\s*name|last\s*name|last[_-]?name|family\s*name|family[_-]?name|\blname\b|nazwisko)/;
  const splitName = entries.some(function (e) { return LAST_RE.test(e.sig); });

  // ---- field rules, ordered by priority (first match wins per field) ----
  const rules = [
    { value: profile.email, types: ['email'], auto: ['email'],
      kw: ['e-mail', 'email'], neg: [] },
    { value: profile.phone, types: ['tel'], auto: ['tel', 'tel-national'],
      kw: ['phone', 'telephone', 'mobile', 'cell', 'telefon'], neg: ['extension', 'company'] },
    { value: profile.lastName, auto: ['family-name'], word: ['lname'],
      kw: ['last name', 'lastname', 'last_name', 'surname', 'sur name', 'family name', 'familyname', 'nazwisko'],
      neg: ['first', 'maiden'] },
    { value: profile.firstName, auto: ['given-name'], word: ['fname'],
      // bare "name" counts as first name only when the form has a separate surname field
      kw: ['first name', 'firstname', 'first_name', 'given name', 'givenname', 'forename', 'imię', 'imie']
        .concat(splitName ? ['name'] : []),
      neg: ['last', 'sur', 'surname', 'family', 'full', 'middle', 'maiden', 'company',
        'user', 'file', 'display', 'event', 'nick', 'screen', 'job', 'nazwisko'] },
    { value: fullName, auto: ['name'],
      // when the name is split, never let the generic "name" token grab a field here
      kw: splitName
        ? ['full name', 'fullname', 'full_name', 'legal name', 'complete name', 'whole name']
        : ['full name', 'fullname', 'your name', 'legal name', 'name'],
      neg: ['first', 'last', 'sur', 'user', 'company', 'file', 'middle', 'nick',
        'screen', 'maiden', 'event', 'field', 'display', 'job', 'nazwisko'] },
    { value: profile.address, auto: ['street-address', 'address-line1'],
      kw: ['street', 'address line', 'address', 'addr', 'adres'], neg: ['email', 'e-mail', 'ip ', 'url', 'web'] },
    { value: profile.city, auto: ['address-level2'],
      kw: ['city', 'town', 'suburb', 'miasto', 'locality'], neg: [] },
    { value: profile.state, auto: ['address-level1'],
      kw: ['state', 'province', 'region', 'county', 'województwo', 'wojewodztwo'],
      neg: ['statement', 'united states', 'estate'] },
    { value: profile.zip, auto: ['postal-code'],
      kw: ['zip', 'postal', 'postcode', 'post code', 'kod pocztowy', 'kod-pocztowy'], neg: [] },
    { value: profile.country, auto: ['country', 'country-name'],
      kw: ['country', 'nation', 'kraj'], neg: [] },
    { value: location, auto: [],
      kw: ['location', 'where are you', 'where do you live', 'current city', 'based in', 'your area', 'lokalizacja'], neg: [] },
    { value: profile.linkedin, auto: [], kw: ['linkedin'], neg: [] },
    { value: profile.github, auto: [], kw: ['github'], neg: [] },
    { value: profile.website, auto: [],
      kw: ['website', 'portfolio', 'personal site', 'your site', 'homepage', 'url', 'strona'],
      neg: ['linkedin', 'github', 'company'] },
  ];

  // ---- run ----
  let filled = 0;
  for (const entry of entries) {
    if (!isFillable(entry.el)) continue;
    for (const rule of rules) {
      if (!rule.value) continue;
      if (matchesRule(entry.sig, entry.type, rule)) {
        if (fillField(entry.el, rule.value)) filled++;
        break;
      }
    }
  }
  return filled;
}
