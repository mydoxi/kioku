// Kioku — IndexedDB layer. Used by the service worker (writes) and by
// extension pages (reads) — both run on the extension origin, so they share
// the same database.

const DB_NAME = "kioku";
const DB_VERSION = 1;
const STORE = "conversations";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "key" });
        store.createIndex("updatedAt", "updatedAt");
        store.createIndex("platform", "platform");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, mode) {
  return db.transaction(STORE, mode).objectStore(STORE);
}

export async function upsertConversation(convo) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = tx(db, "readwrite").put(convo);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

export async function getConversation(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = tx(db, "readonly").get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllConversations() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = tx(db, "readonly").getAll();
    req.onsuccess = () => {
      const rows = req.result || [];
      rows.sort((a, b) => b.updatedAt - a.updatedAt);
      resolve(rows);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteConversation(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = tx(db, "readwrite").delete(key);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

export async function countConversations() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = tx(db, "readonly").count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// MVP search: case-insensitive substring scan over title + message text.
// Returns conversations with a snippet around the first hit.
export async function searchConversations(query) {
  const q = query.trim().toLowerCase();
  const all = await getAllConversations();
  if (!q) return all.map((c) => ({ convo: c, snippet: null }));

  const results = [];
  for (const c of all) {
    let snippet = null;
    if (c.title && c.title.toLowerCase().includes(q)) {
      snippet = c.title;
    } else {
      for (const m of c.messages) {
        const idx = m.text.toLowerCase().indexOf(q);
        if (idx !== -1) {
          const start = Math.max(0, idx - 60);
          snippet =
            (start > 0 ? "…" : "") +
            m.text.slice(start, idx + q.length + 90) +
            (idx + q.length + 90 < m.text.length ? "…" : "");
          break;
        }
      }
    }
    if (snippet !== null) results.push({ convo: c, snippet });
  }
  return results;
}
