import React, { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRenegotiateDebt } from '@/hooks/useDebtMutations';

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(),
}));

const logSafeErrorMock = vi.hoisted(() => vi.fn());
const toastMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase', () => ({
  supabase: supabaseMock,
  logSafeError: logSafeErrorMock,
}));

vi.mock('@/components/ui/use-toast', () => ({
  toast: toastMock,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/hooks/useFinanceStore', () => ({
  useFinanceStore: () => ({
    categories: [{ id: 'cat-reneg', name: 'Renegociação' }],
  }),
}));

function chain(overrides: Record<string, unknown> = {}) {
  const builder: Record<string, any> = {};
  builder.update = vi.fn(() => builder);
  builder.insert = vi.fn(async () => ({ error: null }));
  builder.eq = vi.fn(() => builder);
  builder.is = vi.fn(() => builder);
  Object.assign(builder, overrides);
  return builder;
}

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

describe('useDebtMutations - useRenegotiateDebt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('envia start_date em snake_case ao atualizar a divida renegociada', async () => {
    const debtUpdate = chain({
      eq: vi.fn(async () => ({ error: null })),
    });
    const cleanupTransactions = chain({
      is: vi.fn(async () => ({ error: null })),
    });
    const insertTransactions = chain({
      insert: vi.fn(async () => ({ error: null })),
    });

    supabaseMock.from
      .mockReturnValueOnce(debtUpdate)
      .mockReturnValueOnce(cleanupTransactions)
      .mockReturnValueOnce(insertTransactions);

    const { result } = renderHook(() => useRenegotiateDebt(), { wrapper });

    await result.current.mutateAsync({
      debt: {
        id: 'debt-1',
        userId: 'user-1',
        name: 'Acordo banco',
        totalAmount: 1200,
        remainingAmount: 1200,
        installmentAmount: 300,
        interestRateMonthly: 0,
        startDate: '2026-04-10',
        totalInstallments: 2,
        status: 'active',
      },
      firstInstallmentDate: '2026-05-15',
    });

    expect(supabaseMock.from).toHaveBeenNthCalledWith(1, 'debts');
    expect(debtUpdate.update).toHaveBeenCalledWith({
      status: 'renegotiated',
      start_date: '2026-05-15',
    });
    expect(debtUpdate.update).not.toHaveBeenCalledWith(expect.objectContaining({
      startDate: '2026-05-15',
    }));
    expect(debtUpdate.eq).toHaveBeenCalledWith('id', 'debt-1');

    expect(supabaseMock.from).toHaveBeenNthCalledWith(2, 'transactions');
    expect(cleanupTransactions.update).toHaveBeenCalledWith({ deleted_at: expect.any(String) });
    expect(cleanupTransactions.eq).toHaveBeenCalledWith('debt_id', 'debt-1');
    expect(cleanupTransactions.eq).toHaveBeenCalledWith('is_paid', false);
    expect(cleanupTransactions.is).toHaveBeenCalledWith('deleted_at', null);

    expect(supabaseMock.from).toHaveBeenNthCalledWith(3, 'transactions');
    expect(insertTransactions.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        user_id: 'user-1',
        debt_id: 'debt-1',
        amount: 300,
        date: '2026-05-15',
        category_id: 'cat-reneg',
        installment_number: 1,
        installment_total: 2,
      }),
      expect.objectContaining({
        user_id: 'user-1',
        debt_id: 'debt-1',
        amount: 300,
        date: '2026-06-15',
        category_id: 'cat-reneg',
        installment_number: 2,
        installment_total: 2,
      }),
    ]);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
