// Kioku — portable memory view (dashboard module).

import {
  getMemoryBlocks,
  upsertMemoryBlock,
  deleteMemoryBlock,
} from "../lib/db.js";

const listEl = document.getElementById("memory-list");
const countEl = document.getElementById("count-memory");

// Bump a revision counter so the on-page memory widgets (content scripts)
// know to re-check whether they should be visible.
function notifyWidgets() {
  chrome.storage?.local?.set({ kiokuMemoryRev: Date.now() });
}

function blockForm(block, onDone) {
  const form = document.createElement("div");
  form.className = "block-form";

  const title = document.createElement("input");
  title.placeholder = "Title (e.g. About me, Writing style, Current project)";
  title.value = block?.title || "";

  const text = document.createElement("textarea");
  text.rows = 4;
  text.placeholder =
    "The context itself (e.g. I'm Mohamed, an indie Chrome-extension developer. Answer concisely, code examples in JavaScript.)";
  text.value = block?.text || "";

  const actions = document.createElement("div");
  actions.className = "block-form-actions";

  const cancel = document.createElement("button");
  cancel.className = "ghost-btn";
  cancel.textContent = "Cancel";
  cancel.addEventListener("click", () => onDone(false));

  const save = document.createElement("button");
  save.className = "ghost-btn";
  save.textContent = "Save";
  save.addEventListener("click", async () => {
    if (!text.value.trim()) return;
    await upsertMemoryBlock({
      ...(block || {}),
      title: title.value.trim(),
      text: text.value.trim(),
    });
    notifyWidgets();
    onDone(true);
  });

  actions.append(cancel, save);
  form.append(title, text, actions);
  return form;
}

export async function renderMemory() {
  const blocks = await getMemoryBlocks();
  countEl.textContent = blocks.length || "";
  listEl.innerHTML = "";

  if (!blocks.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent =
      "No memory blocks yet. Create one — it becomes available on every AI chat via the 記 memory button.";
    listEl.append(empty);
    return;
  }

  for (const b of blocks) {
    const card = document.createElement("div");
    card.className = "block" + (b.enabled ? "" : " disabled");

    const top = document.createElement("div");
    top.className = "block-top";

    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.className = "switch";
    toggle.checked = b.enabled;
    toggle.title = "Include this block when inserting";
    toggle.addEventListener("change", async () => {
      await upsertMemoryBlock({ ...b, enabled: toggle.checked });
      notifyWidgets();
      renderMemory();
    });

    const title = document.createElement("span");
    title.className = "block-title";
    title.textContent = b.title || "Untitled block";

    const edit = document.createElement("button");
    edit.className = "ghost-btn";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => {
      card.replaceWith(blockForm(b, () => renderMemory()));
    });

    const del = document.createElement("button");
    del.className = "ghost-btn danger";
    del.textContent = "Delete";
    del.addEventListener("click", async () => {
      if (!confirm("Delete this memory block?")) return;
      await deleteMemoryBlock(b.id);
      notifyWidgets();
      renderMemory();
    });

    top.append(toggle, title, edit, del);

    const text = document.createElement("div");
    text.className = "block-text";
    text.textContent = b.text;

    card.append(top, text);
    listEl.append(card);
  }
}

export function initMemoryView() {
  document.getElementById("new-block").addEventListener("click", () => {
    const existing = listEl.querySelector(".block-form");
    if (existing) return;
    listEl.prepend(blockForm(null, () => renderMemory()));
  });
  renderMemory();
}
