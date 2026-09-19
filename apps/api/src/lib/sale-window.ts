import type { SaleStatus } from '@flash-sale/shared';

export function deriveSaleStatus(
  nowMs: number,
  startTimeMs: number,
  endTimeMs: number,
): SaleStatus {
  if (nowMs < startTimeMs) {
    return 'upcoming';
  }
  if (nowMs >= endTimeMs) {
    return 'ended';
  }
  return 'active';
}
