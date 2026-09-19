import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../helpers/build-test-app.js';
import type { PurchaseRedis } from '../../src/redis/client.js';
import { activeWindow, flushAndSeed } from '../helpers/redis-fixture.js';

let app: FastifyInstance;
let redis: PurchaseRedis;

beforeAll(async () => {
  ({ app, redis } = await buildTestApp());
});

afterAll(async () => {
  await app.close();
  await redis.quit();
});

describe('GET /api/sale/purchase/:userId', () => {
  it('returns purchased: true for a purchaser', async () => {
    await flushAndSeed(redis, activeWindow(5));
    await app.inject({
      method: 'POST',
      url: '/api/sale/purchase',
      payload: { userId: 'alice@example.com' },
    });
    const response = await app.inject({
      method: 'GET',
      url: '/api/sale/purchase/alice@example.com',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ userId: 'alice@example.com', purchased: true });
  });

  it('returns 200 with purchased: false for a non-purchaser', async () => {
    await flushAndSeed(redis, activeWindow(5));
    const response = await app.inject({
      method: 'GET',
      url: '/api/sale/purchase/bob@example.com',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ userId: 'bob@example.com', purchased: false });
  });
});
