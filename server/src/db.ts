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
`;

export function openDatabase(dbPath: string = getDbPath()): DatabaseInstance {
  if (dbPath !== ':memory:') {
    ensureDataDir(dbPath);
  }
  const db = new Database(dbPath);
  db.exec(schema);
  return db;
}
