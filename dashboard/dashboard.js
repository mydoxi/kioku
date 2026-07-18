// Kioku — dashboard. Reads the shared IndexedDB directly (same extension
// origin as the service worker).

import {
  getAllConversations,
  searchConversations,
  getConversation,
  deleteConversation,
} from "../lib/db.js";

const listEl = document.getElementById("list");
const viewerEl = document.getElementById("viewer");
const messagesEl = document.getElementById("messages");
const searchEl = document.getElementById("search");
const viewerTitle = document.getElementById("viewer-title");
const openOriginal = document.getElementById("open-original");

let platformFilter = "all";
let currentKey = null;
let results = [];

const PLATFORM_LABEL = { claude: "Claude", chatgpt: "ChatGPT" };

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
  const counts = { all: all.length, claude: 0, chatgpt: 0 };
  for (const c of all) counts[c.platform] = (counts[c.platform] || 0) + 1;
  for (const k of ["all", "claude", "chatgpt"]) {
    const el = document.getElementById("count-" + k);
    if (el) el.textContent = counts[k] || 0;
  }
}

async function renderList() {
  const q = searchEl.value.trim();
  results = await searchConversations(q);
  if (platformFilter !== "all") {
    results = results.filter((r) => r.convo.platform === platformFilter);
  }

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

    top.append(badge, title, date);
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
  viewerEl.classList.remove("hidden");
}

function closeViewer() {
  currentKey = null;
  viewerEl.classList.add("hidden");
  listEl.classList.remove("hidden");
}

function toMarkdown(convo) {
  const lines = [
    `# ${convo.title}`,
    "",
    `> Platform: ${PLATFORM_LABEL[convo.platform] || convo.platform} · Archived by Kioku · ${new Date(convo.updatedAt).toLocaleString()}`,
    `> ${convo.url}`,
    "",
  ];
  for (const m of convo.messages) {
    lines.push(`## ${m.role === "user" ? "You" : "Assistant"}`, "", m.text, "");
  }
  return lines.join("\n");
}

document.getElementById("back").addEventListener("click", closeViewer);

document.getElementById("export-md").addEventListener("click", async () => {
  if (!currentKey) return;
  const convo = await getConversation(currentKey);
  const blob = new Blob([toMarkdown(convo)], { type: "text/markdown" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = convo.title.replace(/[\\/:*?"<>|]/g, "_").slice(0, 80) + ".md";
  a.click();
  URL.revokeObjectURL(a.href);
});

document.getElementById("delete").addEventListener("click", async () => {
  if (!currentKey) return;
  if (!confirm("Delete this conversation from your local archive?")) return;
  await deleteConversation(currentKey);
  closeViewer();
  await refreshCounts();
  await renderList();
});

for (const btn of document.querySelectorAll(".filter")) {
  btn.addEventListener("click", () => {
    platformFilter = btn.dataset.platform;
    document
      .querySelectorAll(".filter")
      .forEach((b) => b.classList.toggle("active", b === btn));
    closeViewer();
    renderList();
  });
}

let searchTimer = null;
searchEl.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    closeViewer();
    renderList();
  }, 150);
});

const params = new URLSearchParams(location.search);
if (params.get("q")) searchEl.value = params.get("q");

refreshCounts();
renderList();
