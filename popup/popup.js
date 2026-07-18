// Kioku — popup: quick search entry + archive stats.

const q = document.getElementById("q");
const stat = document.getElementById("stat");

function openDashboard() {
  const url =
    chrome.runtime.getURL("dashboard/dashboard.html") +
    (q.value.trim() ? "?q=" + encodeURIComponent(q.value.trim()) : "");
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

chrome.runtime.sendMessage({ type: "kioku-count" }, (res) => {
  if (chrome.runtime.lastError || !res?.ok) {
    stat.textContent = "Your AI chat archive";
    return;
  }
  stat.textContent = res.count
    ? `${res.count} conversation${res.count === 1 ? "" : "s"} archived`
    : "Your AI chat archive";
});
