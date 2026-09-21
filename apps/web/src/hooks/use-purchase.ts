import { useCallback, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { attemptPurchase, fetchHasPurchased } from '../api/client';

export function usePurchase() {
  const queryClient = useQueryClient();
  const inFlightRef = useRef(false);
  const [securedUserId, setSecuredUserId] = useState<string | null>(null);

  const {
    mutate: runPurchase,
    reset: resetMutation,
    ...mutation
  } = useMutation({
    mutationFn: attemptPurchase,
    retry: 0, // explicit: a retried purchase POST is a duplicate attempt
    onSuccess: (data, userId) => {
      if (data.success) {
        setSecuredUserId(userId);
      }
    },
    onSettled: () => {
      inFlightRef.current = false;
      void queryClient.invalidateQueries({ queryKey: ['sale-status'] });
      void queryClient.invalidateQueries({ queryKey: ['has-purchased'] });
    },
  });

  const mutate = useCallback(
    (userId: string) => {
      // Sync lock: purchase.isPending only flips after React re-renders, so a
      // native double-click can otherwise fire two POSTs.
      if (inFlightRef.current) {
        return;
      }
      inFlightRef.current = true;
      runPurchase(userId);
    },
    [runPurchase],
  );

  const reset = useCallback(() => {
    inFlightRef.current = false;
    setSecuredUserId(null);
    resetMutation();
  }, [resetMutation]);

  return { ...mutation, mutate, reset, securedUserId };
}

export function useHasPurchased(userId: string) {
  return useQuery({
    queryKey: ['has-purchased', userId],
    queryFn: () => fetchHasPurchased(userId),
    enabled: userId.length > 0,
    retry: 0, // a 400 from a malformed identifier is not a transient failure
  });
}
