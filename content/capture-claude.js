// Kioku — Claude (claude.ai) capture config.
// User messages:      [data-testid="user-message"]
// Assistant messages: .font-claude-response ; while generating, the ancestor
//                     carries data-is-streaming="true", so those are skipped.

window.__kiokuStart({
  platform: "claude",

  getId() {
    const m = location.pathname.match(/\/chat\/([0-9a-f-]{8,})/i);
    return m ? m[1] : null;
  },

  getTitle() {
    return document.title.replace(/\s*[-–—]\s*Claude\s*$/i, "").trim();
  },

  scrape() {
    const nodes = document.querySelectorAll(
      '[data-testid="user-message"], .font-claude-response'
    );
    const messages = [];
    for (const el of nodes) {
      const isUser = el.matches('[data-testid="user-message"]');
      if (!isUser && el.closest('[data-is-streaming="true"]')) continue;
      const text = el.innerText.trim();
      if (text) messages.push({ role: isUser ? "user" : "assistant", text });
    }
    return messages;
  },
});
