import pg from "pg";

const { Pool } = pg;

let pool = null;

export function isDbEnabled() {
  return Boolean(process.env.DATABASE_URL);
}

export function getPool() {
  if (!isDbEnabled()) return null;
  if (!pool) {
    const ssl =
      process.env.PGSSL === "false"
        ? false
        : process.env.NODE_ENV === "production" || process.env.DATABASE_URL?.includes("railway")
          ? { rejectUnauthorized: false }
          : undefined;
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl,
      max: 10,
    });
  }
  return pool;
}

export function workspaceId() {
  return process.env.WORKSPACE_ID || "default";
}

export async function initDb() {
  const db = getPool();
  if (!db) {
    console.warn("[db] DATABASE_URL não definida — APIs de storage indisponíveis");
    return false;
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS app_data (
      workspace_id TEXT NOT NULL DEFAULT 'default',
      data_key TEXT NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (workspace_id, data_key)
    );

    CREATE TABLE IF NOT EXISTS mpm_calendar (
      miss_date TEXT PRIMARY KEY,
      title TEXT,
      url TEXT,
      destaque BOOLEAN NOT NULL DEFAULT FALSE,
      synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS mpm_calendar_meta (
      id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      last_sync_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ
    );

    INSERT INTO mpm_calendar_meta (id) VALUES (1) ON CONFLICT DO NOTHING;
  `);

  console.log("[db] PostgreSQL pronto");
  return true;
}

export async function getAppData(key) {
  const db = getPool();
  if (!db) return null;
  const { rows } = await db.query(
    `SELECT payload FROM app_data WHERE workspace_id = $1 AND data_key = $2`,
    [workspaceId(), key]
  );
  return rows[0]?.payload ?? null;
}

export async function setAppData(key, payload) {
  const db = getPool();
  if (!db) throw new Error("Database unavailable");
  await db.query(
    `INSERT INTO app_data (workspace_id, data_key, payload, updated_at)
     VALUES ($1, $2, $3::jsonb, NOW())
     ON CONFLICT (workspace_id, data_key)
     DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
    [workspaceId(), key, JSON.stringify(payload)]
  );
}

export async function loadCalendarFromDb() {
  const db = getPool();
  if (!db) return null;
  const { rows } = await db.query(`SELECT miss_date, title, url, destaque FROM mpm_calendar`);
  const entries = {};
  for (const r of rows) {
    entries[r.miss_date] = {
      title: r.title,
      url: r.url,
      destaque: r.destaque,
    };
  }
  const meta = await db.query(`SELECT last_sync_at, updated_at FROM mpm_calendar_meta WHERE id = 1`);
  return {
    version: 1,
    updatedAt: meta.rows[0]?.updated_at?.toISOString?.() ?? null,
    lastSyncAt: meta.rows[0]?.last_sync_at?.toISOString?.() ?? null,
    entries,
  };
}

export async function saveCalendarToDb(store) {
  const db = getPool();
  if (!db) return false;
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    for (const [date, info] of Object.entries(store.entries || {})) {
      await client.query(
        `INSERT INTO mpm_calendar (miss_date, title, url, destaque, synced_at)
         VALUES ($1, $2, $3, $4, COALESCE($5::timestamptz, NOW()))
         ON CONFLICT (miss_date) DO UPDATE SET
           title = COALESCE(EXCLUDED.title, mpm_calendar.title),
           url = COALESCE(EXCLUDED.url, mpm_calendar.url),
           destaque = EXCLUDED.destaque,
           synced_at = EXCLUDED.synced_at`,
        [date, info.title ?? null, info.url ?? null, !!info.destaque, info.syncedAt ?? null]
      );
    }
    await client.query(
      `UPDATE mpm_calendar_meta SET last_sync_at = $1, updated_at = NOW() WHERE id = 1`,
      [store.lastSyncAt ?? new Date().toISOString()]
    );
    await client.query("COMMIT");
    return true;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function importCalendarFileToDbIfEmpty() {
  if (!isDbEnabled()) return;
  const existing = await loadCalendarFromDb();
  if (Object.keys(existing?.entries ?? {}).length > 0) return;

  const { loadCalendarStoreFromFiles } = await import("./calendar-store.js");
  const store = loadCalendarStoreFromFiles();
  if (!Object.keys(store.entries).length) return;

  await saveCalendarToDb({
    lastSyncAt: store.lastSyncAt,
    entries: store.entries,
  });
  console.log(`[db] Calendário MPM importado do arquivo (${Object.keys(store.entries).length} datas)`);
}
