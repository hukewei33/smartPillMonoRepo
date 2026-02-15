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
  token: string,
  overrides: Partial<{ name: string; start_date: string; daily_frequency: number; day_interval: number }> = {}
): Promise<{ id: number; name: string; start_date: string; daily_frequency: number; day_interval: number }> {
  const res = await request(app)
    .post('/medications')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: overrides.name ?? 'Test Med',
      dose: '10mg',
      start_date: overrides.start_date ?? '2025-01-01',
      daily_frequency: overrides.daily_frequency ?? 1,
      day_interval: overrides.day_interval ?? 1,
    })
    .expect(201);
  return {
    id: res.body.id,
    name: res.body.name,
    start_date: res.body.start_date,
    daily_frequency: res.body.daily_frequency,
    day_interval: res.body.day_interval,
  };
}

describe('GET /consumption-report', () => {
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
        .get('/consumption-report?start_date=2025-02-15')
        .expect(401);
    });
  });

  describe('validation', () => {
    it('returns 400 when start_date is missing', async () => {
      const token = await getToken(app, 'user@example.com', 'password123');
      const res = await request(app)
        .get('/consumption-report')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
      assert.ok(res.body.error?.includes('start_date'));
    });

    it('returns 400 when start_date is empty', async () => {
      const token = await getToken(app, 'user@example.com', 'password123');
      const res = await request(app)
        .get('/consumption-report?start_date=')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
      assert.ok(res.body.error);
    });

    it('returns 400 when start_date is invalid', async () => {
      const token = await getToken(app, 'user@example.com', 'password123');
      const res = await request(app)
        .get('/consumption-report?start_date=not-a-date')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
      assert.ok(res.body.error?.includes('Invalid') || res.body.error?.includes('YYYY-MM-DD'));
    });
  });

  describe('response shape', () => {
    it('returns 7 day results with date, expected, and actual arrays', async () => {
      const token = await getToken(app, 'user@example.com', 'password123');
      const res = await request(app)
        .get('/consumption-report?start_date=2025-02-15')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      assert.ok(Array.isArray(res.body));
      assert.strictEqual(res.body.length, 7);
      const firstDay = res.body[0];
      assert.strictEqual(firstDay.date, '2025-02-15');
      assert.ok(Array.isArray(firstDay.expected));
      assert.ok(Array.isArray(firstDay.actual));
      assert.strictEqual(res.body[1].date, '2025-02-16');
      assert.strictEqual(res.body[6].date, '2025-02-21');
    });
  });

  describe('expected consumption (date math)', () => {
    it('includes expected slots based on start_date, day_interval and daily_frequency', async () => {
      const token = await getToken(app, 'user@example.com', 'password123');
      await createMedication(app, token, {
        name: 'Daily Twice',
        start_date: '2025-02-15',
        daily_frequency: 2,
        day_interval: 1,
      });
      const res = await request(app)
        .get('/consumption-report?start_date=2025-02-15')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const firstDay = res.body[0];
      assert.strictEqual(firstDay.date, '2025-02-15');
      assert.strictEqual(firstDay.expected.length, 2);
      assert.strictEqual(firstDay.expected[0].medication_name, 'Daily Twice');
      assert.strictEqual(firstDay.expected[0].dose_index, 1);
      assert.strictEqual(firstDay.expected[1].dose_index, 2);
    });

    it('omits expected on non-dose days when day_interval is 2', async () => {
      const token = await getToken(app, 'user@example.com', 'password123');
      await createMedication(app, token, {
        name: 'Every Other',
        start_date: '2025-02-15',
        daily_frequency: 1,
        day_interval: 2,
      });
      const res = await request(app)
        .get('/consumption-report?start_date=2025-02-15')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const day0 = res.body[0];
      const day1 = res.body[1];
      const day2 = res.body[2];
      assert.strictEqual(day0.date, '2025-02-15');
      assert.strictEqual(day0.expected.length, 1);
      assert.strictEqual(day1.date, '2025-02-16');
      assert.strictEqual(day1.expected.length, 0);
      assert.strictEqual(day2.date, '2025-02-17');
      assert.strictEqual(day2.expected.length, 1);
    });
  });

  describe('actual consumption', () => {
    it('includes logged consumptions in the correct day buckets', async () => {
      const token = await getToken(app, 'user@example.com', 'password123');
      const med = await createMedication(app, token);
      await request(app)
        .post(`/medications/${med.id}/consumptions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ date: '2025-02-15', time: '08:00' })
        .expect(201);
      await request(app)
        .post(`/medications/${med.id}/consumptions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ date: '2025-02-16', time: '09:30' })
        .expect(201);
      const res = await request(app)
        .get('/consumption-report?start_date=2025-02-15')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const day0 = res.body[0];
      const day1 = res.body[1];
      assert.strictEqual(day0.actual.length, 1);
      assert.strictEqual(day0.actual[0].date, '2025-02-15');
      assert.strictEqual(day0.actual[0].time, '08:00');
      assert.strictEqual(day0.actual[0].medication_name, 'Test Med');
      assert.strictEqual(day1.actual.length, 1);
      assert.strictEqual(day1.actual[0].time, '09:30');
    });
  });

  describe('user scoping', () => {
    it('only includes medications and consumptions for the authenticated user', async () => {
      const tokenA = await getToken(app, 'alice@example.com', 'password123');
      const tokenB = await getToken(app, 'bob@example.com', 'password123');
      const medA = await createMedication(app, tokenA, { name: 'Alice Med', start_date: '2025-02-15' });
      await createMedication(app, tokenB, { name: 'Bob Med', start_date: '2025-02-15' });
      await request(app)
        .post(`/medications/${medA.id}/consumptions`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ date: '2025-02-15', time: '08:00' })
        .expect(201);
      const res = await request(app)
        .get('/consumption-report?start_date=2025-02-15')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);
      const firstDay = res.body[0];
      assert.strictEqual(firstDay.expected.length, 1);
      assert.strictEqual(firstDay.expected[0].medication_name, 'Bob Med');
      assert.strictEqual(firstDay.actual.length, 0);
    });
  });
});
