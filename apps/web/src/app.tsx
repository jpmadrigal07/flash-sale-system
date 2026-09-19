import { useEffect, useState } from 'react';
import { BuyButton } from './components/buy-button';
import { PurchaseFeedback } from './components/purchase-feedback';
import { SaleStatus } from './components/sale-status';
import { UserIdentifierInput } from './components/user-identifier-input';
import { useHasPurchased, usePurchase } from './hooks/use-purchase';
import { useSaleStatus } from './hooks/use-sale-status';

const STORAGE_KEY = 'flash-sale:userId';

function readStoredUserId(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function App() {
  const [userId, setUserId] = useState(readStoredUserId);
  const statusQuery = useSaleStatus();
  const hasPurchasedQuery = useHasPurchased(userId);
  const purchase = usePurchase();

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, userId);
    } catch {
      // ignore storage failures
    }
  }, [userId]);

  useEffect(() => {
    purchase.reset();
    // Intentionally keyed on userId only: a previous user's mutation
    // result must not disable Buy or linger as feedback.
  }, [userId]);

  const status = statusQuery.data?.status;
  const remainingStock = statusQuery.data?.remainingStock ?? 0;
  const resultForUser = purchase.variables === userId ? purchase.data : undefined;
  const errorForUser = purchase.variables === userId ? purchase.error : null;
  const purchasedThisSession = resultForUser?.success === true;
  const alreadyPurchased = hasPurchasedQuery.data?.purchased === true || purchasedThisSession;
  const saleInactive = status !== 'active';
  const soldOut = remainingStock <= 0;
  const disabled =
    userId.length === 0 || saleInactive || soldOut || purchase.isPending || alreadyPurchased;

  return (
    <main className="app">
      <h1>Flash Sale</h1>
      <p>One product. Limited stock. One item per user.</p>
      <SaleStatus
        data={statusQuery.data}
        dataUpdatedAt={statusQuery.dataUpdatedAt}
        isLoading={statusQuery.isLoading}
        error={statusQuery.error}
      />
      <UserIdentifierInput value={userId} onChange={setUserId} />
      <BuyButton
        disabled={disabled}
        pending={purchase.isPending}
        onClick={() => purchase.mutate(userId)}
      />
      <PurchaseFeedback
        result={resultForUser}
        error={errorForUser}
        alreadyPurchased={hasPurchasedQuery.data?.purchased === true && !resultForUser}
        saleStatus={status}
        remainingStock={remainingStock}
      />
    </main>
  );
}
