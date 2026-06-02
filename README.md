# Job Application Autofill

A Chrome extension (Manifest V3) that saves your basic info once and fills it into
job application forms with one click — name, email, phone, location, and more.

## Install (load unpacked)

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select this `job-autofill` folder.
4. Pin the extension from the puzzle-piece menu so it's one click away.

## Use

1. Click the extension icon and fill in your details. They save automatically
   (in `chrome.storage.sync`, so they follow your Chrome sign-in across devices).
2. On any job application page, click **Fill this page**.
3. The popup reports how many fields were filled.

## What it fills

Core: first name, last name, email, phone, location, LinkedIn.
Optional (under **Address & links**): street, city, state/region, ZIP, country,
GitHub, website/portfolio.

It matches each form field using its `autocomplete` attribute, input `type`,
`name`/`id`, placeholder, `aria-label`, linked `<label>` text, and — when no label
is linked to the input — the nearest preceding label text. It also fills
matching `<select>` dropdowns (e.g. country). It reaches inside embedded application
iframes (Greenhouse, Lever, SmartRecruiters, …) and shadow-DOM / web-component forms.
Labels in **English or Polish** are recognized (Imię, Nazwisko, Telefon, Miasto, Kraj, …).

**Smart name handling:** if the form has a separate surname field (e.g. *Name* +
*Surname*, or *Imię* + *Nazwisko*), a field labelled just "Name" gets your **first
name**. If there's only a single name field, it gets your **full name**.

Safe by default: it only fills **empty, visible** fields, so it won't overwrite
anything you've typed or trip hidden anti-bot honeypot fields. Always review the
form before submitting — matching is heuristic and not every site is covered.

## Privacy

Your data never leaves your browser. There are no network requests and no analytics.
Permissions: `storage` (save your profile), plus `scripting` + `activeTab` + host access
(`<all_urls>`) so the filler can run in the page **and any embedded application iframe** —
but only when you click **Fill this page**, and it sends nothing off your device.

## Customize

- **Add a field:** add an `<input>` in `popup.html`, add its id to `FIELDS` in
  `popup.js`, and add a rule (value + keywords) to the `rules` array in `filler.js`.
- **Regenerate icons:** `node generate-icons.js`.

## Files

| File | Purpose |
| --- | --- |
| `manifest.json` | Extension config (MV3) |
| `popup.html/.css/.js` | Profile editor + "Fill this page" button |
| `filler.js` | Self-contained field-matching/fill logic injected into the page |
| `generate-icons.js` | Regenerates the PNG icons (no dependencies) |
| `package.json` | Project metadata + version (synced with `manifest.json`) |
| `CHANGELOG.md` | Version history |

## Changelog

Version history is tracked in [CHANGELOG.md](CHANGELOG.md). The version lives in
`manifest.json` and `package.json` — bump it and add a changelog entry on every change.
