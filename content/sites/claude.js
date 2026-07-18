// Kioku — Claude (claude.ai) capture config.
// Selectors are data, overridable by the remote hotfix (see capture-core.js).

window.__kiokuStart({
  platform: "claude",

  selectors: {
    user: '[data-testid="user-message"]',
    assistant: ".font-claude-response",
    streaming: '[data-is-streaming="true"]',
  },

  getId() {
    const m = location.pathname.match(/\/chat\/([0-9a-f-]{8,})/i);
    return m ? m[1] : null;
  },

  getTitle() {
    return document.title.replace(/\s*[-–—]\s*Claude\s*$/i, "").trim();
  },

  scrape() {
    const s = this.selectors;
    const nodes = document.querySelectorAll(s.user + ", " + s.assistant);
    const messages = [];
    for (const el of nodes) {
      const isUser = el.matches(s.user);
      if (!isUser && el.closest(s.streaming)) continue;
      const text = el.innerText.trim();
      if (text) messages.push({ role: isUser ? "user" : "assistant", text });
    }
    return messages;
  },
});
