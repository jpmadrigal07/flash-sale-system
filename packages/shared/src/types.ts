export type SaleStatus = 'upcoming' | 'active' | 'ended';

export interface SaleStatusResponse {
  status: SaleStatus;
  startTime: string;
  endTime: string;
  totalStock: number;
  remainingStock: number;
  serverTime: string;
}

export interface PurchaseRequest {
  userId: string;
}

export interface PurchaseSuccessResponse {
  success: true;
  userId: string;
  remainingStock: number;
}

export interface PurchaseFailureResponse {
  success: false;
  error: string;
  message: string;
}

export type PurchaseResponse = PurchaseSuccessResponse | PurchaseFailureResponse;

export interface MyPurchaseResponse {
  userId: string;
  purchased: boolean;
}

export interface HealthResponse {
  status: 'ok' | 'error';
  redis: 'connected' | 'disconnected';
}
