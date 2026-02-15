import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { createTestApp } from './helpers';
import type { Express } from 'express';
import type { DatabaseInstance } from '../src/db';

describe('POST /auth/register', () => {
  let app: Express;
  let db: DatabaseInstance | null;

  beforeEach(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
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

  it('returns 201 and user id/email on success', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'alice@example.com', password: 'password123' })
      .expect(201);
    assert.strictEqual(res.body.email, 'alice@example.com');
    assert.strictEqual(typeof res.body.id, 'number');
  });

  it('returns 409 when email already registered', async () => {
    await request(app)
      .post('/auth/register')
      .send({ email: 'dup@example.com', password: 'password123' })
      .expect(201);
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'dup@example.com', password: 'otherpass456' })
      .expect(409);
    assert.ok(res.body.error?.includes('already') || res.body.error?.includes('Email'));
  });

  it('returns 400 for missing email', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ password: 'password123' })
      .expect(400);
    assert.ok(res.body.error);
  });

  it('returns 400 for invalid email', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'notanemail', password: 'password123' })
      .expect(400);
    assert.ok(res.body.error);
  });

  it('returns 400 for short password', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'bob@example.com', password: 'short' })
      .expect(400);
    assert.ok(res.body.error);
  });
});

describe('POST /auth/login', () => {
  let app: Express;
  let db: DatabaseInstance | null;

  beforeEach(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
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

  it('returns 200 and token on success', async () => {
    await request(app)
      .post('/auth/register')
      .send({ email: 'login@example.com', password: 'mypassword123' })
      .expect(201);
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'login@example.com', password: 'mypassword123' })
      .expect(200);
    assert.ok(res.body.token);
    assert.strictEqual(typeof res.body.token, 'string');
  });

  it('returns 401 for wrong password', async () => {
    await request(app)
      .post('/auth/register')
      .send({ email: 'login@example.com', password: 'mypassword123' })
      .expect(201);
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'login@example.com', password: 'wrongpassword' })
      .expect(401);
    assert.ok(res.body.error);
  });

  it('returns 401 for unknown email', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: 'anypass123' })
      .expect(401);
    assert.ok(res.body.error);
  });

  it('returns 400 for missing email', async () => {
    await request(app)
      .post('/auth/login')
      .send({ password: 'mypassword123' })
      .expect(400);
  });
});
