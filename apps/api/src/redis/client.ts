import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Redis } from 'ioredis';
import { SALE_KEYS } from './keys.js';

export type PurchaseRedis = Redis & {
  attemptPurchase(
    configKey: string,
    stockKey: string,
    purchasersKey: string,
    userId: string,
    now: string,
  ): Promise<[string | number, string | number]>;
};

function loadPurchaseLua(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, 'scripts', 'purchase.lua'),
    join(process.cwd(), 'src/redis/scripts/purchase.lua'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return readFileSync(candidate, 'utf8');
    }
  }
  throw new Error('purchase.lua not found');
}

export async function createRedis(url: string): Promise<PurchaseRedis> {
  const redis = new Redis(url, {
    // Fail closed *and* fail fast: do not queue commands while disconnected,
    // and bound connect/retry so a down Redis cannot hold HTTP sockets open.
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    enableOfflineQueue: false,
    family: 4,
    connectTimeout: url.startsWith('rediss://') ? 5_000 : 1_000,
    retryStrategy: (times) => {
      if (times > 8) {
        return null;
      }
      return Math.min(times * 50, 200);
    },
  });
  // ioredis emits 'error' on connection failure; without a listener Node
  // prints "Unhandled error event" and bypasses the Fastify logger.
  redis.on('error', () => {
    // Command rejections still propagate to the request path.
  });
  redis.defineCommand('attemptPurchase', {
    numberOfKeys: 3,
    lua: loadPurchaseLua(),
  });
  await redis.connect();
  return redis as PurchaseRedis;
}

export async function attemptPurchaseScript(
  redis: PurchaseRedis,
  userId: string,
  nowMs: number,
): Promise<[number, number]> {
  const raw = await redis.attemptPurchase(
    SALE_KEYS.config,
    SALE_KEYS.stock,
    SALE_KEYS.purchasers,
    userId,
    String(nowMs),
  );
  if (!Array.isArray(raw) || raw.length < 2) {
    throw new Error('Unexpected purchase script result');
  }
  return [Number(raw[0]), Number(raw[1])];
}
