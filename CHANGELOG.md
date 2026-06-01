# Changelog

All notable changes are documented here. The version lives in `manifest.json` and
`package.json`; bump it and add an entry here on every change.

## [1.1.0] - 2026-06-01

### Added
- Smart name detection: when a form has a separate surname field (e.g. *Name* +
  *Surname*, or *Imię* + *Nazwisko*), a field labelled just "Name" is filled with
  the **first name**. A lone name field still gets the **full name**.
- Polish label support (Imię, Nazwisko, Telefon, Miasto, Kraj, Województwo,
  Kod pocztowy, Adres) alongside English.
- LinkedIn profile URL promoted to a primary, always-visible popup field so it
  fills into the common "LinkedIn" field on application forms.

### Fixed
- Short abbreviation keywords (`fname`/`lname`) now match as whole words, so a
  "Full name" field is no longer mistaken for a surname field.

## [1.0.0] - 2026-06-01

### Added
- Initial release: popup profile editor, one-click **Fill this page**, and the
  **Alt+Shift+F** shortcut.
- Field matching by `autocomplete`, input `type`, `name`/`id`, placeholder,
  `aria-label`, and `<label>` text; fills text inputs, textareas, and `<select>`
  dropdowns; works inside embedded iframes. React/Vue-safe value setting.
