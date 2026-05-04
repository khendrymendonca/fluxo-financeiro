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

  it('nao soma compra no cartao nem transferencia como despesa efetiva, mas soma pagamento de fatura', () => {
    useCategoriesMock.mockReturnValue({ data: [] });

    const { result } = renderHook(
      () => useDashboardMetrics(new Date(2026, 3, 15), [
        {
          id: 'income-1',
          userId: 'user-1',
          description: 'Salario',
          amount: 3000,
          type: 'income',
          transactionType: 'punctual',
          date: '2026-04-05',
          isPaid: true,
        },
        {
          id: 'card-purchase-1',
          userId: 'user-1',
          description: 'Notebook',
          amount: 900,
          type: 'expense',
          transactionType: 'installment',
          date: '2026-04-05',
          isPaid: false,
          cardId: 'card-1',
          installmentGroupId: 'group-card-1',
          invoiceMonthYear: '2026-04',
        },
        {
          id: 'invoice-payment-1',
          userId: 'user-1',
          description: 'Pagamento fatura abril',
          amount: 900,
          type: 'expense',
          transactionType: 'punctual',
          date: '2026-04-25',
          isPaid: true,
          cardId: 'card-1',
          isInvoicePayment: true,
          invoiceMonthYear: '2026-04',
        },
        {
          id: 'wallet-expense-1',
          userId: 'user-1',
          description: 'Mercado',
          amount: 250,
          type: 'expense',
          transactionType: 'punctual',
          date: '2026-04-12',
          isPaid: true,
          accountId: 'acc-1',
        },
        {
          id: 'transfer-1',
          userId: 'user-1',
          description: 'Transferencia',
          amount: 100,
          type: 'expense',
          transactionType: 'punctual',
          date: '2026-04-14',
          isPaid: true,
          isTransfer: true,
        },
      ]),
      { wrapper }
    );

    expect(result.current.cashflow.totalIncome).toBe(3000);
    expect(result.current.cashflow.totalExpenses).toBe(1150);
    expect(result.current.cashflow.balance).toBe(1850);
  });
});
