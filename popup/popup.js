// Kioku — popup: quick search, recent chats, perf toggle.
// Runs on the extension origin, so it reads the shared IndexedDB directly.

import { getAllConversations, countConversations } from "../lib/db.js";

const q = document.getElementById("q");
const stat = document.getElementById("stat");
const recentEl = document.getElementById("recent");

const PLATFORM_LABEL = { claude: "Claude", chatgpt: "ChatGPT", gemini: "Gemini" };

function dashboardUrl(extra = "") {
  return chrome.runtime.getURL("dashboard/dashboard.html") + extra;
}

function openDashboard() {
  const url = dashboardUrl(
    q.value.trim() ? "?q=" + encodeURIComponent(q.value.trim()) : ""
  );
  chrome.tabs.create({ url });
}

document.getElementById("open").addEventListener("click", openDashboard);
q.addEventListener("keydown", (e) => {
  if (e.key === "Enter") openDashboard();
});

const perf = document.getElementById("perf");
chrome.storage.sync.get({ kiokuPerfMode: true }, (d) => {
  perf.checked = d.kiokuPerfMode;
});
perf.addEventListener("change", () => {
  chrome.storage.sync.set({ kiokuPerfMode: perf.checked });
});

async function init() {
  const count = await countConversations().catch(() => 0);
  stat.textContent = count
    ? `${count} conversation${count === 1 ? "" : "s"} archived`
    : "Your AI chat archive";

  const recent = (await getAllConversations().catch(() => [])).slice(0, 5);
  recentEl.innerHTML = "";
  for (const c of recent) {
    const row = document.createElement("button");
    row.className = "recent-row";

    const badge = document.createElement("span");
    badge.className = "mini-badge " + c.platform;
    badge.textContent = (PLATFORM_LABEL[c.platform] || c.platform)[0];

    const title = document.createElement("span");
    title.className = "recent-title";
    title.textContent = c.title;

    row.append(badge, title);
    row.title = c.title;
    row.addEventListener("click", () => {
      chrome.tabs.create({
        url: dashboardUrl("?open=" + encodeURIComponent(c.key)),
      });
    });
    recentEl.append(row);
  }
}

init();
