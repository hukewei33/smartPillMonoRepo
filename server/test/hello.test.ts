import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createTestApp } from './helpers';
import type { Express } from 'express';
import type { DatabaseInstance } from '../src/db';

const TEST_SECRET = 'test-secret';

describe('GET /hello', () => {
  let app: Express;
  let db: DatabaseInstance | null;

  beforeEach(() => {
    process.env.JWT_SECRET = TEST_SECRET;
    const testApp = createTestApp();
    app = testApp.app;
    db = testApp.db;
  });

  afterEach(() => {
    if (db) {
      db.close();
      db = null;
    }
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/hello').expect(401);
    assert.ok(res.body.error);
  });

  it('returns 401 with invalid token', async () => {
    await request(app)
      .get('/hello')
      .set('Authorization', 'Bearer invalid.jwt.token')
      .expect(401);
  });

  it('returns 401 with expired token', async () => {
    const token = jwt.sign(
      { sub: 1, email: 'u@x.com' },
      TEST_SECRET,
      { algorithm: 'HS256', expiresIn: '-1h' }
    );
    await request(app)
      .get('/hello')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });

  it('returns 200 and message with valid token', async () => {
    const token = jwt.sign(
      { sub: 1, email: 'hello@example.com' },
      TEST_SECRET,
      { algorithm: 'HS256', expiresIn: '1h' }
    );
    const res = await request(app)
      .get('/hello')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    assert.strictEqual(res.body.message, 'Hello, hello@example.com');
  });

  it('returns 200 with "Hello, world" when payload has no email', async () => {
    const token = jwt.sign(
      { sub: 1 },
      TEST_SECRET,
      { algorithm: 'HS256', expiresIn: '1h' }
    );
    const res = await request(app)
      .get('/hello')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    assert.strictEqual(res.body.message, 'Hello, world');
  });
});
