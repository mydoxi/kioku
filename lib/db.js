// Kioku — IndexedDB layer. Used by the service worker (writes) and by
// extension pages (reads) — both run on the extension origin, so they share
// the same database.

const DB_NAME = "kioku";
const DB_VERSION = 2;
const STORE = "conversations";
const FOLDERS = "folders";

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
      if (!db.objectStoreNames.contains(FOLDERS)) {
        db.createObjectStore(FOLDERS, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, mode, store = STORE) {
  return db.transaction(store, mode).objectStore(store);
}

export async function upsertConversation(convo) {
  const db = await openDb();
  // A fresh capture must never erase workspace data the user attached to the
  // conversation (folder assignment now; tags/notes later).
  const existing = await new Promise((resolve) => {
    const req = tx(db, "readonly").get(convo.key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });
  if (existing && convo.folderId === undefined) {
    convo.folderId = existing.folderId;
  }
  return new Promise((resolve, reject) => {
    const req = tx(db, "readwrite").put(convo);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

// ---- folders ----

export async function getFolders() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = tx(db, "readonly", FOLDERS).getAll();
    req.onsuccess = () => {
      const rows = req.result || [];
      rows.sort((a, b) => a.name.localeCompare(b.name));
      resolve(rows);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function createFolder(name) {
  const db = await openDb();
  const folder = {
    id: "f" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    name: name.trim(),
    createdAt: Date.now(),
  };
  return new Promise((resolve, reject) => {
    const req = tx(db, "readwrite", FOLDERS).put(folder);
    req.onsuccess = () => resolve(folder);
    req.onerror = () => reject(req.error);
  });
}

export async function renameFolder(id, name) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const store = tx(db, "readwrite", FOLDERS);
    const get = store.get(id);
    get.onsuccess = () => {
      const folder = get.result;
      if (!folder) return resolve(false);
      folder.name = name.trim();
      const put = store.put(folder);
      put.onsuccess = () => resolve(true);
      put.onerror = () => reject(put.error);
    };
    get.onerror = () => reject(get.error);
  });
}

export async function deleteFolder(id) {
  // Unfile every conversation in the folder, then remove the folder itself.
  // Must go through setConversationFolder — upsertConversation deliberately
  // restores a missing folderId from the stored record, which would undo this.
  const all = await getAllConversations();
  for (const c of all) {
    if (c.folderId === id) {
      await setConversationFolder(c.key, null);
    }
  }
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = tx(db, "readwrite", FOLDERS).delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

export async function setConversationFolder(key, folderId) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const store = tx(db, "readwrite");
    const get = store.get(key);
    get.onsuccess = () => {
      const convo = get.result;
      if (!convo) return resolve(false);
      convo.folderId = folderId || undefined;
      const put = store.put(convo);
      put.onsuccess = () => resolve(true);
      put.onerror = () => reject(put.error);
    };
    get.onerror = () => reject(get.error);
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
