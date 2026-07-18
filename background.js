// Kioku — background service worker. Owns all IndexedDB writes; content
// scripts talk to it via messaging.

import {
  upsertConversation,
  countConversations,
  getMemoryBlocks,
} from "./lib/db.js";

// ---- remote hotfix (data only, never code) ----
// If a supported site changes its markup, updated selectors are published to
// this JSON file and picked up within hours — no store re-review. Same
// policy-compliant pattern as Yume Themes.
const HOTFIX_URL =
  "https://raw.githubusercontent.com/mydoxi/kioku-hotfix/main/hotfix.json";

async function refreshHotfix() {
  try {
    const res = await fetch(HOTFIX_URL, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    if (typeof data !== "object" || !data) return;
    await chrome.storage.local.set({
      kiokuHotfix: { sites: data.sites || {}, inputSelectors: data.inputSelectors || [], version: data.version || 0 },
    });
  } catch {
    // Offline / repo unreachable — bundled selectors keep working.
  }
}

chrome.runtime.onInstalled.addListener(() => {
  refreshHotfix();
  chrome.alarms.create("kioku-hotfix", { periodInMinutes: 360 });
});
chrome.runtime.onStartup.addListener(refreshHotfix);
chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === "kioku-hotfix") refreshHotfix();
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "kioku-upsert" && msg.convo?.key) {
    upsertConversation(msg.convo)
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true; // async response
  }

  if (msg?.type === "kioku-count") {
    countConversations()
      .then((n) => sendResponse({ ok: true, count: n }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }

  if (msg?.type === "kioku-get-memory") {
    getMemoryBlocks()
      .then((blocks) =>
        sendResponse({ ok: true, blocks: blocks.filter((b) => b.enabled) })
      )
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }
});
