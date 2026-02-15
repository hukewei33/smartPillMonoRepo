const { openDatabase } = require('../src/db');
const app = require('../src/app');

/**
 * Creates a fresh in-memory DB and attaches it to the app.
 * Returns { app, db }. Caller must call db.close() in afterEach/after to clean up.
 */
function createTestApp() {
  const db = openDatabase(':memory:');
  app.set('db', db);
  return { app, db };
}

module.exports = { createTestApp };
