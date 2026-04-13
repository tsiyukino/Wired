import Database from 'better-sqlite3';
import config from './config.js';

let _db = null;

export function getDb() {
  if (!_db) {
    _db = new Database(config.dbPath);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
  }
  return _db;
}

export function initSchema() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS threads (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      no      INTEGER UNIQUE NOT NULL,
      time    TEXT NOT NULL,
      name    TEXT NOT NULL DEFAULT 'Anonymous',
      subject TEXT,
      body    TEXT NOT NULL,
      pinned  INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS replies (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      thread_id INTEGER NOT NULL REFERENCES threads(id),
      no        INTEGER UNIQUE NOT NULL,
      time      TEXT NOT NULL,
      name      TEXT NOT NULL DEFAULT 'Anonymous',
      body      TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS lobby_messages (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      time  TEXT NOT NULL,
      name  TEXT NOT NULL DEFAULT 'Anonymous',
      color TEXT NOT NULL,
      text  TEXT NOT NULL
    );

    -- Soft-deleted board content awaiting permanent removal.
    -- kind: 'thread' or 'reply'
    -- deleted_at: ISO timestamp of deletion
    -- expires_at: ISO timestamp after which a sweep will purge this row
    CREATE TABLE IF NOT EXISTS bin (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      kind        TEXT NOT NULL CHECK(kind IN ('thread','reply')),
      original_id INTEGER NOT NULL,
      no          INTEGER NOT NULL,
      time        TEXT NOT NULL,
      name        TEXT NOT NULL,
      subject     TEXT,
      body        TEXT NOT NULL,
      thread_no   INTEGER,
      deleted_at  TEXT NOT NULL,
      expires_at  TEXT NOT NULL
    );

    -- Blog posts uploaded via admin panel.
    -- slug: URL-safe identifier derived from filename
    -- filename: original uploaded filename
    -- body: full markdown content
    CREATE TABLE IF NOT EXISTS blog_posts (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      slug       TEXT UNIQUE NOT NULL,
      filename   TEXT NOT NULL,
      title      TEXT NOT NULL,
      body       TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

// Purge bin rows whose expires_at is in the past.
export function sweepBin() {
  const db = getDb();
  const now = new Date().toISOString();
  const { changes } = db.prepare(`DELETE FROM bin WHERE expires_at < ?`).run(now);
  if (changes > 0) console.log(`bin sweep: removed ${changes} expired row(s)`);
}
