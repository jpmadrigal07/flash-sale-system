import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import type { PurchaseRedis } from '../../src/redis/client.js';
import { createTestRedis, testConfig } from './redis-fixture.js';

export async function buildTestApp(): Promise<{ app: FastifyInstance; redis: PurchaseRedis }> {
  const redis = await createTestRedis();
  await redis.ping();
  const app = await buildApp({ config: testConfig(), redis }, { logger: false });
  return { app, redis };
}
