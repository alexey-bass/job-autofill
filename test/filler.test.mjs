// Field-matching tests for fillForms(). Runs in Node against a minimal DOM mock.
//   npm test
import { fillForms } from '../filler.js';

globalThis.CSS = { escape: (s) => s };
globalThis.Event = class { constructor(t) { this.type = t; } };
globalThis.window = { getComputedStyle: () => ({ visibility: 'visible', opacity: '1' }) };

let LIGHT = [];
let SHADOW = [];
globalThis.document = {
  querySelectorAll: (sel) =>
    sel === '*'
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
    this._attrs = { placeholder: o.placeholder || '', 'aria-label': o.ariaLabel || '', autocomplete: o.autocomplete || '' };
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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
