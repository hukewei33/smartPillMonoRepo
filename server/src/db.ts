import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export type DatabaseInstance = InstanceType<typeof Database>;

const defaultPath = path.join(__dirname, '..', 'data', 'smartpill.db');

export function getDbPath(): string {
  return process.env.DB_PATH ?? defaultPath;
}

function ensureDataDir(dbPath: string): void {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export const schema = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS medications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  dose TEXT NOT NULL,
  start_date TEXT NOT NULL,
  daily_frequency INTEGER NOT NULL,
  day_interval INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS idx_medications_user_id ON medications (user_id);

CREATE TABLE IF NOT EXISTS medication_consumptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  medication_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (medication_id) REFERENCES medications (id)
);

CREATE INDEX IF NOT EXISTS idx_medication_consumptions_medication_id ON medication_consumptions (medication_id);
`;

export function openDatabase(dbPath: string = getDbPath()): DatabaseInstance {
  if (dbPath !== ':memory:') {
    ensureDataDir(dbPath);
  }
  const db = new Database(dbPath);
  db.exec(schema);
  return db;
}
