// Kioku — ChatGPT (chatgpt.com / chat.openai.com) capture config.
// Messages carry the stable attribute data-message-author-role="user|assistant".
// While the reply is generating, a stop button with
// data-testid="stop-button" is present — we skip capture ticks until done.

window.__kiokuStart({
  platform: "chatgpt",

  getId() {
    const m = location.pathname.match(/\/c\/([0-9a-f-]{8,})/i);
    return m ? m[1] : null;
  },

  getTitle() {
    return document.title.replace(/\s*[-–—|]\s*ChatGPT\s*$/i, "").trim();
  },

  scrape() {
    if (document.querySelector('[data-testid="stop-button"]')) return [];
    const nodes = document.querySelectorAll("[data-message-author-role]");
    const messages = [];
    for (const el of nodes) {
      const role =
        el.getAttribute("data-message-author-role") === "user"
          ? "user"
          : "assistant";
      const text = el.innerText.trim();
      if (text) messages.push({ role, text });
    }
    return messages;
  },
});
