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

## Roadmap after MVP

1. Folders/projects (tag conversations, sidebar tree)
2. Bulk export (Markdown/JSON/PDF)
3. Portable memory: stored context blocks auto-inserted into new chats
4. Performance mode: DOM virtualization for long chats
5. Gemini + Grok capture configs
6. Pro tier (payments via ExtensionPay or license key)
