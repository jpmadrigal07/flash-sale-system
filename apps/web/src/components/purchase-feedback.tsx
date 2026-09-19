import { PurchaseCode, type PurchaseResponse, type SaleStatus } from '@flash-sale/shared';

const MESSAGE_BY_CODE: Record<PurchaseCode, string> = {
  [PurchaseCode.SUCCESS]: 'Item secured',
  [PurchaseCode.SALE_NOT_STARTED]: 'The sale has not started yet',
  [PurchaseCode.SALE_ENDED]: 'The sale has ended',
  [PurchaseCode.ALREADY_PURCHASED]: 'You have already purchased',
  [PurchaseCode.SOLD_OUT]: 'Sold out',
  [PurchaseCode.NOT_CONFIGURED]: 'Sale is not configured',
};

const CODE_BY_ERROR: Record<string, PurchaseCode> = {
  SALE_NOT_STARTED: PurchaseCode.SALE_NOT_STARTED,
  SALE_ENDED: PurchaseCode.SALE_ENDED,
  ALREADY_PURCHASED: PurchaseCode.ALREADY_PURCHASED,
  SOLD_OUT: PurchaseCode.SOLD_OUT,
  NOT_CONFIGURED: PurchaseCode.NOT_CONFIGURED,
};

interface PurchaseFeedbackProps {
  result: PurchaseResponse | undefined;
  error: Error | null;
  alreadyPurchased: boolean;
  saleStatus: SaleStatus | undefined;
  remainingStock: number;
}

function toneFor(error: string | undefined): string {
  if (error === undefined) {
    return 'success';
  }
  if (error === 'ALREADY_PURCHASED') {
    return 'neutral';
  }
  return 'error';
}

export function PurchaseFeedback({
  result,
  error,
  alreadyPurchased,
  saleStatus,
  remainingStock,
}: PurchaseFeedbackProps) {
  if (error) {
    return <p className="purchase-feedback error">Something went wrong. Please try again.</p>;
  }

  if (result?.success) {
    return <p className="purchase-feedback success">{MESSAGE_BY_CODE[PurchaseCode.SUCCESS]}</p>;
  }

  if (result && !result.success) {
    const code = CODE_BY_ERROR[result.error];
    const message =
      result.error === 'INVALID_REQUEST'
        ? 'Invalid user identifier'
        : result.message || (code !== undefined ? MESSAGE_BY_CODE[code] : result.error);
    return <p className={`purchase-feedback ${toneFor(result.error)}`}>{message}</p>;
  }

  if (alreadyPurchased) {
    return (
      <p className="purchase-feedback neutral">{MESSAGE_BY_CODE[PurchaseCode.ALREADY_PURCHASED]}</p>
    );
  }

  if (saleStatus === 'upcoming') {
    return (
      <p className="purchase-feedback error">{MESSAGE_BY_CODE[PurchaseCode.SALE_NOT_STARTED]}</p>
    );
  }

  if (saleStatus === 'ended') {
    return <p className="purchase-feedback error">{MESSAGE_BY_CODE[PurchaseCode.SALE_ENDED]}</p>;
  }

  if (saleStatus === 'active' && remainingStock <= 0) {
    return <p className="purchase-feedback error">{MESSAGE_BY_CODE[PurchaseCode.SOLD_OUT]}</p>;
  }

  return null;
}
