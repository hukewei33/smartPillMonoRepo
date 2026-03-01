import { openDatabase, type DatabaseInstance } from '../src/db';
import { createApp } from '../src/app';
import type { Express } from 'express';

/**
 * Creates a fresh Express app instance with its own in-memory DB.
 * Returns { app, db }. Caller must call db.close() in afterEach to clean up.
 */
export function createTestApp(): { app: Express; db: DatabaseInstance } {
  const db = openDatabase(':memory:');
  const app = createApp();
  app.set('db', db);
  return { app, db };
}
