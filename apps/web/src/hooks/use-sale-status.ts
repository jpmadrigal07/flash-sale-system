import { useQuery } from '@tanstack/react-query';
import { fetchSaleStatus } from '../api/client';

export function useSaleStatus() {
  return useQuery({
    queryKey: ['sale-status'],
    queryFn: fetchSaleStatus,
    retry: 0,
    refetchInterval: (query) => (query.state.data?.status === 'ended' ? false : 2000),
  });
}
