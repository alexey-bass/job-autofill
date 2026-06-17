// Field-matching tests for fillForms(). Runs in Node against a minimal DOM mock.
//   npm test
import { fillForms } from '../filler.js';

globalThis.CSS = { escape: (s) => s };
globalThis.Event = class { constructor(t) { this.type = t; } };
globalThis.MouseEvent = class { constructor(t, o) { this.type = t; Object.assign(this, o); } };
globalThis.window = { getComputedStyle: () => ({ visibility: 'visible', opacity: '1' }) };

let LIGHT = [];
let SHADOW = [];
let ITIS = []; // mock intl-tel-input .iti containers (phone country picker)
globalThis.document = {
  querySelectorAll: (sel) =>
    sel === '.iti'
      ? ITIS
      : sel === '*'
        ? (SHADOW.length ? [{ shadowRoot: { querySelectorAll: (s) => (s === '*' ? [] : SHADOW) } }] : [])
        : LIGHT,
  querySelector: (sel) => {
    const m = sel.match(/label\[for="(.+)"\]/);
    if (m) { const f = [...LIGHT, ...SHADOW].find((x) => x.id === m[1] && x._label); return f ? { textContent: f._label } : null; }
    return null;
  },
  getElementById: () => null,
};

class Field {
  constructor(o = {}) {
    this.tagName = (o.tag || 'input').toUpperCase();
    this._type = o.type || 'text';
    this.name = o.name || '';
    this.id = o.id || '';
    this._attrs = {
      placeholder: o.placeholder || '', 'aria-label': o.ariaLabel || '', autocomplete: o.autocomplete || '',
      role: o.role || '', 'aria-haspopup': o.ariaHaspopup || '', 'aria-autocomplete': o.ariaAutocomplete || '',
    };
    this._label = o.label || '';
    this._value = o.value || '';
    this.disabled = false;
    this.readOnly = false;
    this.options = (o.options || []).map((t) => ({ textContent: t, value: t }));
    this.selectedIndex = this.tagName === 'SELECT' ? 0 : -1;
    this.previousElementSibling = null;
    this.parentElement = null;
  }
  getAttribute(k) { if (k === 'type') return this._type; return k in this._attrs ? this._attrs[k] : null; }
  get value() { return this._value; }
  set value(v) { this._value = v; }
  getClientRects() { return [{}]; }
  closest() { return null; }
  querySelector() { return null; }
  dispatchEvent() { return true; }
  focus() {} blur() {}
}

// A field whose visible label is NOT linked (no for=/wrapping/aria); the label
// sits as a preceding sibling of the input's wrapper, like many React forms.
function labelless(o) {
  const input = new Field(o);
  const label = { previousElementSibling: null, querySelector: () => null, textContent: o.near };
  const wrapper = { previousElementSibling: label, parentElement: null, querySelector: () => null };
  input.parentElement = wrapper;
  return input;
}

const PROFILE = {
  firstName: 'Aleks', lastName: 'Bass',
  email: 'test@example.com', phone: '5551234567',
  city: 'Testowo', country: 'Polska', location: '',
  linkedin: 'https://linkedin.com/in/aleks', website: 'https://aleks.dev',
};

let pass = 0, fail = 0;
function run(name, fields, expect, shadowFields = []) {
  LIGHT = fields; SHADOW = shadowFields;
  fillForms(PROFILE);
  const ALL = [...LIGHT, ...SHADOW];
  let ok = true;
  for (const [id, want] of Object.entries(expect)) {
    const f = ALL.find((x) => x.id === id);
    const got = f ? f._value : '<missing>';
    if (got !== want) { ok = false; console.log(`  ✗ ${id}: got "${got}", want "${want}"`); }
  }
  if (ok) { pass++; console.log(`✓ ${name}`); } else { fail++; console.log(`✗ ${name}`); }
}

run('A) Name+Surname split → Name=first', [
  new Field({ id: 'name', name: 'name', label: 'Name' }),
  new Field({ id: 'surname', name: 'surname', label: 'Surname' }),
  new Field({ id: 'email', type: 'email', label: 'E-mail' }),
  new Field({ id: 'phone', type: 'tel', label: 'Phone' }),
], { name: 'Aleks', surname: 'Bass', email: 'test@example.com', phone: '5551234567' });

run('B) Single Full name → full name', [new Field({ id: 'fullname', label: 'Full name' })], { fullname: 'Aleks Bass' });
run('C) Single Name (no surname) → full name', [new Field({ id: 'name', label: 'Name' })], { name: 'Aleks Bass' });
run('D) First name + Last name explicit', [
  new Field({ id: 'fn', label: 'First name' }), new Field({ id: 'ln', label: 'Last name' }),
], { fn: 'Aleks', ln: 'Bass' });
run('E) Polish: Imię/Nazwisko/Telefon/Miasto', [
  new Field({ id: 'imie', label: 'Imię' }), new Field({ id: 'nazwisko', label: 'Nazwisko' }),
  new Field({ id: 'tel', label: 'Telefon' }), new Field({ id: 'miasto', label: 'Miasto' }),
], { imie: 'Aleks', nazwisko: 'Bass', tel: '5551234567', miasto: 'Testowo' });
run('F) name="fname"/"lname" attributes', [
  new Field({ id: 'a', name: 'fname' }), new Field({ id: 'b', name: 'lname' }),
], { a: 'Aleks', b: 'Bass' });

run('G) Label-less React form', [
  labelless({ id: 'fn', near: 'First name*' }), labelless({ id: 'ln', near: 'Last name*' }),
  labelless({ id: 'em', type: 'email', near: 'Email*' }), labelless({ id: 'em2', type: 'email', near: 'Confirm your email*' }),
  labelless({ id: 'city', near: 'City*' }), labelless({ id: 'phone', type: 'tel', near: 'Phone number*' }),
  labelless({ id: 'li', near: 'LinkedIn' }), labelless({ id: 'web', near: 'Website' }),
], {
  fn: 'Aleks', ln: 'Bass', em: 'test@example.com', em2: 'test@example.com',
  city: 'Testowo', phone: '5551234567', li: 'https://linkedin.com/in/aleks', web: 'https://aleks.dev',
});

run('H) Fields inside shadow DOM', [], { sfn: 'Aleks', sem: 'test@example.com' }, [
  new Field({ id: 'sfn', label: 'First name' }), new Field({ id: 'sem', type: 'email', label: 'Email' }),
]);

// I) job-application forms: field identifiers/headings contain "job", which must
// NOT disqualify the first name (regression for the reply.com report).
run('I) job-application field names (job in identifier)', [
  new Field({ id: 'fn', name: 'jobApplication.firstName' }),
  new Field({ id: 'ln', name: 'jobApplication.lastName' }),
], { fn: 'Aleks', ln: 'Bass' });

// L) Elevato / ASP.NET WebForms: every field lives in one container named
// "...FirstNameLastNameEmail...", so the substrings first/last/email leak into
// every field's name+id. Keyword matching then misfires (the email rule's
// substring match grabs all four, and the name rules self-reject on their neg
// list), but each field has a correct autocomplete attribute that must win.
const ELEVATO = 'ctl00$Survey1$ctl01$JobOffersCandidatesFirstNameLastNameEmailFE1$';
run('L) ASP.NET compound name → trust autocomplete', [
  new Field({ id: 'fn', name: ELEVATO + 'TxtFirstName', autocomplete: 'given-name', label: 'Imię' }),
  new Field({ id: 'ln', name: ELEVATO + 'TxtLastName', autocomplete: 'family-name', label: 'Nazwisko' }),
  new Field({ id: 'em', name: ELEVATO + 'TxtEmail', autocomplete: 'email', label: 'Adres e-mail' }),
  new Field({ id: 'ph', name: ELEVATO + 'TxtCellPhone', autocomplete: 'tel', label: 'Telefon komórkowy' }),
], { fn: 'Aleks', ln: 'Bass', em: 'test@example.com', ph: '5551234567' });

// M) Single combined "First name, Last name" field (people.andersenlab.com):
// one input whose placeholder names BOTH parts. The split first/last rules each
// self-reject (placeholder has "last" / "first"); it must get the full name.
run('M) combined "First name, Last name" → full name', [
  new Field({ id: 'name', name: 'name', placeholder: 'First name, Last name*' }),
  new Field({ id: 'email', type: 'email', placeholder: 'E-mail*' }),
], { name: 'Aleks Bass', email: 'test@example.com' });

// N) Polish single combined "Imię i nazwisko" field → full name (not just surname).
run('N) combined "Imię i nazwisko" → full name', [
  new Field({ id: 'name', name: 'name', label: 'Imię i nazwisko' }),
], { name: 'Aleks Bass' });

// J) intl-tel-input phone country code (Greenhouse): the dial-code flag is a
// vanilla-JS widget. The country isn't typed — the dropdown is opened and the
// <li> matching the profile country is clicked.
function itiItem(name, code) {
  return {
    _name: name, _clicked: false,
    querySelector: (s) => (s === '.iti__country-name' ? { textContent: name } : null),
    getAttribute: (k) => (k === 'data-country-code' ? code : null),
    get textContent() { return name + '+0'; },
    dispatchEvent(e) { if (e.type === 'click') this._clicked = true; return true; },
  };
}
function itiMock(items) {
  const btn = { _clicked: false, dispatchEvent(e) { if (e.type === 'click') this._clicked = true; return true; } };
  const list = { querySelectorAll: (s) => (s === '.iti__country' ? items : []) };
  return {
    _btn: btn, _items: items,
    querySelector: (s) => (s === '.iti__selected-country' ? btn : s === '.iti__country-list' ? list : null),
  };
}
(function phoneCountryTest() {
  LIGHT = []; SHADOW = [];
  const de = itiItem('Germany', 'de'), pl = itiItem('Polska', 'pl'), us = itiItem('United States', 'us');
  const iti = itiMock([de, pl, us]);
  ITIS = [iti];
  fillForms(PROFILE); // country: 'Polska'
  ITIS = [];
  if (pl._clicked && iti._btn._clicked && !de._clicked && !us._clicked) {
    pass++; console.log('✓ J) intl-tel-input: opens dropdown and selects matching country');
  } else {
    fail++; console.log(`✗ J) intl-tel-input (btn:${iti._btn._clicked} de:${de._clicked} pl:${pl._clicked} us:${us._clicked})`);
  }
})();

// K) react-select combobox can't be filled from a content script, so it must be
// skipped — not left with stray search text (and not counted as filled).
(function comboboxSkipTest() {
  const combo = new Field({ id: 'country', label: 'Country', role: 'combobox', ariaHaspopup: 'true', ariaAutocomplete: 'list' });
  LIGHT = [combo]; SHADOW = []; ITIS = [];
  fillForms(PROFILE);
  if (combo._value === '') { pass++; console.log('✓ K) react-select combobox is skipped, not filled'); }
  else { fail++; console.log(`✗ K) react-select combobox: got "${combo._value}", want ""`); }
})();

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
