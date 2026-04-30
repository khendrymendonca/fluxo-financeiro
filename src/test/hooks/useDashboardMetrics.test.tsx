import React, { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';

const useCategoriesMock = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useFinanceQueries', () => ({
  useCategories: useCategoriesMock,
}));

function wrapper({ children }: PropsWithChildren) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('useDashboardMetrics - categoria de acordo', () => {
  it('agrupa pagamento de acordo como Acordo e nao como Sem Categoria', () => {
    useCategoriesMock.mockReturnValue({ data: [] });

    const { result } = renderHook(
      () => useDashboardMetrics(new Date(2026, 3, 15), [
        {
          id: 'tx-debt-1',
          userId: 'user-1',
          description: 'Acordo banco (1/3)',
          amount: 120,
          type: 'expense',
          transactionType: 'installment',
          date: '2026-04-10',
          isPaid: true,
          debtId: 'debt-1',
        },
      ]),
      { wrapper }
    );

    expect(result.current.categoryExpenses).toEqual([
      { name: 'Acordo', value: 120 },
    ]);
    expect(result.current.categoryExpenses.find((item) => item.name === 'Sem Categoria')).toBeUndefined();
  });
});
