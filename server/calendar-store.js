import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { fetchCalendar as fetchRemoteCalendar } from "./musicasparamissa.js";
import { isDbEnabled, loadCalendarFromDb, saveCalendarToDb } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
export const CALENDAR_PATH = path.join(ROOT, "data", "mpm-calendar.json");
export const CALENDAR_PUBLIC_PATH = path.join(ROOT, "public", "data", "mpm-calendar.json");

export function emptyStore() {
  return {
    version: 1,
    updatedAt: null,
    lastSyncAt: null,
    entries: {},
  };
}

export function loadCalendarStoreFromFiles() {
  for (const filePath of [CALENDAR_PATH, CALENDAR_PUBLIC_PATH]) {
    try {
      if (!fs.existsSync(filePath)) continue;
      const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
      if (raw?.entries && typeof raw.entries === "object") return raw;
      if (typeof raw === "object" && !raw.entries) {
        return {
          version: 1,
          updatedAt: null,
          lastSyncAt: null,
          entries: raw,
        };
      }
    } catch {}
  }
  return emptyStore();
}

export async function loadCalendarStore() {
  if (isDbEnabled()) {
    const fromDb = await loadCalendarFromDb();
    if (fromDb && Object.keys(fromDb.entries).length) return fromDb;
  }
  return loadCalendarStoreFromFiles();
}

function saveCalendarStoreToFiles(store) {
  const payload = {
    version: 1,
    updatedAt: new Date().toISOString(),
    lastSyncAt: store.lastSyncAt ?? new Date().toISOString(),
    entries: store.entries,
  };
  fs.mkdirSync(path.dirname(CALENDAR_PATH), { recursive: true });
  fs.mkdirSync(path.dirname(CALENDAR_PUBLIC_PATH), { recursive: true });
  const text = JSON.stringify(payload, null, 2);
  fs.writeFileSync(CALENDAR_PATH, text, "utf8");
  fs.writeFileSync(CALENDAR_PUBLIC_PATH, text, "utf8");
  return payload;
}

export async function saveCalendarStore(store) {
  const payload = {
    version: 1,
    updatedAt: new Date().toISOString(),
    lastSyncAt: store.lastSyncAt ?? new Date().toISOString(),
    entries: store.entries,
  };

  if (isDbEnabled()) {
    await saveCalendarToDb(payload);
  }
  return saveCalendarStoreToFiles(payload);
}

/** Mescla remoto no acervo local — nunca remove datas antigas */
export function mergeCalendarEntries(localEntries, remoteEntries) {
  const merged = { ...localEntries };
  const now = new Date().toISOString();
  for (const [date, info] of Object.entries(remoteEntries || {})) {
    merged[date] = {
      ...merged[date],
      ...info,
      title: info.title ?? merged[date]?.title,
      url: info.url ?? merged[date]?.url,
      destaque: info.destaque ?? merged[date]?.destaque,
      syncedAt: now,
    };
  }
  return merged;
}

export function storeToCalendarMap(store) {
  const entries = store?.entries ?? store ?? {};
  const map = {};
  for (const [date, info] of Object.entries(entries)) {
    map[date] = {
      title: info.title,
      url: info.url,
      destaque: !!info.destaque,
    };
  }
  return map;
}

export async function syncCalendarStore() {
  const store = await loadCalendarStore();
  const remote = await fetchRemoteCalendar();
  const before = Object.keys(store.entries).length;
  store.entries = mergeCalendarEntries(store.entries, remote);
  store.lastSyncAt = new Date().toISOString();
  const saved = await saveCalendarStore(store);
  const added = Object.keys(saved.entries).length - before;
  return {
    total: Object.keys(saved.entries).length,
    remoteCount: Object.keys(remote).length,
    added,
    lastSyncAt: saved.lastSyncAt,
  };
}

export async function getMergedCalendar() {
  const store = await loadCalendarStore();
  let map = storeToCalendarMap(store);

  try {
    const remote = await fetchRemoteCalendar();
    const merged = mergeCalendarEntries(store.entries, remote);
    if (Object.keys(remote).length) {
      store.entries = merged;
      await saveCalendarStore(store);
    }
    map = storeToCalendarMap({ entries: merged });
  } catch {}

  return {
    calendar: map,
    meta: {
      total: Object.keys(map).length,
      lastSyncAt: store.lastSyncAt,
      updatedAt: store.updatedAt,
    },
  };
}
