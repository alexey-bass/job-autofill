# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

**Job Application Autofill** — a Manifest V3 Chrome extension that fills a saved
profile (name, email, phone, location, LinkedIn, …) into job application forms with
one click. Public repo: `alexey-bass/job-autofill`.

Plain JS/HTML/CSS, loaded as an unpacked extension. **No build step, no dependencies.**

## Layout

| File | Purpose |
| --- | --- |
| `manifest.json` | MV3 config: permissions, popup, version |
| `popup.html` / `popup.css` / `popup.js` | Profile editor + "Fill this page" button |
| `filler.js` | `fillForms(profile)` — injected into the page; finds and fills fields |
| `generate-icons.js` | Regenerates `icons/*.png` (pure Node, no deps) |
| `test/filler.test.mjs` | Field-matching tests against a DOM mock (`npm test`) |
| `README.md` | End-user docs · `CHANGELOG.md` — version history |

There is no background service worker (the keyboard shortcut was removed in 1.2.0).

## How `filler.js` works

`fillForms(profile)` is serialized and injected via `chrome.scripting.executeScript`
into **all frames** (to reach embedded iframes), so it must stay **fully
self-contained** — no references to anything outside its own body. It:

- collects `input`/`textarea`/`select`, descending into **shadow DOM**;
- builds a signal string per field from autocomplete, type, name, id, placeholder,
  aria-label, the linked `<label>`, and the nearest preceding label text;
- matches against an ordered `rules` array (English + Polish keywords), with smart
  first-name-vs-full-name detection based on whether a separate surname field exists;
- fills only empty, visible fields; React/Vue-safe via the native value setter;
- returns `{ filled, scanned }` for the popup's status message.

## Validate before committing

```sh
npm test                 # field-matching tests (test/filler.test.mjs)
node --check filler.js && node --check popup.js
node -e "JSON.parse(require('fs').readFileSync('manifest.json'))"   # manifest is valid JSON
```

If you change CSS/JS behavior, also reload the unpacked extension at
`chrome://extensions` and click **Fill this page** on a real form to confirm.

## Conventions

- **Keep it simple** — no frameworks, no build, no over-engineering.
- **Version every functional change**: bump `version` in **both** `manifest.json`
  and `package.json` (keep them in sync) and add a `CHANGELOG.md` entry (semver).
- **Update docs**: `README.md` (users) and this file (when structure/conventions change).
- **Commit & push** directly to `main` when asked — don't ask for confirmation.

## Change tracking (GitHub issues)

Track every change with a GitHub issue (`gh` CLI, authenticated as `alexey-bass`):

1. `gh issue create --title "<short title>" --body "<what & why>"`
2. Implement the change (version bump + changelog + tests per the conventions above).
3. Commit referencing the issue and push to `main`:
   `git commit -m "<summary> (closes #N)"` then `git push`.
4. `gh issue close N --comment "<commit sha>"` and confirm it's closed.
