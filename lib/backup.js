// Kioku — full backup & restore. The "your data is yours" promise made
// concrete: one JSON file containing everything, importable on any machine.

import {
  getAllConversations,
  upsertConversation,
  getFolders,
  _putFolderRaw,
  getMemoryBlocks,
  upsertMemoryBlock,
} from "./db.js";

export const BACKUP_FORMAT = "kioku-backup";
export const BACKUP_VERSION = 1;

export async function exportAll() {
  const [conversations, folders, memory] = await Promise.all([
    getAllConversations(),
    getFolders(),
    getMemoryBlocks(),
  ]);
  return JSON.stringify(
    {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      folders,
      memory,
      conversations,
    },
    null,
    2
  );
}

// Merge-import: existing items win on conflict for folders/memory (matched by
// id); conversations are upserted by key with the NEWER updatedAt winning.
export async function importAll(json) {
  let data;
  try {
    data = typeof json === "string" ? JSON.parse(json) : json;
  } catch {
    throw new Error("Not a valid JSON file.");
  }
  if (data?.format !== BACKUP_FORMAT || !Array.isArray(data.conversations)) {
    throw new Error("Not a Kioku backup file.");
  }

  const counts = { conversations: 0, folders: 0, memory: 0, skipped: 0 };

  const existingFolders = new Set((await getFolders()).map((f) => f.id));
  // Map old folder ids to themselves (same id kept) so conversation
  // assignments stay valid after import.
  for (const f of data.folders || []) {
    if (!f?.id || !f?.name) continue;
    if (existingFolders.has(f.id)) {
      counts.skipped++;
      continue;
    }
    await _putFolderRaw(f);
    counts.folders++;
  }

  const existingMemory = new Set((await getMemoryBlocks()).map((m) => m.id));
  for (const m of data.memory || []) {
    if (!m?.id || !m?.text) continue;
    if (existingMemory.has(m.id)) {
      counts.skipped++;
      continue;
    }
    await upsertMemoryBlock(m);
    counts.memory++;
  }

  const existing = new Map(
    (await getAllConversations()).map((c) => [c.key, c.updatedAt])
  );
  for (const c of data.conversations) {
    if (!c?.key || !Array.isArray(c.messages)) continue;
    const current = existing.get(c.key);
    if (current !== undefined && current >= c.updatedAt) {
      counts.skipped++;
      continue;
    }
    await upsertConversation(c);
    counts.conversations++;
  }

  return counts;
}
