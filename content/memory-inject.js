// Kioku — portable memory widget.
// Shows a small floating button on supported AI chat sites. Clicking it
// fetches the user's enabled memory blocks (from the extension's local DB,
// via the service worker) and inserts them into the chat input — the same
// context on every platform, no retyping.

(() => {
  if (window.__kiokuMemoryWidget) return;
  window.__kiokuMemoryWidget = true;

  const INPUT_SELECTORS = [
    '[data-testid="chat-input"]', // Claude (ProseMirror)
    "#prompt-textarea", // ChatGPT (contenteditable)
    "rich-textarea .ql-editor", // Gemini (Quill)
    'form textarea', // generic fallback
  ];

  const findInput = () => {
    for (const sel of INPUT_SELECTORS) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  };

  const formatBlocks = (blocks) => {
    const lines = ["Context about me (please use it in your answers):"];
    for (const b of blocks) {
      lines.push(`- ${b.title ? b.title + ": " : ""}${b.text}`);
    }
    return lines.join("\n") + "\n\n";
  };

  const insertText = (el, text) => {
    el.focus();
    if (el.tagName === "TEXTAREA") {
      el.value = text + el.value;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    }
    // contenteditable (ProseMirror / Quill / ChatGPT composer)
    return document.execCommand("insertText", false, text);
  };

  const flash = (btn, label) => {
    const old = btn.textContent;
    btn.textContent = label;
    setTimeout(() => (btn.textContent = old), 1600);
  };

  const btn = document.createElement("button");
  btn.id = "kioku-memory-btn";
  btn.type = "button";
  btn.textContent = "記 memory";
  btn.title = "Kioku: insert my saved context into the chat input";
  btn.style.cssText = [
    "position:fixed",
    "right:18px",
    "bottom:96px",
    "z-index:2147483640",
    "padding:7px 12px",
    "border-radius:999px",
    "border:1px solid rgba(139,124,246,.55)",
    "background:rgba(20,18,28,.92)",
    "color:#cfc7ff",
    "font:600 12px system-ui,sans-serif",
    "cursor:pointer",
    "box-shadow:0 4px 18px rgba(0,0,0,.35)",
    "display:none",
  ].join(";");

  btn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "kioku-get-memory" }, (res) => {
      if (chrome.runtime.lastError || !res?.ok) return flash(btn, "⚠ error");
      const blocks = res.blocks || [];
      if (!blocks.length) return flash(btn, "no blocks");
      const input = findInput();
      if (!input) return flash(btn, "no input found");
      insertText(input, formatBlocks(blocks));
      flash(btn, "✓ inserted");
    });
  });

  const mount = () => {
    if (!document.body || document.getElementById("kioku-memory-btn")) return;
    document.body.append(btn);
    // Only show the widget when the user actually has enabled blocks.
    chrome.runtime.sendMessage({ type: "kioku-get-memory" }, (res) => {
      if (chrome.runtime.lastError) return;
      if (res?.ok && res.blocks?.length) btn.style.display = "block";
    });
  };

  mount();
  // Re-check when the dashboard adds/removes blocks in another tab.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.kiokuMemoryRev) {
      chrome.runtime.sendMessage({ type: "kioku-get-memory" }, (res) => {
        if (chrome.runtime.lastError) return;
        btn.style.display = res?.ok && res.blocks?.length ? "block" : "none";
      });
    }
  });
})();
