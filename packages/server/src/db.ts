import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import initSqlJs, { Database } from 'sql.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const __dirname = dirname(fileURLToPath(import.meta.url));
export const UPLOADS_DIR = join(__dirname, '../../uploads');
const DB_PATH = join(__dirname, '../../theatre.db');

if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });

let _db: Database | null = null;
let _initPromise: Promise<Database> | null = null;

export function getDb(): Promise<Database> {
  if (_db) return Promise.resolve(_db);
  if (_initPromise) return _initPromise;
  _initPromise = _init();
  return _initPromise;
}

async function _init(): Promise<Database> {

  const SQL = await initSqlJs({
    locateFile: (file: string) => join(dirname(require.resolve('sql.js')), file),
  });

  if (existsSync(DB_PATH)) {
    const fileBuffer = readFileSync(DB_PATH);
    _db = new SQL.Database(fileBuffer);
  } else {
    _db = new SQL.Database();
  }

  _db.run(`
    CREATE TABLE IF NOT EXISTS images (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      filename  TEXT NOT NULL,
      original  TEXT NOT NULL,
      mimetype  TEXT NOT NULL,
      size      INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  _db.run(`
    CREATE TABLE IF NOT EXISTS sheets (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      name               TEXT NOT NULL DEFAULT 'New Character',
      character_class    TEXT NOT NULL DEFAULT '',
      race               TEXT NOT NULL DEFAULT '',
      background         TEXT NOT NULL DEFAULT '',
      level              INTEGER NOT NULL DEFAULT 1,
      mig_score          INTEGER NOT NULL DEFAULT 0,
      mig_die            INTEGER NOT NULL DEFAULT 6,
      dex_score          INTEGER NOT NULL DEFAULT 0,
      dex_die            INTEGER NOT NULL DEFAULT 6,
      wil_score          INTEGER NOT NULL DEFAULT 0,
      wil_die            INTEGER NOT NULL DEFAULT 6,
      pre_score          INTEGER NOT NULL DEFAULT 0,
      pre_die            INTEGER NOT NULL DEFAULT 6,
      skill_bonuses      TEXT NOT NULL DEFAULT '{}',
      skill_levels       TEXT NOT NULL DEFAULT '{}',
      save_levels        TEXT NOT NULL DEFAULT '{}',
      hp_current         INTEGER NOT NULL DEFAULT 0,
      hp_max             INTEGER NOT NULL DEFAULT 0,
      mental_current     INTEGER NOT NULL DEFAULT 0,
      mental_max         INTEGER NOT NULL DEFAULT 0,
      grave_current      INTEGER NOT NULL DEFAULT 0,
      grave_max          INTEGER NOT NULL DEFAULT 0,
      ap_current         INTEGER NOT NULL DEFAULT 3,
      reactions_current  INTEGER NOT NULL DEFAULT 3,
      mana_current       INTEGER NOT NULL DEFAULT 0,
      mana_max           INTEGER NOT NULL DEFAULT 0,
      momentum           INTEGER NOT NULL DEFAULT 0,
      conditions         TEXT NOT NULL DEFAULT '[]',
      equipment          TEXT NOT NULL DEFAULT '{}',
      feats              TEXT NOT NULL DEFAULT '',
      attacks            TEXT NOT NULL DEFAULT '[]',
      notes              TEXT NOT NULL DEFAULT '',
      token_image        TEXT DEFAULT NULL,
      created_at         TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Migrations — add columns that may not exist in older DBs
  try { _db.run(`ALTER TABLE sheets ADD COLUMN character_class TEXT DEFAULT ''`); } catch { /* already exists */ }
  try { _db.run(`ALTER TABLE sheets ADD COLUMN skill_levels TEXT DEFAULT '{}'`); } catch { /* already exists */ }
  try { _db.run(`ALTER TABLE sheets ADD COLUMN save_levels TEXT DEFAULT '{}'`); } catch { /* already exists */ }
  try { _db.run(`ALTER TABLE sheets ADD COLUMN token_image TEXT DEFAULT NULL`); } catch { /* already exists */ }

  // chat title (nameplate)
  try { _db.run(`ALTER TABLE chat_messages ADD COLUMN title TEXT DEFAULT NULL`); } catch { /* already exists */ }

  _db.run(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      type       TEXT NOT NULL DEFAULT 'text',
      title      TEXT,
      content    TEXT NOT NULL DEFAULT '',
      result     TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  persist();
  return _db;
}

export function persist() {
  if (!_db) return;
  const data = _db.export();
  writeFileSync(DB_PATH, Buffer.from(data));
}
