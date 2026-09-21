import type { MyPurchaseResponse, PurchaseResponse, SaleStatusResponse } from '@flash-sale/shared';

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export async function fetchSaleStatus(): Promise<SaleStatusResponse> {
  const response = await fetch('/api/sale/status', {
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) {
    throw new Error('Failed to load sale status');
  }
  return readJson<SaleStatusResponse>(response);
}

export async function attemptPurchase(userId: string): Promise<PurchaseResponse> {
  const response = await fetch('/api/sale/purchase', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  return readJson<PurchaseResponse>(response);
}

export async function fetchHasPurchased(userId: string): Promise<MyPurchaseResponse> {
  const response = await fetch(`/api/sale/purchase/${encodeURIComponent(userId)}`);
  if (!response.ok) {
    throw new Error('Failed to load purchase status');
  }
  return readJson<MyPurchaseResponse>(response);
}
