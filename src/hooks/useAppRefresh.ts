import { useCallback } from 'react';
import { QueryClient, useQueryClient } from '@tanstack/react-query';

export const FINANCE_REFRESH_QUERY_KEYS = [
  ['accounts'],
  ['transactions'],
  ['credit-cards'],
  ['categories'],
  ['subcategories'],
  ['category-groups'],
  ['debts'],
  ['savings-goals'],
] as const;

export async function refreshFinanceData(queryClient: QueryClient) {
  const results = await Promise.allSettled(
    FINANCE_REFRESH_QUERY_KEYS.map((queryKey) =>
      queryClient.refetchQueries({ queryKey, type: 'all' })
    )
  );

  const failed = results.find((result) => result.status === 'rejected');
  if (failed?.status === 'rejected') {
    throw failed.reason;
  }
}

export function useAppRefresh() {
  const queryClient = useQueryClient();

  return useCallback(() => refreshFinanceData(queryClient), [queryClient]);
}
