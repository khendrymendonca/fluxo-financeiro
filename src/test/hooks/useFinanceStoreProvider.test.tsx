import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FinanceProvider, useFinanceStore } from '@/hooks/useFinanceStore';

const mutationStub = vi.hoisted(() => () => ({
  mutateAsync: vi.fn(),
  mutate: vi.fn(),
  isPending: false,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
  logSafeError: vi.fn(),
  logSupabaseError: vi.fn(),
}));

vi.mock('@/components/ui/use-toast', () => ({
  toast: vi.fn(),
}));

vi.mock('@/hooks/useFinanceQueries', () => ({
  useAccounts: () => ({ data: [], isLoading: false }),
  useTransactions: () => ({ data: [], isLoading: false }),
  useCreditCards: () => ({ data: [], isLoading: false }),
  useCategories: () => ({ data: [], isLoading: false }),
  useSubcategories: () => ({ data: [], isLoading: false }),
  useCategoryGroups: () => ({ data: [], isLoading: false }),
  useDebts: () => ({ data: [], isLoading: false }),
  useSavingsGoals: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/hooks/useProjectedTransactions', () => ({
  useProjectedTransactions: (transactions: unknown[]) => transactions,
}));

vi.mock('@/hooks/useTransactionMutations', () => ({
  useAddTransaction: mutationStub,
  useUpdateTransaction: mutationStub,
  useDeleteTransaction: mutationStub,
  useToggleTransactionPaid: mutationStub,
  useBulkDeleteTransactions: mutationStub,
}));

vi.mock('@/hooks/useAccountMutations', () => ({
  useAddAccount: mutationStub,
  useUpdateAccount: mutationStub,
  useDeleteAccount: mutationStub,
  useTransferBetweenAccounts: mutationStub,
}));

vi.mock('@/hooks/useCreditCardMutations', () => ({
  useAddCreditCard: mutationStub,
  useUpdateCreditCard: mutationStub,
  useDeleteCreditCard: mutationStub,
}));

vi.mock('@/hooks/useGoalMutations', () => ({
  useAddGoal: mutationStub,
  useUpdateGoal: mutationStub,
  useDeleteGoal: mutationStub,
  useDepositToGoal: mutationStub,
}));

function Consumer() {
  const store = useFinanceStore();
  return <div data-testid="finance-provider-mounted">{store.creditCards.length}</div>;
}

describe('FinanceProvider', () => {
  it('monta com useDebtMutations reais sem ciclo de useFinanceStore', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <FinanceProvider>
          <Consumer />
        </FinanceProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByTestId('finance-provider-mounted')).toHaveTextContent('0');
  });
});
