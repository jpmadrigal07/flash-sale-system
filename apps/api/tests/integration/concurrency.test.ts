import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../helpers/build-test-app.js';
import type { PurchaseRedis } from '../../src/redis/client.js';
import { SALE_KEYS } from '../../src/redis/keys.js';
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

describe('concurrent POST /api/sale/purchase', () => {
  it('sells exactly stock units when many unique buyers arrive together', async () => {
    const stock = 10;
    const concurrency = 200;
    await flushAndSeed(redis, activeWindow(stock));

    const responses = await Promise.all(
      Array.from({ length: concurrency }, (_, i) =>
        app.inject({
          method: 'POST',
          url: '/api/sale/purchase',
          payload: { userId: `user_${i}@stress.test` },
        }),
      ),
    );

    const successes = responses.filter((response) => response.statusCode === 201);
    const soldOut = responses.filter((response) => response.json().error === 'SOLD_OUT');
    const uniqueWinners = new Set(successes.map((response) => response.json().userId as string));

    expect(successes).toHaveLength(stock);
    expect(uniqueWinners.size).toBe(stock);
    expect(soldOut).toHaveLength(concurrency - stock);
    expect(Number(await redis.get(SALE_KEYS.stock))).toBe(0);
    expect(await redis.scard(SALE_KEYS.purchasers)).toBe(stock);
  });

  it('rejects a second concurrent attempt by the same user without extra stock', async () => {
    const stock = 50;
    const uniqueUsers = 50;
    await flushAndSeed(redis, activeWindow(stock));

    const userIds = [
      ...Array.from({ length: uniqueUsers }, (_, i) => `dup_${i}@stress.test`),
      ...Array.from({ length: uniqueUsers }, (_, i) => `dup_${i}@stress.test`),
    ];

    const responses = await Promise.all(
      userIds.map((userId) =>
        app.inject({
          method: 'POST',
          url: '/api/sale/purchase',
          payload: { userId },
        }),
      ),
    );

    const successes = responses.filter((response) => response.statusCode === 201);
    const alreadyPurchased = responses.filter(
      (response) => response.json().error === 'ALREADY_PURCHASED',
    );
    const uniqueWinners = new Set(successes.map((response) => response.json().userId as string));

    expect(successes).toHaveLength(stock);
    expect(uniqueWinners.size).toBe(stock);
    expect(alreadyPurchased).toHaveLength(uniqueUsers);
    expect(Number(await redis.get(SALE_KEYS.stock))).toBe(0);
    expect(await redis.scard(SALE_KEYS.purchasers)).toBe(stock);
  });
});
