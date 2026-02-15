import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { createTestApp } from './helpers';
import type { Express } from 'express';
import type { DatabaseInstance } from '../src/db';

const TEST_SECRET = 'test-secret';

function getToken(app: Express, email: string, password: string): Promise<string> {
  return request(app)
    .post('/auth/register')
    .send({ email, password })
    .expect(201)
    .then(() =>
      request(app)
        .post('/auth/login')
        .send({ email, password })
        .expect(200)
        .then((res) => res.body.token as string)
    );
}

async function createMedication(
  app: Express,
  token: string
): Promise<{ id: number }> {
  const res = await request(app)
    .post('/medications')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Test Med',
      dose: '10mg',
      start_date: '2025-01-01',
      daily_frequency: 1,
      day_interval: 1,
    })
    .expect(201);
  return { id: res.body.id };
}

describe('POST /medications/:id/consumptions', () => {
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

  describe('auth', () => {
    it('returns 401 without token', async () => {
      await request(app)
        .post('/medications/1/consumptions')
        .send({ date: '2025-02-15', time: '08:00' })
        .expect(401);
    });
  });

  describe('medication ownership', () => {
    it('returns 404 when medication does not belong to user', async () => {
      const tokenA = await getToken(app, 'alice@example.com', 'password123');
      const tokenB = await getToken(app, 'bob@example.com', 'password123');
      const { id: medId } = await createMedication(app, tokenA);

      const res = await request(app)
        .post(`/medications/${medId}/consumptions`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ date: '2025-02-15', time: '08:00' })
        .expect(404);
      assert.ok(res.body.error?.includes('not found') || res.body.error?.includes('Medication'));
    });

    it('returns 404 when medication does not exist', async () => {
      const token = await getToken(app, 'user@example.com', 'password123');
      await request(app)
        .post('/medications/99999/consumptions')
        .set('Authorization', `Bearer ${token}`)
        .send({ date: '2025-02-15', time: '08:00' })
        .expect(404);
    });
  });

  describe('validation', () => {
    it('returns 400 for missing date', async () => {
      const token = await getToken(app, 'user@example.com', 'password123');
      const { id: medId } = await createMedication(app, token);
      const res = await request(app)
        .post(`/medications/${medId}/consumptions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ time: '08:00' })
        .expect(400);
      assert.ok(res.body.error);
    });

    it('returns 400 for missing time', async () => {
      const token = await getToken(app, 'user@example.com', 'password123');
      const { id: medId } = await createMedication(app, token);
      const res = await request(app)
        .post(`/medications/${medId}/consumptions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ date: '2025-02-15' })
        .expect(400);
      assert.ok(res.body.error);
    });

    it('returns 400 for invalid date', async () => {
      const token = await getToken(app, 'user@example.com', 'password123');
      const { id: medId } = await createMedication(app, token);
      const res = await request(app)
        .post(`/medications/${medId}/consumptions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ date: 'not-a-date', time: '08:00' })
        .expect(400);
      assert.ok(res.body.error);
    });

    it('returns 400 for invalid time', async () => {
      const token = await getToken(app, 'user@example.com', 'password123');
      const { id: medId } = await createMedication(app, token);
      const res = await request(app)
        .post(`/medications/${medId}/consumptions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ date: '2025-02-15', time: '25:00' })
        .expect(400);
      assert.ok(res.body.error);
    });
  });

  describe('success', () => {
    it('creates consumption and returns 201 with body', async () => {
      const token = await getToken(app, 'user@example.com', 'password123');
      const { id: medId } = await createMedication(app, token);
      const res = await request(app)
        .post(`/medications/${medId}/consumptions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ date: '2025-02-15', time: '08:30' })
        .expect(201);
      assert.strictEqual(typeof res.body.id, 'number');
      assert.strictEqual(res.body.medication_id, medId);
      assert.strictEqual(res.body.date, '2025-02-15');
      assert.strictEqual(res.body.time, '08:30');
      assert.ok(res.body.created_at);
    });
  });
});
