import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import type { AppConfig } from './config.js';
import type { PurchaseRedis } from './redis/client.js';
import { registerHealthRoute } from './routes/health-route.js';
import { registerSaleRoutes } from './routes/sale-route.js';
import { SaleService } from './services/sale-service.js';

export interface AppDeps {
  config: AppConfig;
  redis: PurchaseRedis;
}

export async function buildApp(
  deps: AppDeps,
  options?: { logger?: boolean },
): Promise<FastifyInstance> {
  const app = Fastify({ logger: options?.logger ?? true });
  const saleService = new SaleService(deps.redis);

  await app.register(cors, { origin: deps.config.corsOrigin });

  registerHealthRoute(app, deps.redis);
  await registerSaleRoutes(app, saleService);

  app.setErrorHandler((error: FastifyError, _request, reply) => {
    if (error.validation) {
      return reply.code(400).send({
        success: false,
        error: 'INVALID_REQUEST',
        message: 'Invalid request',
      });
    }

    if (isRedisUnavailable(error)) {
      return reply.code(503).send({
        success: false,
        error: 'UNAVAILABLE',
        message: 'Service temporarily unavailable',
      });
    }

    app.log.error(error);
    return reply.code(500).send({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Internal server error',
    });
  });

  return app;
}

function isRedisUnavailable(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const err = error as { name?: string; message?: string; code?: string };
  if (err.name === 'MaxRetriesPerRequestError') {
    return true;
  }
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
    return true;
  }
  const message = err.message ?? '';
  return (
    message.includes('ECONNREFUSED') ||
    message.includes('Connection is closed') ||
    message.includes("Stream isn't writeable") ||
    message.includes('connect ECONNREFUSED')
  );
}
