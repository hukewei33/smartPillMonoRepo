const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const defaultPath = path.join(__dirname, '..', 'data', 'smartpill.db');

function getDbPath() {
  return process.env.DB_PATH || defaultPath;
}

function ensureDataDir(dbPath) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const schema = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

function openDatabase(dbPath = getDbPath()) {
  if (dbPath !== ':memory:') {
    ensureDataDir(dbPath);
  }
  const db = new Database(dbPath);
  db.exec(schema);
  return db;
}

module.exports = {
  openDatabase,
  getDbPath,
  schema,
};
