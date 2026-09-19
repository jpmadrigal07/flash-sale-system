import { PurchaseCode, type PurchaseResponse } from '@flash-sale/shared';

export const PURCHASE_HTTP_STATUS: Record<PurchaseCode, number> = {
  [PurchaseCode.SUCCESS]: 201,
  [PurchaseCode.SALE_NOT_STARTED]: 403,
  [PurchaseCode.SALE_ENDED]: 403,
  [PurchaseCode.ALREADY_PURCHASED]: 409,
  [PurchaseCode.SOLD_OUT]: 409,
  [PurchaseCode.NOT_CONFIGURED]: 503,
};

export const PURCHASE_ERROR: Record<Exclude<PurchaseCode, PurchaseCode.SUCCESS>, string> = {
  [PurchaseCode.SALE_NOT_STARTED]: 'SALE_NOT_STARTED',
  [PurchaseCode.SALE_ENDED]: 'SALE_ENDED',
  [PurchaseCode.ALREADY_PURCHASED]: 'ALREADY_PURCHASED',
  [PurchaseCode.SOLD_OUT]: 'SOLD_OUT',
  [PurchaseCode.NOT_CONFIGURED]: 'NOT_CONFIGURED',
};

export const PURCHASE_MESSAGE: Record<PurchaseCode, string> = {
  [PurchaseCode.SUCCESS]: 'Item secured',
  [PurchaseCode.SALE_NOT_STARTED]: 'The sale has not started yet',
  [PurchaseCode.SALE_ENDED]: 'The sale has ended',
  [PurchaseCode.ALREADY_PURCHASED]: 'You have already purchased',
  [PurchaseCode.SOLD_OUT]: 'Sold out',
  [PurchaseCode.NOT_CONFIGURED]: 'Sale is not configured',
};

export interface MappedPurchaseResult {
  statusCode: number;
  body: PurchaseResponse;
}

export function mapPurchaseResult(
  code: PurchaseCode,
  userId: string,
  remainingStock: number,
): MappedPurchaseResult {
  if (code === PurchaseCode.SUCCESS) {
    return {
      statusCode: PURCHASE_HTTP_STATUS[code],
      body: {
        success: true,
        userId,
        remainingStock,
      },
    };
  }

  return {
    statusCode: PURCHASE_HTTP_STATUS[code],
    body: {
      success: false,
      error: PURCHASE_ERROR[code],
      message: PURCHASE_MESSAGE[code],
    },
  };
}

export function isPurchaseCode(value: number): value is PurchaseCode {
  return Object.values(PurchaseCode).includes(value as PurchaseCode);
}
