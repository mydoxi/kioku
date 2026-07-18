// Kioku — background service worker. Owns all IndexedDB writes; content
// scripts send captured conversations here via messaging.

import { upsertConversation, countConversations } from "./lib/db.js";

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
});
