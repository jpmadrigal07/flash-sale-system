import { PurchaseCode } from '@flash-sale/shared';
import { describe, expect, it } from 'vitest';
import {
  mapPurchaseResult,
  PURCHASE_ERROR,
  PURCHASE_HTTP_STATUS,
  PURCHASE_MESSAGE,
} from '../../src/lib/result-codes.js';

const numericCodes = Object.values(PurchaseCode).filter(
  (value): value is PurchaseCode => typeof value === 'number',
);

describe('mapPurchaseResult', () => {
  it('maps every PurchaseCode to the specified HTTP status and error string', () => {
    const expectedStatus: Record<PurchaseCode, number> = {
      [PurchaseCode.SUCCESS]: 201,
      [PurchaseCode.SALE_NOT_STARTED]: 403,
      [PurchaseCode.SALE_ENDED]: 403,
      [PurchaseCode.ALREADY_PURCHASED]: 409,
      [PurchaseCode.SOLD_OUT]: 409,
      [PurchaseCode.NOT_CONFIGURED]: 503,
    };

    for (const code of numericCodes) {
      const mapped = mapPurchaseResult(code, 'alice@example.com', 7);
      expect(mapped.statusCode).toBe(expectedStatus[code]);
      expect(mapped.statusCode).toBe(PURCHASE_HTTP_STATUS[code]);

      if (code === PurchaseCode.SUCCESS) {
        expect(mapped.body).toEqual({
          success: true,
          userId: 'alice@example.com',
          remainingStock: 7,
        });
      } else {
        expect(mapped.body).toEqual({
          success: false,
          error: PURCHASE_ERROR[code],
          message: PURCHASE_MESSAGE[code],
        });
      }
    }

    expect(numericCodes).toHaveLength(6);
  });
});
