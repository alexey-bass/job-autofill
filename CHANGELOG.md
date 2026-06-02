# Changelog

All notable changes are documented here. The version lives in `manifest.json` and
`package.json`; bump it and add an entry here on every change.

## [1.4.0] - 2026-06-02

### Changed
- **On-click access by default**: dropped the `<all_urls>` host permission and rely
  on `activeTab`, so the extension can only read or change a page after you click
  "Fill this page". It still injects into same-origin frames and pierces shadow DOM.

### Added
- GitHub repository link in the extension description, and a `homepage_url`.

### Note
- A form served inside a *cross-origin* iframe may be unreachable under on-click
  access. If a site stops filling, broad host access can be re-enabled.

## [1.3.0] - 2026-06-02

### Added
- Pierce **shadow DOM** when scanning for fields, so forms built as web components
  are now found.
- Diagnostic popup message: when nothing matches, it reports how many fields were
  scanned ("No match (saw N fields)") vs. none found at all.

### Changed
- Added the `<all_urls>` host permission and inject into **all frames**, so the
  filler can reach forms inside cross-origin application iframes (e.g.
  SmartRecruiters). It still runs only when you click "Fill this page" and sends
  nothing off your device.

## [1.2.0] - 2026-06-02

### Added
- Nearby-label detection: fields whose visible label isn't linked to the input
  via `for=`/wrapping/`aria-*` (common in React-based ATS forms) are now matched
  by the closest preceding label text.

### Changed
- Removed the `Alt+Shift+F` keyboard shortcut, the background service worker, and
  the `commands` permission. Fill via the popup's **Fill this page** button.

### Fixed
- Popup now shows "Add your details first" when the profile is empty, instead of
  the misleading "No matching fields".

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
