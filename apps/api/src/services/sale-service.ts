import { PurchaseCode, type MyPurchaseResponse, type SaleStatusResponse } from '@flash-sale/shared';
import { SALE_KEYS } from '../redis/keys.js';
import { attemptPurchaseScript, type PurchaseRedis } from '../redis/client.js';
import { deriveSaleStatus } from '../lib/sale-window.js';
import {
  isPurchaseCode,
  mapPurchaseResult,
  type MappedPurchaseResult,
} from '../lib/result-codes.js';

export class SaleService {
  public constructor(private readonly redis: PurchaseRedis) {}

  public async attemptPurchase(userId: string, nowMs = Date.now()): Promise<MappedPurchaseResult> {
    const [code, remainingStock] = await attemptPurchaseScript(this.redis, userId, nowMs);
    if (!isPurchaseCode(code)) {
      throw new Error(`Unknown purchase code: ${code}`);
    }
    return mapPurchaseResult(code, userId, remainingStock);
  }

  public async getStatus(nowMs = Date.now()): Promise<SaleStatusResponse> {
    const pipeline = this.redis.pipeline();
    pipeline.hmget(SALE_KEYS.config, 'startTime', 'endTime', 'totalStock');
    pipeline.get(SALE_KEYS.stock);
    const results = await pipeline.exec();

    if (!results) {
      throw new Error('Failed to read sale status');
    }

    const configReply = results[0];
    const stockReply = results[1];
    if (!configReply || !stockReply) {
      throw new Error('Failed to read sale status');
    }

    const [configErr, configValue] = configReply;
    const [stockErr, stockValue] = stockReply;
    if (configErr) {
      throw configErr;
    }
    if (stockErr) {
      throw stockErr;
    }

    const [startRaw, endRaw, totalRaw] = configValue as Array<string | null>;
    const startTimeMs = parseRequiredNumber(startRaw);
    const endTimeMs = parseRequiredNumber(endRaw);
    const totalStock = parseRequiredNumber(totalRaw);

    if (startTimeMs === null || endTimeMs === null || totalStock === null) {
      throw Object.assign(new Error('Sale is not configured'), {
        code: PurchaseCode.NOT_CONFIGURED,
      });
    }

    const remainingStock = Number(stockValue ?? 0);

    return {
      status: deriveSaleStatus(nowMs, startTimeMs, endTimeMs),
      startTime: new Date(startTimeMs).toISOString(),
      endTime: new Date(endTimeMs).toISOString(),
      totalStock,
      remainingStock: Number.isFinite(remainingStock) ? remainingStock : 0,
      serverTime: new Date(nowMs).toISOString(),
    };
  }

  public async hasPurchased(userId: string): Promise<MyPurchaseResponse> {
    const purchased = await this.redis.sismember(SALE_KEYS.purchasers, userId);
    return { userId, purchased: Number(purchased) === 1 };
  }
}

function parseRequiredNumber(raw: string | null | undefined): number | null {
  // Number(null) === 0, so a missing hash field must be rejected before coerce.
  if (raw == null || raw === '') {
    return null;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}
