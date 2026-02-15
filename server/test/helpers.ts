import { openDatabase } from '../src/db';
import app from '../src/app';

/**
 * Creates a fresh in-memory DB and attaches it to the app.
 * Returns { app, db }. Caller must call db.close() in afterEach/after to clean up.
 */
export function createTestApp(): { app: typeof app; db: ReturnType<typeof openDatabase> } {
  const db = openDatabase(':memory:');
  app.set('db', db);
  return { app, db };
}
