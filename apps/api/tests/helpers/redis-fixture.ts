import { applySeed, flushSaleKeys } from '../../src/redis/seed.js';
import { createRedis, type PurchaseRedis } from '../../src/redis/client.js';
import { loadConfig, loadEnvFiles } from '../../src/config.js';

loadEnvFiles();

export function testRedisUrl(): string {
  return loadConfig().redisUrl;
}

export function testConfig() {
  return loadConfig({
    PORT: '3000',
    REDIS_URL: testRedisUrl(),
    CORS_ORIGIN: 'http://localhost:5173',
    TOTAL_STOCK: '100',
    RESEED_ON_BOOT: 'false',
    SALE_START_TIME: new Date(Date.now() - 60_000).toISOString(),
    SALE_END_TIME: new Date(Date.now() + 3_600_000).toISOString(),
  });
}

export async function createTestRedis(): Promise<PurchaseRedis> {
  return createRedis(testRedisUrl());
}

export async function flushAndSeed(
  redis: PurchaseRedis,
  options: { startTimeMs: number; endTimeMs: number; totalStock: number },
): Promise<void> {
  await flushSaleKeys(redis);
  await applySeed(redis, options);
}

export function activeWindow(totalStock: number) {
  const now = Date.now();
  return {
    startTimeMs: now - 60_000,
    endTimeMs: now + 3_600_000,
    totalStock,
  };
}

export function upcomingWindow(totalStock: number) {
  const now = Date.now();
  return {
    startTimeMs: now + 3_600_000,
    endTimeMs: now + 7_200_000,
    totalStock,
  };
}

export function endedWindow(totalStock: number) {
  const now = Date.now();
  return {
    startTimeMs: now - 7_200_000,
    endTimeMs: now - 3_600_000,
    totalStock,
  };
}
