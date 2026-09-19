import type { FastifyInstance } from 'fastify';
import type { PurchaseRedis } from '../redis/client.js';

export function registerHealthRoute(app: FastifyInstance, redis: PurchaseRedis): void {
  app.get('/health', async (_request, reply) => {
    try {
      await redis.ping();
      return { status: 'ok', redis: 'connected' };
    } catch {
      return reply.code(503).send({ status: 'error', redis: 'disconnected' });
    }
  });
}
