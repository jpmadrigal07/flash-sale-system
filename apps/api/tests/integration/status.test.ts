import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../helpers/build-test-app.js';
import type { PurchaseRedis } from '../../src/redis/client.js';
import { SALE_KEYS } from '../../src/redis/keys.js';
import {
  activeWindow,
  endedWindow,
  flushAndSeed,
  upcomingWindow,
} from '../helpers/redis-fixture.js';

let app: FastifyInstance;
let redis: PurchaseRedis;

beforeAll(async () => {
  ({ app, redis } = await buildTestApp());
});

afterAll(async () => {
  await app.close();
  await redis.quit();
});

describe('GET /api/sale/status', () => {
  it('returns upcoming before the window', async () => {
    await flushAndSeed(redis, upcomingWindow(50));
    const response = await app.inject({ method: 'GET', url: '/api/sale/status' });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe('upcoming');
    expect(body.totalStock).toBe(50);
    expect(body.remainingStock).toBe(50);
    expect(typeof body.serverTime).toBe('string');
  });

  it('returns active inside the window', async () => {
    await flushAndSeed(redis, activeWindow(50));
    const response = await app.inject({ method: 'GET', url: '/api/sale/status' });
    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe('active');
  });

  it('returns ended after the window', async () => {
    await flushAndSeed(redis, endedWindow(50));
    const response = await app.inject({ method: 'GET', url: '/api/sale/status' });
    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe('ended');
  });

  it('decrements remainingStock after purchases', async () => {
    await flushAndSeed(redis, activeWindow(5));
    await app.inject({
      method: 'POST',
      url: '/api/sale/purchase',
      payload: { userId: 'alice@example.com' },
    });
    await app.inject({
      method: 'POST',
      url: '/api/sale/purchase',
      payload: { userId: 'bob@example.com' },
    });
    const response = await app.inject({ method: 'GET', url: '/api/sale/status' });
    expect(response.statusCode).toBe(200);
    expect(response.json().remainingStock).toBe(3);
  });

  it('returns NOT_CONFIGURED when totalStock is missing from the hash', async () => {
    await flushAndSeed(redis, activeWindow(5));
    await redis.hdel(SALE_KEYS.config, 'totalStock');
    const response = await app.inject({ method: 'GET', url: '/api/sale/status' });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ success: false, error: 'NOT_CONFIGURED' });
  });
});
