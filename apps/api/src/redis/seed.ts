import type { AppConfig } from '../config.js';
import { SALE_KEYS } from './keys.js';
import type { PurchaseRedis } from './client.js';

export interface SeedOptions {
  startTimeMs: number;
  endTimeMs: number;
  totalStock: number;
}

export async function seedSale(
  redis: PurchaseRedis,
  config: AppConfig,
  options?: { force?: boolean },
): Promise<void> {
  const exists = await redis.exists(SALE_KEYS.config);
  if (exists && !config.reseedOnBoot && !options?.force) {
    return;
  }

  await applySeed(redis, {
    startTimeMs: config.saleStartTime.getTime(),
    endTimeMs: config.saleEndTime.getTime(),
    totalStock: config.totalStock,
  });
}

export async function flushSaleKeys(redis: PurchaseRedis): Promise<void> {
  await redis.del(SALE_KEYS.config, SALE_KEYS.stock, SALE_KEYS.purchasers);
}

export async function applySeed(redis: PurchaseRedis, options: SeedOptions): Promise<void> {
  const pipeline = redis.multi();
  pipeline.hset(SALE_KEYS.config, {
    startTime: String(options.startTimeMs),
    endTime: String(options.endTimeMs),
    totalStock: String(options.totalStock),
  });
  pipeline.set(SALE_KEYS.stock, String(options.totalStock));
  pipeline.del(SALE_KEYS.purchasers);
  await pipeline.exec();
}
