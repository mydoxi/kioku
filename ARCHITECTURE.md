# Kioku — architecture

**Product:** the AI workspace layer platforms can't take away. Local-first archive,
search, folders, portable memory and export across Claude, ChatGPT (and later
Gemini/Grok). Sister product of Yume Themes.

## MVP scope (v0.1)

Local archive + instant full-text search for Claude + ChatGPT, with per-chat
Markdown export. Everything stored in the browser (IndexedDB) — nothing leaves
the machine.

## How it works

```
claude.ai / chatgpt.com page
  content/capture-core.js       shared engine: debounced MutationObserver,
  content/capture-<site>.js     per-site config (selectors, id, title)
        │  chrome.runtime.sendMessage({type:"kioku-upsert", convo})
        ▼
  background.js (module SW)  ──►  lib/db.js  ──►  IndexedDB "kioku"
        ▲                                           (extension origin)
        │  direct import (same origin)
  dashboard/  +  popup/
```

- **Capture**: content script scrapes the visible conversation (role + text per
  message) on every settled DOM change, hashes it, and upserts only when content
  actually changed. Streaming messages are skipped until complete.
- **Storage**: one `conversations` store, key `"<platform>:<conversationId>"`,
  with title, url, updatedAt, and messages[]. The service worker owns writes;
  extension pages (dashboard/popup) read the same IndexedDB directly.
- **Search** (MVP): linear scan over titles + message text. Fine into the
  thousands of conversations; upgrade path is a token index in a second store.
- **Selectors** live only in the per-site capture configs, so a site redesign
  means editing one small file — and they can later be moved to the same
  remote-hotfix pattern proven in Yume Themes.

## Feature map (v0.3)

- ✅ Local archive + search (Claude, ChatGPT, Gemini)
- ✅ Folders (create/rename/delete, assign, filter; survives re-capture)
- ✅ Bulk export — current filtered view to .md / .json (`lib/export.js`)
- ✅ Portable memory — blocks managed in dashboard (`dashboard/memory.js`),
  inserted into any chat input via the on-page 記 button
  (`content/memory-inject.js`, data served by the SW)
- ✅ Performance mode — `content-visibility: auto` on message rows
  (`content/perf-mode.js`), toggle in popup, default ON
- ⬜ Grok capture config (`content/sites/grok.js` when wanted)
- ⬜ Remote selector hotfix (same pattern as Yume Themes)
- ⬜ Pro tier (payments via ExtensionPay or license key)

## File conventions

- One site = one config file in `content/sites/` (selectors live ONLY there)
- One dashboard view = one module (`dashboard/memory.js`, …) imported by
  `dashboard.js`, which owns routing/state
- All storage access goes through `lib/db.js`; all export formats through
  `lib/export.js`
