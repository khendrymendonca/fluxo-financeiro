import React, { PropsWithChildren, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor, within, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Transaction } from '@/types/finance';

const financeStoreState = {
  categories: [{ id: 'cat-1', name: 'Moradia' }],
  accounts: [
    {
      id: 'acc-1',
      name: 'Conta teste',
      bank: 'Banco A',
      institution: 'Banco A',
      balance: 0,
      color: '#111111',
      accountType: 'corrente',
      hasOverdraft: true,
      overdraftLimit: 110,
    },
  ],
  creditCards: [],
  viewDate: new Date(2026, 3, 15),
  isSelectionMode: false,
  selectedIds: new Set(),
  toggleSelectionMode: vi.fn(),
  toggleSelectId: vi.fn(),
  clearSelection: vi.fn(),
  deleteTransaction: vi.fn(),
  bulkDeleteTransactions: vi.fn(),
  isDeletingTransaction: false,
  isBulkDeleting: false,
};

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

function buildPayingItem(amount: number): Transaction {
  return {
    id: `tx-${amount}`,
    userId: 'user-1',
    description: `Despesa ${amount}`,
    amount,
    type: 'expense',
    transactionType: 'punctual',
    date: '2026-04-10',
    isPaid: false,
    accountId: undefined,
    cardId: undefined,
    categoryId: 'cat-1',
  };
}

async function renderTransactionListWithOpenPayment(amount: number, onPayBill: ReturnType<typeof vi.fn>) {
  vi.resetModules();

  vi.doMock('react', async () => {
    const actual = await vi.importActual<typeof import('react')>('react');
    let callIndex = 0;

    const mockedUseState: typeof actual.useState = (initial) => {
      callIndex += 1;
      if (callIndex === 5) {
        return [buildPayingItem(amount), vi.fn()];
      }
      return actual.useState(initial);
    };

    return {
      ...actual,
      default: { ...actual, useState: mockedUseState },
      useState: mockedUseState,
    };
  });

  vi.doMock('@/hooks/useFinanceStore', () => ({
    useFinanceStore: () => financeStoreState,
  }));

  vi.doMock('@/hooks/useTransactionMutations', () => ({
    useToggleTransactionPaid: () => ({ mutateAsync: vi.fn() }),
  }));

  vi.doMock('@/components/ui/use-toast', () => ({
    toast: vi.fn(),
  }));

  const { TransactionList } = await import('@/components/transactions/TransactionList');

  const view = render(
    <TransactionList
      transactions={[]}
      onEdit={vi.fn()}
      onPayBill={onPayBill}
    />,
    { wrapper }
  );

  return {
    ...view,
    cleanupMocks: () => {
      vi.doUnmock('react');
      vi.doUnmock('@/hooks/useFinanceStore');
      vi.doUnmock('@/hooks/useTransactionMutations');
      vi.doUnmock('@/components/ui/use-toast');
    },
  };
}

describe('TransactionList - fluxo interno de pagamento', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.assign(financeStoreState, {
      toggleSelectionMode: vi.fn(),
      toggleSelectId: vi.fn(),
      clearSelection: vi.fn(),
      deleteTransaction: vi.fn(),
      bulkDeleteTransactions: vi.fn(),
    });
  });

  it('permite pagamento com saldo projetado em -110, mantendo saldo atual em destaque e chamando onPayBill', async () => {
    const onPayBill = vi.fn(async () => undefined);
    const { getByText, cleanupMocks } = await renderTransactionListWithOpenPayment(110, onPayBill);

    const accountButton = getByText('Conta teste').closest('button') as HTMLButtonElement;
    expect(accountButton).not.toBeDisabled();

    const scoped = within(accountButton);
    expect(scoped.getByText('R$ 0,00')).toBeInTheDocument();
    expect(scoped.getByText('Saldo atual')).toBeInTheDocument();
    expect(scoped.getByText('Após pagamento: -R$ 110,00')).toBeInTheDocument();
    expect(scoped.getByText('Limite utilizado: R$ 110,00')).toBeInTheDocument();
    expect(scoped.getByText('Limite disponivel: R$ 0,00')).toBeInTheDocument();

    fireEvent.click(accountButton);

    await waitFor(() => {
      expect(onPayBill).toHaveBeenCalledWith(expect.objectContaining({
        id: 'tx-110',
        isPaid: true,
        paymentDate: '2026-04-23',
        accountId: 'acc-1',
        cardId: undefined,
      }));
    });

    cleanupMocks();
  });

  it('permite pagamento acima do overdraftLimit, sem bloqueio residual, e exibe excesso separado', async () => {
    const onPayBill = vi.fn(async () => undefined);
    const { getByText, cleanupMocks } = await renderTransactionListWithOpenPayment(130, onPayBill);

    const accountButton = getByText('Conta teste').closest('button') as HTMLButtonElement;
    expect(accountButton).not.toBeDisabled();

    const scoped = within(accountButton);
    expect(scoped.getByText('R$ 0,00')).toBeInTheDocument();
    expect(scoped.getByText('Saldo atual')).toBeInTheDocument();
    expect(scoped.getByText('Após pagamento: -R$ 130,00')).toBeInTheDocument();
    expect(scoped.getByText('Limite utilizado: R$ 110,00')).toBeInTheDocument();
    expect(scoped.getByText('Limite disponivel: R$ 0,00')).toBeInTheDocument();
    expect(scoped.getByText('Excesso alem do limite: R$ 20,00')).toBeInTheDocument();

    fireEvent.click(accountButton);

    await waitFor(() => {
      expect(onPayBill).toHaveBeenCalledWith(expect.objectContaining({
        id: 'tx-130',
        isPaid: true,
        paymentDate: '2026-04-23',
        accountId: 'acc-1',
        cardId: undefined,
      }));
    });

    cleanupMocks();
  });

  it('mantem item pago recorrente visivel no Extrato/Lancamentos', async () => {
    vi.resetModules();

    vi.doMock('@/hooks/useFinanceStore', () => ({
      useFinanceStore: () => financeStoreState,
    }));

    vi.doMock('@/hooks/useTransactionMutations', () => ({
      useToggleTransactionPaid: () => ({ mutateAsync: vi.fn() }),
    }));

    vi.doMock('@/components/ui/use-toast', () => ({
      toast: vi.fn(),
    }));

    const { TransactionList } = await import('@/components/transactions/TransactionList');

    render(
      <TransactionList
        transactions={[
          {
            id: 'paid-recurring',
            userId: 'user-1',
            description: 'Internet paga',
            amount: 120,
            type: 'expense',
            transactionType: 'recurring',
            date: '2026-04-10',
            paymentDate: '2026-04-10',
            isPaid: true,
            isRecurring: true,
            categoryId: 'cat-1',
            accountId: 'acc-1',
          },
        ]}
        onEdit={vi.fn()}
        onPayBill={vi.fn(async () => undefined)}
      />,
      { wrapper }
    );

    expect(screen.getByText('Internet paga')).toBeInTheDocument();

    vi.doUnmock('@/hooks/useFinanceStore');
    vi.doUnmock('@/hooks/useTransactionMutations');
    vi.doUnmock('@/components/ui/use-toast');
  });

  it('permite editar compra parcelada no cartao pela tela de Lancamentos', async () => {
    vi.resetModules();

    Object.assign(financeStoreState, {
      creditCards: [
        {
          id: 'card-1',
          name: 'Cartao teste',
          bank: 'Banco A',
          institution: 'Banco A',
          color: '#333333',
          limit: 3000,
          dueDay: 10,
          closingDay: 15,
        },
      ],
    });

    vi.doMock('@/hooks/useFinanceStore', () => ({
      useFinanceStore: () => financeStoreState,
    }));

    vi.doMock('@/hooks/useTransactionMutations', () => ({
      useToggleTransactionPaid: () => ({ mutateAsync: vi.fn() }),
    }));

    vi.doMock('@/components/ui/use-toast', () => ({
      toast: vi.fn(),
    }));

    const onEdit = vi.fn();
    const { TransactionList } = await import('@/components/transactions/TransactionList');

    render(
      <TransactionList
        transactions={[
          {
            id: 'inst-card-1',
            userId: 'user-1',
            description: 'Notebook (1/10)',
            amount: 300,
            type: 'expense',
            transactionType: 'installment',
            date: '2026-04-20',
            isPaid: true,
            cardId: 'card-1',
            categoryId: 'cat-1',
            installmentGroupId: 'group-card-1',
            installmentNumber: 1,
            installmentTotal: 10,
            invoiceMonthYear: '2026-05',
          },
        ]}
        onEdit={onEdit}
        onPayBill={vi.fn(async () => undefined)}
      />,
      { wrapper }
    );

    fireEvent.click(screen.getByText('Notebook (1/10)'));

    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({
      id: 'inst-card-1',
      transactionType: 'installment',
      installmentGroupId: 'group-card-1',
      cardId: 'card-1',
    }));
    expect(screen.queryByText('Gestão de Contas')).not.toBeInTheDocument();

    vi.doUnmock('@/hooks/useFinanceStore');
    vi.doUnmock('@/hooks/useTransactionMutations');
    vi.doUnmock('@/components/ui/use-toast');
  });

  it('estorno com sucesso remove filho pago do Extrato', async () => {
    vi.resetModules();

    const toastMock = vi.fn();

    vi.doMock('@/hooks/useFinanceStore', () => ({
      useFinanceStore: () => financeStoreState,
    }));

    vi.doMock('@/hooks/useTransactionMutations', () => ({
      useToggleTransactionPaid: () => ({ mutateAsync: vi.fn() }),
    }));

    vi.doMock('@/components/ui/use-toast', () => ({
      toast: toastMock,
    }));

    const { TransactionList } = await import('@/components/transactions/TransactionList');

    function TestHost() {
      const [items, setItems] = useState<Transaction[]>([
        {
          id: 'child-paid-1',
          userId: 'user-1',
          description: 'Internet paga',
          amount: 120,
          type: 'expense',
          transactionType: 'punctual',
          date: '2026-04-10',
          paymentDate: '2026-04-10',
          isPaid: true,
          originalId: 'mother-1',
          accountId: 'acc-1',
          categoryId: 'cat-1',
        },
      ]);

      return (
        <TransactionList
          transactions={items}
          onEdit={vi.fn()}
          onPayBill={vi.fn(async () => undefined)}
          onUndoPayment={async (item) => {
            setItems((current) =>
              current.map((tx) =>
                tx.id === item.id
                  ? {
                      ...tx,
                      isPaid: false,
                      paymentDate: undefined,
                      accountId: undefined,
                      cardId: undefined,
                      invoiceMonthYear: undefined,
                    }
                  : tx
              )
            );
            toastMock({ title: 'Pagamento estornado com sucesso.' });
          }}
        />
      );
    }

    render(<TestHost />, { wrapper });

    fireEvent.click(screen.getByLabelText('Estornar pagamento'));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith({ title: 'Pagamento estornado com sucesso.' });
    });

    expect(screen.queryByText('Internet paga')).not.toBeInTheDocument();

    vi.doUnmock('@/hooks/useFinanceStore');
    vi.doUnmock('@/hooks/useTransactionMutations');
    vi.doUnmock('@/components/ui/use-toast');
  });
});
