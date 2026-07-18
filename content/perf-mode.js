// Kioku — performance mode.
// Long AI chats accumulate thousands of DOM nodes and get laggy. This applies
// the browser's native virtualization (content-visibility: auto) to message
// rows: off-screen messages skip layout/paint entirely, while scroll position
// and find-in-page still work. Pure CSS — no DOM mutation, fully reversible.

(() => {
  if (window.__kiokuPerf) return;
  window.__kiokuPerf = true;

  const STYLE_ID = "kioku-perf-style";

  const SELECTORS = [
    "div[data-test-render-count]", // Claude message rows
    "main article", // ChatGPT conversation turns
    "user-query, model-response", // Gemini turns
  ].join(", ");

  const CSS =
    SELECTORS +
    " { content-visibility: auto; contain-intrinsic-size: auto 320px; }";

  const apply = (enabled) => {
    let style = document.getElementById(STYLE_ID);
    if (enabled) {
      if (!style) {
        style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = CSS;
        (document.head || document.documentElement).append(style);
      }
    } else if (style) {
      style.remove();
    }
  };

  // Default ON — it's one of Kioku's selling points. Users can turn it off
  // in the extension popup.
  chrome.storage.sync.get({ kiokuPerfMode: true }, (data) =>
    apply(data.kiokuPerfMode)
  );

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes.kiokuPerfMode) {
      apply(changes.kiokuPerfMode.newValue);
    }
  });
})();
