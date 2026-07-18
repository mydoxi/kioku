// Kioku — Gemini (gemini.google.com) capture config.
// Selectors are data, overridable by the remote hotfix (see capture-core.js).

window.__kiokuStart({
  platform: "gemini",

  selectors: {
    user: "user-query",
    assistant: "model-response",
  },

  getId() {
    const m = location.pathname.match(/\/app\/([0-9a-f]{6,})/i);
    return m ? m[1] : null;
  },

  getTitle() {
    const t = document.title.replace(/\s*[-–—|]\s*Gemini.*$/i, "").trim();
    if (t && t.toLowerCase() !== "gemini") return t;
    const first = document.querySelector(this.selectors.user);
    return first ? first.innerText.trim().slice(0, 60) : "Gemini chat";
  },

  scrape() {
    const s = this.selectors;
    const nodes = document.querySelectorAll(s.user + ", " + s.assistant);
    const messages = [];
    for (const el of nodes) {
      const role = el.matches(s.user) ? "user" : "assistant";
      const text = el.innerText.trim();
      if (text) messages.push({ role, text });
    }
    return messages;
  },
});
