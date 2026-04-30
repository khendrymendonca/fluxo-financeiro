import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReportsDashboard from '@/pages/ReportsDashboard';

const financeStoreMock = vi.hoisted(() => ({
  useFinanceStore: vi.fn(),
}));

vi.mock('@/hooks/useFinanceStore', () => financeStoreMock);

describe('ReportsDashboard - categoria de acordo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
  });

  it('exibe Acordo em vez de Outros para transacao com debtId e monta o mapa anual por categoria', () => {
    financeStoreMock.useFinanceStore.mockReturnValue({
      transactions: [
        {
          id: 'tx-debt-1',
          userId: 'user-1',
          description: 'Parcela acordo',
          amount: 120,
          type: 'expense',
          transactionType: 'installment',
          date: '2026-04-10',
          isPaid: true,
          isVirtual: false,
          isInvoicePayment: false,
          isTransfer: false,
          debtId: 'debt-1',
          categoryId: null,
          accountId: 'acc-1',
        },
      ],
      categories: [],
      accounts: [
        {
          id: 'acc-1',
          name: 'Conta teste',
          balance: 1000,
        },
      ],
      viewDate: new Date(2026, 3, 15),
      setViewDate: vi.fn(),
    });

    render(<ReportsDashboard />);

    expect(screen.getAllByText('Acordo').length).toBeGreaterThan(0);
    expect(screen.queryByText('Outros')).not.toBeInTheDocument();
    expect(screen.getByText('Mapa anual por categoria')).toBeInTheDocument();
    expect(screen.getAllByText('Despesas').length).toBeGreaterThan(0);
  });
});
