import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, "../data");
const dbPath = path.resolve(dataDir, "moneyflow.db");

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

const schemaSql = `
CREATE TABLE IF NOT EXISTS account_snapshot (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  initial_balance_yuan REAL NOT NULL,
  current_balance_yuan REAL NOT NULL,
  timezone TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cashflow_event (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL DEFAULT '',
  event_kind TEXT NOT NULL CHECK(event_kind IN ('one_time', 'recurring')),
  direction TEXT NOT NULL CHECK(direction IN ('inflow', 'outflow')),
  amount_yuan REAL NOT NULL CHECK(amount_yuan > 0),
  effective_at TEXT NOT NULL,
  recurrence_unit TEXT CHECK(recurrence_unit IN ('day', 'week', 'month')),
  recurrence_interval INTEGER,
  daily_start_time TEXT NOT NULL DEFAULT '00:01',
  daily_end_time TEXT NOT NULL DEFAULT '24:00',
  status TEXT NOT NULL CHECK(status IN ('active', 'paused', 'deleted')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cashflow_status_effective_at
ON cashflow_event(status, effective_at);

CREATE INDEX IF NOT EXISTS idx_cashflow_kind_status
ON cashflow_event(event_kind, status);
`;

function getColumns(db, table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().map((row) => row.name);
}

function addColumnIfMissing(db, table, columnName, alterSql) {
  const cols = getColumns(db, table);
  if (cols.includes(columnName)) return;
  try {
    db.exec(alterSql);
  } catch (error) {
    if (!String(error.message).includes(`duplicate column name: ${columnName}`)) {
      throw error;
    }
  }
}

function migrateFromCentsToYuan(db) {
  const snapshotCols = getColumns(db, "account_snapshot");
  const hasLegacySnapshot =
    snapshotCols.includes("initial_balance_cents") || snapshotCols.includes("current_balance_cents");
  if (hasLegacySnapshot) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS account_snapshot_new (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        initial_balance_yuan REAL NOT NULL,
        current_balance_yuan REAL NOT NULL,
        timezone TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      INSERT INTO account_snapshot_new (id, initial_balance_yuan, current_balance_yuan, timezone, updated_at)
      SELECT
        id,
        COALESCE(initial_balance_yuan, initial_balance_cents / 100.0, 0),
        COALESCE(current_balance_yuan, current_balance_cents / 100.0, 0),
        timezone,
        updated_at
      FROM account_snapshot;
      DROP TABLE account_snapshot;
      ALTER TABLE account_snapshot_new RENAME TO account_snapshot;
    `);
  }

  const eventCols = getColumns(db, "cashflow_event");
  addColumnIfMissing(
    db,
    "cashflow_event",
    "daily_start_time",
    "ALTER TABLE cashflow_event ADD COLUMN daily_start_time TEXT NOT NULL DEFAULT '00:01'"
  );
  addColumnIfMissing(
    db,
    "cashflow_event",
    "daily_end_time",
    "ALTER TABLE cashflow_event ADD COLUMN daily_end_time TEXT NOT NULL DEFAULT '24:00'"
  );
  db.exec(
    "UPDATE cashflow_event SET daily_start_time = CASE WHEN daily_start_time IS NULL OR daily_start_time = '' OR daily_start_time = '00:00' THEN '00:01' ELSE daily_start_time END, daily_end_time = COALESCE(NULLIF(daily_end_time, ''), '24:00')"
  );

  if (!eventCols.includes("title")) {
    try {
      db.exec("ALTER TABLE cashflow_event ADD COLUMN title TEXT NOT NULL DEFAULT ''");
    } catch (error) {
      if (!String(error.message).includes("duplicate column name: title")) {
        throw error;
      }
    }
    db.exec("UPDATE cashflow_event SET title = '未命名事件' WHERE title = ''");
  }
  const hasLegacyEvent = eventCols.includes("amount_cents");
  if (hasLegacyEvent) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS cashflow_event_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL DEFAULT '',
        event_kind TEXT NOT NULL CHECK(event_kind IN ('one_time', 'recurring')),
        direction TEXT NOT NULL CHECK(direction IN ('inflow', 'outflow')),
        amount_yuan REAL NOT NULL CHECK(amount_yuan > 0),
        effective_at TEXT NOT NULL,
        recurrence_unit TEXT CHECK(recurrence_unit IN ('day', 'week', 'month')),
        recurrence_interval INTEGER,
        daily_start_time TEXT NOT NULL DEFAULT '00:01',
        daily_end_time TEXT NOT NULL DEFAULT '24:00',
        status TEXT NOT NULL CHECK(status IN ('active', 'paused', 'deleted')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      INSERT INTO cashflow_event_new (
        id, title, event_kind, direction, amount_yuan, effective_at, recurrence_unit, recurrence_interval, daily_start_time, daily_end_time, status, created_at, updated_at
      )
      SELECT
        id,
        COALESCE(NULLIF(title, ''), '未命名事件'),
        event_kind,
        direction,
        COALESCE(amount_yuan, amount_cents / 100.0, 0.01),
        effective_at,
        recurrence_unit,
        recurrence_interval,
        '00:01',
        '24:00',
        status,
        created_at,
        updated_at
      FROM cashflow_event;
      DROP TABLE cashflow_event;
      ALTER TABLE cashflow_event_new RENAME TO cashflow_event;
      CREATE INDEX IF NOT EXISTS idx_cashflow_status_effective_at
      ON cashflow_event(status, effective_at);
      CREATE INDEX IF NOT EXISTS idx_cashflow_kind_status
      ON cashflow_event(event_kind, status);
    `);
  }
}

export function createDb(customPath) {
  const finalPath = customPath ?? dbPath;
  if (!customPath) {
    ensureDataDir();
  }
  const db = new Database(finalPath);
  db.pragma("journal_mode = WAL");
  db.exec(schemaSql);
  migrateFromCentsToYuan(db);
  return db;
}

export const db = createDb();
