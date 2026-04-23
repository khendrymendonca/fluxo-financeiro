import React, { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BillsManager } from '@/components/accounts/BillsManager';

const financeStoreMock = vi.hoisted(() => ({
  useFinanceStore: vi.fn(),
}));

vi.mock('@/hooks/useFinanceStore', () => financeStoreMock);

vi.mock('@/hooks/useTransactionMutations', () => ({
  useUpdateTransaction: () => ({ mutateAsync: vi.fn() }),
  useDeleteTransaction: () => ({ mutateAsync: vi.fn() }),
  useAddTransaction: () => ({ mutateAsync: vi.fn() }),
  useToggleTransactionPaid: () => ({ mutateAsync: vi.fn() }),
  useBulkUpdateTransactions: () => ({ mutateAsync: vi.fn() }),
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

describe('BillsManager - contas pendentes', () => {
  it('exibe contas pendentes atrasadas junto das contas do mes atual', () => {
    financeStoreMock.useFinanceStore.mockReturnValue({
      categories: [],
      accounts: [],
      creditCards: [],
      debts: [],
      viewDate: new Date(2026, 3, 15),
      currentMonthTransactions: [],
      transactions: [
        {
          id: 'bill-overdue',
          description: 'Internet atrasada',
          amount: 120,
          date: '2026-03-10',
          type: 'expense',
          isRecurring: true,
          transactionType: 'recurring',
          isPaid: false,
          isVirtual: false,
          originalId: null,
          cardId: null,
          isInvoicePayment: false,
        },
        {
          id: 'bill-current',
          description: 'Aluguel do mes',
          amount: 900,
          date: '2026-04-10',
          type: 'expense',
          isRecurring: true,
          transactionType: 'recurring',
          isPaid: false,
          isVirtual: false,
          originalId: null,
          cardId: null,
          isInvoicePayment: false,
        },
      ],
    });

    render(<BillsManager />, { wrapper });

    expect(screen.getByText('Internet atrasada')).toBeInTheDocument();
    expect(screen.getByText('Aluguel do mes')).toBeInTheDocument();
  });
});
