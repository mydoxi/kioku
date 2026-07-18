// Kioku — dashboard. Reads the shared IndexedDB directly (same extension
// origin as the service worker).

import {
  getAllConversations,
  searchConversations,
  getConversation,
  deleteConversation,
  getFolders,
  createFolder,
  renameFolder,
  deleteFolder,
  setConversationFolder,
} from "../lib/db.js";
import {
  conversationToMarkdown,
  conversationsToMarkdown,
  conversationsToJson,
  safeFilename,
  download,
} from "../lib/export.js";
import { initMemoryView } from "./memory.js";

const listEl = document.getElementById("list");
const viewerEl = document.getElementById("viewer");
const messagesEl = document.getElementById("messages");
const searchEl = document.getElementById("search");
const viewerTitle = document.getElementById("viewer-title");
const openOriginal = document.getElementById("open-original");

let platformFilter = "all";
let folderFilter = null; // null = all, "unfiled", or a folder id
let currentKey = null;
let results = [];
let folders = [];
let view = "list"; // "list" | "memory"

const PLATFORM_LABEL = { claude: "Claude", chatgpt: "ChatGPT", gemini: "Gemini" };

const memoryViewEl = document.getElementById("memory-view");
const toolbarEl = document.getElementById("toolbar");

function setView(v) {
  view = v;
  closeViewer();
  memoryViewEl.classList.toggle("hidden", v !== "memory");
  listEl.classList.toggle("hidden", v !== "list");
  toolbarEl.classList.toggle("hidden", v !== "list");
  document
    .getElementById("nav-memory")
    .classList.toggle("active", v === "memory");
  if (v === "list") renderList();
}

function fmtDate(ts) {
  const d = new Date(ts);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function highlight(text, q) {
  const frag = document.createDocumentFragment();
  if (!q) {
    frag.append(text);
    return frag;
  }
  const lower = text.toLowerCase();
  const ql = q.toLowerCase();
  let pos = 0;
  let idx;
  while ((idx = lower.indexOf(ql, pos)) !== -1) {
    frag.append(text.slice(pos, idx));
    const mark = document.createElement("mark");
    mark.textContent = text.slice(idx, idx + q.length);
    frag.append(mark);
    pos = idx + q.length;
  }
  frag.append(text.slice(pos));
  return frag;
}

async function refreshCounts() {
  const all = await getAllConversations();
  const counts = { all: all.length, claude: 0, chatgpt: 0, gemini: 0 };
  for (const c of all) counts[c.platform] = (counts[c.platform] || 0) + 1;
  for (const k of ["all", "claude", "chatgpt", "gemini"]) {
    const el = document.getElementById("count-" + k);
    if (el) el.textContent = counts[k] || 0;
  }
}

async function renderFolders() {
  folders = await getFolders();
  const nav = document.getElementById("folders");
  nav.innerHTML = "";

  for (const f of folders) {
    const row = document.createElement("div");
    row.className = "folder-row";

    const btn = document.createElement("button");
    btn.className = "filter" + (folderFilter === f.id ? " active" : "");
    const name = document.createElement("span");
    name.className = "name";
    name.textContent = "📁 " + f.name;
    btn.append(name);
    btn.addEventListener("click", () => {
      folderFilter = folderFilter === f.id ? null : f.id;
      renderFolders();
      setView("list");
    });

    const tools = document.createElement("div");
    tools.className = "folder-tools";

    const rename = document.createElement("button");
    rename.className = "icon-btn";
    rename.title = "Rename";
    rename.textContent = "✎";
    rename.addEventListener("click", async (e) => {
      e.stopPropagation();
      const newName = prompt("Rename folder:", f.name);
      if (newName?.trim()) {
        await renameFolder(f.id, newName);
        renderFolders();
        renderList();
      }
    });

    const del = document.createElement("button");
    del.className = "icon-btn";
    del.title = "Delete folder (chats are kept)";
    del.textContent = "✕";
    del.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!confirm(`Delete folder "${f.name}"? Conversations inside are kept.`)) return;
      await deleteFolder(f.id);
      if (folderFilter === f.id) folderFilter = null;
      renderFolders();
      renderList();
    });

    tools.append(rename, del);
    row.append(btn, tools);
    nav.append(row);
  }
}

async function renderList() {
  const q = searchEl.value.trim();
  results = await searchConversations(q);
  if (platformFilter !== "all") {
    results = results.filter((r) => r.convo.platform === platformFilter);
  }
  if (folderFilter) {
    results = results.filter((r) =>
      folderFilter === "unfiled"
        ? !r.convo.folderId
        : r.convo.folderId === folderFilter
    );
  }

  toolbarEl.classList.toggle("hidden", view !== "list" || !results.length);
  document.getElementById("toolbar-count").textContent =
    results.length + " conversation" + (results.length === 1 ? "" : "s") + " in view";

  listEl.innerHTML = "";
  if (!results.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = q
      ? "No conversations match your search."
      : "No conversations archived yet. Open claude.ai or chatgpt.com and chat — Kioku archives automatically.";
    listEl.append(empty);
    return;
  }

  for (const { convo, snippet } of results) {
    const card = document.createElement("div");
    card.className = "card";

    const top = document.createElement("div");
    top.className = "card-top";

    const badge = document.createElement("span");
    badge.className = "badge " + convo.platform;
    badge.textContent = PLATFORM_LABEL[convo.platform] || convo.platform;

    const title = document.createElement("span");
    title.className = "card-title";
    title.textContent = convo.title;

    const date = document.createElement("span");
    date.className = "card-date";
    date.textContent =
      fmtDate(convo.updatedAt) + " · " + convo.messages.length + " msgs";

    top.append(badge, title);
    const folder = folders.find((f) => f.id === convo.folderId);
    if (folder) {
      const chip = document.createElement("span");
      chip.className = "folder-chip";
      chip.textContent = folder.name;
      top.append(chip);
    }
    top.append(date);
    card.append(top);

    const snip = document.createElement("div");
    snip.className = "card-snippet";
    const snippetText =
      snippet && snippet !== convo.title
        ? snippet
        : (convo.messages[0]?.text || "").slice(0, 180);
    snip.append(highlight(snippetText, q));
    card.append(snip);

    card.addEventListener("click", () => openViewer(convo.key));
    listEl.append(card);
  }
}

async function openViewer(key) {
  const convo = await getConversation(key);
  if (!convo) return;
  currentKey = key;

  viewerTitle.textContent = convo.title;
  openOriginal.href = convo.url;

  const sel = document.getElementById("folder-select");
  sel.innerHTML = "";
  const none = document.createElement("option");
  none.value = "";
  none.textContent = "No folder";
  sel.append(none);
  for (const f of folders) {
    const opt = document.createElement("option");
    opt.value = f.id;
    opt.textContent = "📁 " + f.name;
    sel.append(opt);
  }
  sel.value = convo.folderId || "";

  messagesEl.innerHTML = "";

  for (const m of convo.messages) {
    const div = document.createElement("div");
    div.className = "msg " + m.role;
    const role = document.createElement("div");
    role.className = "msg-role";
    role.textContent =
      m.role === "user" ? "You" : PLATFORM_LABEL[convo.platform] || "Assistant";
    div.append(role, document.createTextNode(m.text));
    messagesEl.append(div);
  }

  listEl.classList.add("hidden");
  toolbarEl.classList.add("hidden");
  viewerEl.classList.remove("hidden");
}

function closeViewer() {
  currentKey = null;
  viewerEl.classList.add("hidden");
  if (view === "list") {
    listEl.classList.remove("hidden");
    toolbarEl.classList.toggle("hidden", !results.length);
  }
}

document.getElementById("back").addEventListener("click", closeViewer);

document.getElementById("new-folder").addEventListener("click", async () => {
  const name = prompt("New folder name:");
  if (name?.trim()) {
    await createFolder(name);
    renderFolders();
  }
});

document.getElementById("folder-select").addEventListener("change", async (e) => {
  if (!currentKey) return;
  await setConversationFolder(currentKey, e.target.value || null);
  renderList();
});

document.getElementById("export-md").addEventListener("click", async () => {
  if (!currentKey) return;
  const convo = await getConversation(currentKey);
  download(
    conversationToMarkdown(convo),
    safeFilename(convo.title, ".md"),
    "text/markdown"
  );
});

document.getElementById("export-view-md").addEventListener("click", () => {
  if (!results.length) return;
  download(
    conversationsToMarkdown(results.map((r) => r.convo)),
    safeFilename("kioku-export-" + new Date().toISOString().slice(0, 10), ".md"),
    "text/markdown"
  );
});

document.getElementById("export-view-json").addEventListener("click", () => {
  if (!results.length) return;
  download(
    conversationsToJson(results.map((r) => r.convo)),
    safeFilename("kioku-export-" + new Date().toISOString().slice(0, 10), ".json"),
    "application/json"
  );
});

document.getElementById("nav-memory").addEventListener("click", () => {
  setView(view === "memory" ? "list" : "memory");
});

document.getElementById("delete").addEventListener("click", async () => {
  if (!currentKey) return;
  if (!confirm("Delete this conversation from your local archive?")) return;
  await deleteConversation(currentKey);
  closeViewer();
  await refreshCounts();
  await renderList();
});

for (const btn of document.querySelectorAll(".filter[data-platform]")) {
  btn.addEventListener("click", () => {
    platformFilter = btn.dataset.platform;
    document
      .querySelectorAll(".filter[data-platform]")
      .forEach((b) => b.classList.toggle("active", b === btn));
    setView("list");
  });
}

let searchTimer = null;
searchEl.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => setView("list"), 150);
});

const params = new URLSearchParams(location.search);
if (params.get("q")) searchEl.value = params.get("q");

refreshCounts();
renderFolders().then(renderList);
initMemoryView();
