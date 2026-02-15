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

describe('Medications API', () => {
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
    it('GET /medications returns 401 without token', async () => {
      await request(app).get('/medications').expect(401);
    });

    it('POST /medications returns 401 without token', async () => {
      await request(app)
        .post('/medications')
        .send({
          name: 'Aspirin',
          dose: '100mg',
          start_date: '2025-01-01',
          daily_frequency: 1,
          day_interval: 1,
        })
        .expect(401);
    });

    it('GET /medications/:id returns 401 without token', async () => {
      await request(app).get('/medications/1').expect(401);
    });

    it('PUT /medications/:id returns 401 without token', async () => {
      await request(app)
        .put('/medications/1')
        .send({
          name: 'Aspirin',
          dose: '100mg',
          start_date: '2025-01-01',
          daily_frequency: 1,
          day_interval: 1,
        })
        .expect(401);
    });

    it('DELETE /medications/:id returns 401 without token', async () => {
      await request(app).delete('/medications/1').expect(401);
    });
  });

  describe('user scoping', () => {
    it('user A cannot see, update or delete user B’s medication', async () => {
      const tokenA = await getToken(app, 'alice@example.com', 'password123');
      const tokenB = await getToken(app, 'bob@example.com', 'password123');

      const createRes = await request(app)
        .post('/medications')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          name: 'Alice Med',
          dose: '10mg',
          start_date: '2025-01-01',
          daily_frequency: 2,
          day_interval: 1,
        })
        .expect(201);
      const medId = createRes.body.id as number;
      assert.strictEqual(createRes.body.name, 'Alice Med');

      const listB = await request(app)
        .get('/medications')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);
      assert.strictEqual(listB.body.medications.length, 0);

      await request(app)
        .get(`/medications/${medId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404);

      await request(app)
        .put(`/medications/${medId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({
          name: 'Hacked',
          dose: '999mg',
          start_date: '2025-01-01',
          daily_frequency: 1,
          day_interval: 1,
        })
        .expect(404);

      await request(app)
        .delete(`/medications/${medId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404);

      const listA = await request(app)
        .get('/medications')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);
      assert.strictEqual(listA.body.medications.length, 1);
      assert.strictEqual(listA.body.medications[0].name, 'Alice Med');
    });
  });

  describe('GET /medications', () => {
    it('returns empty list when user has no medications', async () => {
      const token = await getToken(app, 'empty@example.com', 'password123');
      const res = await request(app)
        .get('/medications')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      assert.deepStrictEqual(res.body.medications, []);
    });

    it('returns only medications for the authenticated user', async () => {
      const token = await getToken(app, 'user@example.com', 'password123');
      await request(app)
        .post('/medications')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Vitamin D',
          dose: '2000 IU',
          start_date: '2025-02-01',
          daily_frequency: 1,
          day_interval: 1,
        })
        .expect(201);
      const res = await request(app)
        .get('/medications')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      assert.strictEqual(res.body.medications.length, 1);
      assert.strictEqual(res.body.medications[0].name, 'Vitamin D');
      assert.strictEqual(res.body.medications[0].dose, '2000 IU');
      assert.strictEqual(res.body.medications[0].start_date, '2025-02-01');
      assert.strictEqual(res.body.medications[0].daily_frequency, 1);
      assert.strictEqual(res.body.medications[0].day_interval, 1);
      assert.ok(res.body.medications[0].id);
      assert.ok(res.body.medications[0].created_at);
    });
  });

  describe('POST /medications', () => {
    it('creates medication and returns 201 with body', async () => {
      const token = await getToken(app, 'create@example.com', 'password123');
      const res = await request(app)
        .post('/medications')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Ibuprofen',
          dose: '400mg',
          start_date: '2025-01-15',
          daily_frequency: 3,
          day_interval: 2,
        })
        .expect(201);
      assert.strictEqual(typeof res.body.id, 'number');
      assert.strictEqual(res.body.name, 'Ibuprofen');
      assert.strictEqual(res.body.dose, '400mg');
      assert.strictEqual(res.body.start_date, '2025-01-15');
      assert.strictEqual(res.body.daily_frequency, 3);
      assert.strictEqual(res.body.day_interval, 2);
      assert.ok(res.body.created_at);
    });

    it('returns 400 for missing name', async () => {
      const token = await getToken(app, 'bad@example.com', 'password123');
      const res = await request(app)
        .post('/medications')
        .set('Authorization', `Bearer ${token}`)
        .send({
          dose: '10mg',
          start_date: '2025-01-01',
          daily_frequency: 1,
          day_interval: 1,
        })
        .expect(400);
      assert.ok(res.body.error);
    });

    it('returns 400 for invalid daily_frequency', async () => {
      const token = await getToken(app, 'bad2@example.com', 'password123');
      await request(app)
        .post('/medications')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Med',
          dose: '10mg',
          start_date: '2025-01-01',
          daily_frequency: 0,
          day_interval: 1,
        })
        .expect(400);
    });

    it('returns 400 for invalid start_date', async () => {
      const token = await getToken(app, 'bad3@example.com', 'password123');
      const res = await request(app)
        .post('/medications')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Med',
          dose: '10mg',
          start_date: 'not-a-date',
          daily_frequency: 1,
          day_interval: 1,
        })
        .expect(400);
      assert.ok(res.body.error);
    });
  });

  describe('GET /medications/:id', () => {
    it('returns 200 and medication when owned by user', async () => {
      const token = await getToken(app, 'get@example.com', 'password123');
      const createRes = await request(app)
        .post('/medications')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Get Med',
          dose: '5mg',
          start_date: '2025-01-01',
          daily_frequency: 2,
          day_interval: 1,
        })
        .expect(201);
      const id = createRes.body.id;
      const res = await request(app)
        .get(`/medications/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      assert.strictEqual(res.body.id, id);
      assert.strictEqual(res.body.name, 'Get Med');
    });

    it('returns 404 for non-existent id', async () => {
      const token = await getToken(app, 'none@example.com', 'password123');
      await request(app)
        .get('/medications/99999')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('returns 400 for invalid id', async () => {
      const token = await getToken(app, 'inv@example.com', 'password123');
      await request(app)
        .get('/medications/abc')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });
  });

  describe('PUT /medications/:id', () => {
    it('updates medication and returns 200 when owned by user', async () => {
      const token = await getToken(app, 'put@example.com', 'password123');
      const createRes = await request(app)
        .post('/medications')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Original',
          dose: '10mg',
          start_date: '2025-01-01',
          daily_frequency: 1,
          day_interval: 1,
        })
        .expect(201);
      const id = createRes.body.id;
      const res = await request(app)
        .put(`/medications/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated',
          dose: '20mg',
          start_date: '2025-02-01',
          daily_frequency: 2,
          day_interval: 2,
        })
        .expect(200);
      assert.strictEqual(res.body.id, id);
      assert.strictEqual(res.body.name, 'Updated');
      assert.strictEqual(res.body.dose, '20mg');
      assert.strictEqual(res.body.start_date, '2025-02-01');
      assert.strictEqual(res.body.daily_frequency, 2);
      assert.strictEqual(res.body.day_interval, 2);
    });

    it('returns 404 when medication does not belong to user', async () => {
      const tokenA = await getToken(app, 'puta@example.com', 'password123');
      const tokenB = await getToken(app, 'putb@example.com', 'password123');
      const createRes = await request(app)
        .post('/medications')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          name: 'A Med',
          dose: '10mg',
          start_date: '2025-01-01',
          daily_frequency: 1,
          day_interval: 1,
        })
        .expect(201);
      await request(app)
        .put(`/medications/${createRes.body.id}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({
          name: 'Hacked',
          dose: '10mg',
          start_date: '2025-01-01',
          daily_frequency: 1,
          day_interval: 1,
        })
        .expect(404);
    });
  });

  describe('DELETE /medications/:id', () => {
    it('deletes medication and returns 204 when owned by user', async () => {
      const token = await getToken(app, 'del@example.com', 'password123');
      const createRes = await request(app)
        .post('/medications')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'To Delete',
          dose: '10mg',
          start_date: '2025-01-01',
          daily_frequency: 1,
          day_interval: 1,
        })
        .expect(201);
      const id = createRes.body.id;
      await request(app)
        .delete(`/medications/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);
      const list = await request(app)
        .get('/medications')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      assert.strictEqual(list.body.medications.length, 0);
    });

    it('returns 404 when medication does not belong to user', async () => {
      const tokenA = await getToken(app, 'dela@example.com', 'password123');
      const tokenB = await getToken(app, 'delb@example.com', 'password123');
      const createRes = await request(app)
        .post('/medications')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          name: 'A Med',
          dose: '10mg',
          start_date: '2025-01-01',
          daily_frequency: 1,
          day_interval: 1,
        })
        .expect(201);
      await request(app)
        .delete(`/medications/${createRes.body.id}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404);
    });
  });
});
