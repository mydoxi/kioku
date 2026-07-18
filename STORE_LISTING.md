# Chrome Web Store — listing kit for Kioku

## Before you submit

1. Push this repo to GitHub (done: https://github.com/mydoxi/kioku) — privacy
   policy URL: `https://github.com/mydoxi/kioku/blob/main/PRIVACY.md`
2. Zip the extension folder contents (manifest.json at zip root; exclude .git
   and the .md files — same tar command pattern as Yume Themes).
3. Screenshots 1280×800 (use all 5 slots, text-overlay banners):
   dashboard with archived chats · search results with highlights · Memory
   view · the 記 button inserting context on claude.ai · popup with perf toggle.

## Listing content

**Name (from package, localizable later):** Kioku - AI Chat Archive & Search

**Summary:** Local archive, search, folders, portable memory & export for
Claude, ChatGPT and Gemini. 100% private — nothing leaves your browser.

**Description:**
```
They keep breaking your AI workspace. Own it yourself.

AI platforms lose your chat history, trim it, redesign it, or lock your
memory into their silo. Kioku is the workspace layer they can't take away —
stored entirely in YOUR browser.

🗄 AUTOMATIC ARCHIVE — every conversation on Claude, ChatGPT and Gemini is
saved locally as you chat. Platforms forget; Kioku doesn't.

🔍 INSTANT SEARCH — full-text search across every platform in one place,
not just titles.

📁 FOLDERS — organize chats into projects that survive every redesign.

🧠 PORTABLE MEMORY — write your context once ("about me", "my project",
"my style"), insert it into any AI chat with one click. Works identically
on Claude, ChatGPT and Gemini — your memory belongs to you, not a platform.

📤 EXPORT — any chat or any filtered set as clean Markdown or JSON.

⚡ PERFORMANCE MODE — native browser virtualization makes long chats scroll
smoothly again.

🔒 RADICALLY PRIVATE — no account, no server, no analytics. Your archive
lives in your browser's local database and nowhere else. Ever.

Made by an independent developer. Bug reports welcome via the extension.

Unofficial. Not affiliated with Anthropic, OpenAI, or Google. Product names
are used only to describe compatibility.
```

**Category:** Tools (Productivity)

## Privacy tab answers

- **Single purpose:** "Archives and organizes the user's own AI chat
  conversations locally in their browser, with search, folders, context
  insertion, and export."
- **storage:** "Stores the user's archived conversations, folders, memory
  blocks and settings locally (IndexedDB / chrome.storage). Nothing is
  transmitted anywhere."
- **alarms:** "Schedules a periodic check for a small public configuration
  file (updated CSS selectors) so archiving keeps working when the supported
  sites change their page structure."
- **Host permissions (claude.ai, chatgpt.com, chat.openai.com,
  gemini.google.com):** "Content scripts run on these AI chat sites to read
  the conversation the user is viewing and save it into their local archive,
  and to offer the optional context-insert button. Content is processed
  locally only and never transmitted."
- **Remote code:** NO — all JS ships in the package; only JSON configuration
  data is fetched.
- **Data usage:** check NONE. Per the Chrome Web Store FAQ, "collection" means
  transmitting user data off the device — Kioku transmits nothing; all
  processing and storage is local. The privacy policy states this explicitly.
- Certify all three disclosure statements.

## Review expectations

Host permissions on four popular domains + a "reads page content" purpose
means a manual in-depth review is likely (days, not hours). The single-purpose
statement, local-only privacy policy, and "remote code: NO" answer are what
gets it through. Do not add any analytics before or after listing without
updating the privacy policy and data-usage form first.

## Monetization (when ready)

Free: archive + search + 1 folder + 3 memory blocks. Pro (~$4/mo or $29/yr via
ExtensionPay): unlimited folders & memory, bulk export, priority hotfixes.
Gate in `lib/limits.js` (to be written) so limits live in one file.
