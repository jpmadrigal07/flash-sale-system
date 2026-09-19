import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../helpers/build-test-app.js';
import type { PurchaseRedis } from '../../src/redis/client.js';
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

describe('POST /api/sale/purchase', () => {
  it('succeeds on the first attempt while the sale is active', async () => {
    await flushAndSeed(redis, activeWindow(10));
    const response = await app.inject({
      method: 'POST',
      url: '/api/sale/purchase',
      payload: { userId: 'alice@example.com' },
    });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      success: true,
      userId: 'alice@example.com',
      remainingStock: 9,
    });
  });

  it('rejects a second purchase by the same user without consuming more stock', async () => {
    await flushAndSeed(redis, activeWindow(10));
    const first = await app.inject({
      method: 'POST',
      url: '/api/sale/purchase',
      payload: { userId: 'alice@example.com' },
    });
    const second = await app.inject({
      method: 'POST',
      url: '/api/sale/purchase',
      payload: { userId: 'alice@example.com' },
    });
    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(409);
    expect(second.json()).toMatchObject({
      success: false,
      error: 'ALREADY_PURCHASED',
    });
    const status = await app.inject({ method: 'GET', url: '/api/sale/status' });
    expect(status.json().remainingStock).toBe(9);
  });

  it('returns SOLD_OUT once stock is exhausted', async () => {
    await flushAndSeed(redis, activeWindow(1));
    const winner = await app.inject({
      method: 'POST',
      url: '/api/sale/purchase',
      payload: { userId: 'alice@example.com' },
    });
    const loser = await app.inject({
      method: 'POST',
      url: '/api/sale/purchase',
      payload: { userId: 'bob@example.com' },
    });
    expect(winner.statusCode).toBe(201);
    expect(loser.statusCode).toBe(409);
    expect(loser.json()).toMatchObject({ success: false, error: 'SOLD_OUT' });
  });

  it('rejects purchases before the window', async () => {
    await flushAndSeed(redis, upcomingWindow(10));
    const response = await app.inject({
      method: 'POST',
      url: '/api/sale/purchase',
      payload: { userId: 'alice@example.com' },
    });
    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ success: false, error: 'SALE_NOT_STARTED' });
  });

  it('rejects purchases after the window', async () => {
    await flushAndSeed(redis, endedWindow(10));
    const response = await app.inject({
      method: 'POST',
      url: '/api/sale/purchase',
      payload: { userId: 'alice@example.com' },
    });
    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ success: false, error: 'SALE_ENDED' });
  });

  it('rejects a missing or invalid userId', async () => {
    await flushAndSeed(redis, activeWindow(10));
    const missing = await app.inject({
      method: 'POST',
      url: '/api/sale/purchase',
      payload: {},
    });
    const empty = await app.inject({
      method: 'POST',
      url: '/api/sale/purchase',
      payload: { userId: '' },
    });
    const invalid = await app.inject({
      method: 'POST',
      url: '/api/sale/purchase',
      payload: { userId: 'bad user!' },
    });
    expect(missing.statusCode).toBe(400);
    expect(missing.json()).toMatchObject({ success: false, error: 'INVALID_REQUEST' });
    expect(empty.statusCode).toBe(400);
    expect(empty.json()).toMatchObject({ success: false, error: 'INVALID_REQUEST' });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json()).toMatchObject({ success: false, error: 'INVALID_REQUEST' });
  });
});
