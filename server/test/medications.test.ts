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
          times: ['08:00'],
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
          times: ['08:00'],
          day_interval: 1,
        })
        .expect(401);
    });

    it('DELETE /medications/:id returns 401 without token', async () => {
      await request(app).delete('/medications/1').expect(401);
    });
  });

  describe('user scoping', () => {
    it('user A cannot see, update or delete user B\u2019s medication', async () => {
      const tokenA = await getToken(app, 'alice@example.com', 'password123');
      const tokenB = await getToken(app, 'bob@example.com', 'password123');

      const createRes = await request(app)
        .post('/medications')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          name: 'Alice Med',
          dose: '10mg',
          start_date: '2025-01-01',
          times: ['08:00', '20:00'],
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
          times: ['08:00'],
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
          times: ['08:00'],
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
      assert.deepStrictEqual(res.body.medications[0].times, ['08:00']);
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
          times: ['08:00', '12:00', '18:00'],
          day_interval: 2,
        })
        .expect(201);
      assert.strictEqual(typeof res.body.id, 'number');
      assert.strictEqual(res.body.name, 'Ibuprofen');
      assert.strictEqual(res.body.dose, '400mg');
      assert.strictEqual(res.body.start_date, '2025-01-15');
      assert.deepStrictEqual(res.body.times, ['08:00', '12:00', '18:00']);
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
          times: ['08:00'],
          day_interval: 1,
        })
        .expect(400);
      assert.ok(res.body.error);
    });

    describe('times validation', () => {
      it('returns 400 when times is missing', async () => {
        const token = await getToken(app, 'tv1@example.com', 'password123');
        await request(app)
          .post('/medications')
          .set('Authorization', `Bearer ${token}`)
          .send({ name: 'Med', dose: '10mg', start_date: '2025-01-01', day_interval: 1 })
          .expect(400);
      });

      it('returns 400 when times is an empty array', async () => {
        const token = await getToken(app, 'tv2@example.com', 'password123');
        await request(app)
          .post('/medications')
          .set('Authorization', `Bearer ${token}`)
          .send({ name: 'Med', dose: '10mg', start_date: '2025-01-01', times: [], day_interval: 1 })
          .expect(400);
      });

      it('returns 400 when times is not an array', async () => {
        const token = await getToken(app, 'tv3@example.com', 'password123');
        await request(app)
          .post('/medications')
          .set('Authorization', `Bearer ${token}`)
          .send({ name: 'Med', dose: '10mg', start_date: '2025-01-01', times: 3, day_interval: 1 })
          .expect(400);
      });

      it('returns 400 when a time entry is not in HH:MM format', async () => {
        const token = await getToken(app, 'tv4@example.com', 'password123');
        await request(app)
          .post('/medications')
          .set('Authorization', `Bearer ${token}`)
          .send({ name: 'Med', dose: '10mg', start_date: '2025-01-01', times: ['8:00'], day_interval: 1 })
          .expect(400);
      });

      it('returns 400 when hour is out of range', async () => {
        const token = await getToken(app, 'tv5@example.com', 'password123');
        await request(app)
          .post('/medications')
          .set('Authorization', `Bearer ${token}`)
          .send({ name: 'Med', dose: '10mg', start_date: '2025-01-01', times: ['25:00'], day_interval: 1 })
          .expect(400);
      });

      it('returns 400 when minute is out of range', async () => {
        const token = await getToken(app, 'tv6@example.com', 'password123');
        await request(app)
          .post('/medications')
          .set('Authorization', `Bearer ${token}`)
          .send({ name: 'Med', dose: '10mg', start_date: '2025-01-01', times: ['08:60'], day_interval: 1 })
          .expect(400);
      });
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
          times: ['08:00'],
          day_interval: 1,
        })
        .expect(400);
      assert.ok(res.body.error);
    });

    it('returns 400 for start_date with invalid month (e.g. 2025-13-01)', async () => {
      const token = await getToken(app, 'dateA@example.com', 'password123');
      const res = await request(app)
        .post('/medications')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Med',
          dose: '10mg',
          start_date: '2025-13-01',
          times: ['08:00'],
          day_interval: 1,
        })
        .expect(400);
      assert.ok(res.body.error);
    });

    it('returns 400 for start_date not in YYYY-MM-DD format (e.g. 2025-1-1)', async () => {
      const token = await getToken(app, 'dateB@example.com', 'password123');
      const res = await request(app)
        .post('/medications')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Med',
          dose: '10mg',
          start_date: '2025-1-1',
          times: ['08:00'],
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
          times: ['08:00', '20:00'],
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
          times: ['08:00'],
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
          times: ['08:00', '20:00'],
          day_interval: 2,
        })
        .expect(200);
      assert.strictEqual(res.body.id, id);
      assert.strictEqual(res.body.name, 'Updated');
      assert.strictEqual(res.body.dose, '20mg');
      assert.strictEqual(res.body.start_date, '2025-02-01');
      assert.deepStrictEqual(res.body.times, ['08:00', '20:00']);
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
          times: ['08:00'],
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
          times: ['08:00'],
          day_interval: 1,
        })
        .expect(404);
    });

    it('PUT response contains the updated medication data (not another user\'s data)', async () => {
      // Two users, each with one medication. After A updates their medication,
      // the response must contain A's updated data, not B's row.
      const tokenA = await getToken(app, 'putscopeA@example.com', 'password123');
      const tokenB = await getToken(app, 'putscopeB@example.com', 'password123');

      const resA = await request(app)
        .post('/medications')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'MedA', dose: '1mg', start_date: '2025-01-01', times: ['08:00'], day_interval: 1 })
        .expect(201);

      // B creates their medication so the table has two rows
      await request(app)
        .post('/medications')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ name: 'MedB', dose: '999mg', start_date: '2025-01-01', times: ['09:00'], day_interval: 2 })
        .expect(201);

      const updateRes = await request(app)
        .put(`/medications/${resA.body.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'MedA Updated', dose: '2mg', start_date: '2025-06-01', times: ['10:00'], day_interval: 3 })
        .expect(200);

      // The response must be A's updated medication, not B's row
      assert.strictEqual(updateRes.body.id, resA.body.id);
      assert.strictEqual(updateRes.body.name, 'MedA Updated');
      assert.strictEqual(updateRes.body.dose, '2mg');
      assert.deepStrictEqual(updateRes.body.times, ['10:00']);
      assert.strictEqual(updateRes.body.day_interval, 3);
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
          times: ['08:00'],
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
          times: ['08:00'],
          day_interval: 1,
        })
        .expect(201);
      await request(app)
        .delete(`/medications/${createRes.body.id}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404);
    });

    it('deletes associated consumption records when medication is deleted', async () => {
      const token = await getToken(app, 'cascade@example.com', 'password123');

      // Create a medication
      const createRes = await request(app)
        .post('/medications')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'To Cascade Delete',
          dose: '10mg',
          start_date: '2025-01-01',
          times: ['08:00'],
          day_interval: 1,
        })
        .expect(201);
      const medId = createRes.body.id as number;

      // Log a consumption
      await request(app)
        .post(`/medications/${medId}/consumptions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ date: '2025-01-01', time: '08:00' })
        .expect(201);

      // Verify consumption exists before deletion
      const beforeCount = (db!.prepare('SELECT COUNT(*) as count FROM medication_consumptions WHERE medication_id = ?').get(medId) as { count: number }).count;
      assert.strictEqual(beforeCount, 1, 'consumption should exist before delete');

      // Delete the medication
      await request(app)
        .delete(`/medications/${medId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      // Consumption row must be gone
      const afterCount = (db!.prepare('SELECT COUNT(*) as count FROM medication_consumptions WHERE medication_id = ?').get(medId) as { count: number }).count;
      assert.strictEqual(afterCount, 0, 'consumption should be deleted with its medication');
    });
  });
});
