// Kioku — Gemini (gemini.google.com) capture config.
// Gemini renders each turn with Angular custom elements:
//   <user-query>      the user's message
//   <model-response>  the assistant's reply
// These tag names are the most stable hook available on Gemini.

window.__kiokuStart({
  platform: "gemini",

  getId() {
    const m = location.pathname.match(/\/app\/([0-9a-f]{6,})/i);
    return m ? m[1] : null;
  },

  getTitle() {
    const t = document.title.replace(/\s*[-–—|]\s*Gemini.*$/i, "").trim();
    if (t && t.toLowerCase() !== "gemini") return t;
    // Gemini often keeps the title as just "Gemini" — fall back to the
    // first user message.
    const first = document.querySelector("user-query");
    return first ? first.innerText.trim().slice(0, 60) : "Gemini chat";
  },

  scrape() {
    const nodes = document.querySelectorAll("user-query, model-response");
    const messages = [];
    for (const el of nodes) {
      const role = el.tagName === "USER-QUERY" ? "user" : "assistant";
      const text = el.innerText.trim();
      if (text) messages.push({ role, text });
    }
    return messages;
  },
});
