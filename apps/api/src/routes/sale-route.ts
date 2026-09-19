import type { FastifyInstance } from 'fastify';
import { PurchaseCode } from '@flash-sale/shared';
import { myPurchaseSchema, purchaseSchema, statusSchema } from '../schemas/sale-schema.js';
import { SaleService } from '../services/sale-service.js';
import { mapPurchaseResult } from '../lib/result-codes.js';

interface PurchaseBody {
  userId: string;
}

interface MyPurchaseParams {
  userId: string;
}

export async function registerSaleRoutes(
  app: FastifyInstance,
  service: SaleService,
): Promise<void> {
  app.get('/api/sale/status', { schema: statusSchema }, async (_request, reply) => {
    try {
      return await service.getStatus();
    } catch (error) {
      if (isNotConfigured(error)) {
        const mapped = mapPurchaseResult(PurchaseCode.NOT_CONFIGURED, '', -1);
        return reply.code(503).send(mapped.body);
      }
      throw error;
    }
  });

  app.post<{ Body: PurchaseBody }>(
    '/api/sale/purchase',
    { schema: purchaseSchema },
    async (request, reply) => {
      const result = await service.attemptPurchase(request.body.userId);
      return reply.code(result.statusCode as 201 | 400 | 403 | 409 | 503).send(result.body);
    },
  );

  app.get<{ Params: MyPurchaseParams }>(
    '/api/sale/purchase/:userId',
    { schema: myPurchaseSchema },
    async (request) => {
      return service.hasPurchased(request.params.userId);
    },
  );
}

function isNotConfigured(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === PurchaseCode.NOT_CONFIGURED
  );
}
