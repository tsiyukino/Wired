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
  `);
}
