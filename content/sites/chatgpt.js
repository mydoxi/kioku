// Kioku — ChatGPT (chatgpt.com / chat.openai.com) capture config.
// Selectors are data, overridable by the remote hotfix (see capture-core.js).

window.__kiokuStart({
  platform: "chatgpt",

  selectors: {
    message: "[data-message-author-role]",
    roleAttr: "data-message-author-role",
    generating: '[data-testid="stop-button"]',
  },

  getId() {
    const m = location.pathname.match(/\/c\/([0-9a-f-]{8,})/i);
    return m ? m[1] : null;
  },

  getTitle() {
    return document.title.replace(/\s*[-–—|]\s*ChatGPT\s*$/i, "").trim();
  },

  scrape() {
    const s = this.selectors;
    if (document.querySelector(s.generating)) return [];
    const nodes = document.querySelectorAll(s.message);
    const messages = [];
    for (const el of nodes) {
      const role =
        el.getAttribute(s.roleAttr) === "user" ? "user" : "assistant";
      const text = el.innerText.trim();
      if (text) messages.push({ role, text });
    }
    return messages;
  },
});
