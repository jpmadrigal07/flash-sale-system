import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { attemptPurchase, fetchHasPurchased } from '../api/client';

export function usePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: attemptPurchase,
    retry: 0, // explicit: a retried purchase POST is a duplicate attempt
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['sale-status'] });
      void queryClient.invalidateQueries({ queryKey: ['has-purchased'] });
    },
  });
}

export function useHasPurchased(userId: string) {
  return useQuery({
    queryKey: ['has-purchased', userId],
    queryFn: () => fetchHasPurchased(userId),
    enabled: userId.length > 0,
    retry: 0, // a 400 from a malformed identifier is not a transient failure
  });
}
