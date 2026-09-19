import type { FastifyInstance } from 'fastify';
import { loadConfig, loadEnvFiles } from './config.js';
import { buildApp } from './app.js';
import { createRedis, type PurchaseRedis } from './redis/client.js';
import { seedSale } from './redis/seed.js';

loadEnvFiles();

const config = loadConfig();

let app: FastifyInstance | undefined;
let redis: PurchaseRedis | undefined;
let shuttingDown = false;

async function main(): Promise<void> {
  redis = await createRedis(config.redisUrl);
  await seedSale(redis, config);
  app = await buildApp({ config, redis });
  await app.listen({ port: config.port, host: '0.0.0.0' });
}

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  app?.log.info({ signal }, 'shutting down');
  try {
    if (app) {
      await app.close();
    }
    await redis?.quit();
  } finally {
    process.exit(0);
  }
}

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
