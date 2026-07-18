import React, { PropsWithChildren, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor, within, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Transaction } from '@/types/finance';
import { todayLocalString } from '@/utils/dateUtils';

vi.mock('@/components/ui/select', () => {
  return {
    Select: ({ children, value, onValueChange }: any) => {
      let isSub = false;
      const traverse = (node: any) => {
        if (!node) return;
        if (Array.isArray(node)) {
          node.forEach(traverse);
          return;
        }
        if (node.props) {
          if (node.props.placeholder && String(node.props.placeholder).toLowerCase().includes('subcategoria')) {
            isSub = true;
          }
          if (node.props.children) {
            traverse(node.props.children);
          }
        }
      };
      traverse(children);
      return (
        <select 
          aria-label={isSub ? "Subcategoria" : "Categoria"} 
          value={value} 
          onChange={(e) => onValueChange(e.target.value)}
        >
          {children}
        </select>
      );
    },
    SelectTrigger: ({ children }: any) => children,
    SelectValue: ({ placeholder }: any) => <option value="">{placeholder}</option>,
    SelectContent: ({ children }: any) => children,
    SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
    SelectGroup: ({ children }: any) => children,
    SelectLabel: ({ children }: any) => <option disabled>{children}</option>,
    SelectSeparator: () => null,
  };
});

const financeStoreState = {
  categories: [{ id: 'cat-1', name: 'Moradia' }],
  subcategories: [{ id: 'sub-1', categoryId: 'cat-1', name: 'Energia' }],
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

async function renderTransactionListForFiltering(transactions: Transaction[], categories = financeStoreState.categories) {
  vi.resetModules();

  vi.doMock('@/hooks/useFinanceStore', () => ({
    useFinanceStore: () => ({
      ...financeStoreState,
      categories,
    }),
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
      transactions={transactions}
      onEdit={vi.fn()}
      onPayBill={vi.fn(async () => undefined)}
    />,
    { wrapper }
  );
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

  it('exibe lancamento comum com titulo, categoria, subcategoria e valor', async () => {
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
            id: 'common-1',
            userId: 'user-1',
            description: 'Conta de luz',
            amount: 75.5,
            type: 'expense',
            transactionType: 'punctual',
            date: '2026-04-10',
            isPaid: true,
            accountId: 'acc-1',
            categoryId: 'cat-1',
            subcategoryId: 'sub-1',
          },
        ]}
        onEdit={vi.fn()}
        onPayBill={vi.fn(async () => undefined)}
      />,
      { wrapper }
    );

    const row = screen.getByText('Conta de luz').closest('.group') as HTMLElement;
    expect(row).toBeTruthy();
    expect(within(row).getByText(/Moradia.*Energia/)).toBeInTheDocument();
    expect(within(row).getAllByText(/R\$\s*75,50/).length).toBeGreaterThan(0);

    vi.doUnmock('@/hooks/useFinanceStore');
    vi.doUnmock('@/hooks/useTransactionMutations');
    vi.doUnmock('@/components/ui/use-toast');
  }, 10000);

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
    expect(scoped.getByText('Limite disponível: R$ 0,00')).toBeInTheDocument();

    fireEvent.click(accountButton);

    await waitFor(() => {
      expect(onPayBill).toHaveBeenCalledWith(expect.objectContaining({
        id: 'tx-110',
        isPaid: true,
        paymentDate: todayLocalString(),
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
    expect(scoped.getByText('Limite disponível: R$ 0,00')).toBeInTheDocument();
    expect(scoped.getByText('Excesso além do limite: R$ 20,00')).toBeInTheDocument();

    fireEvent.click(accountButton);

    await waitFor(() => {
      expect(onPayBill).toHaveBeenCalledWith(expect.objectContaining({
        id: 'tx-130',
        isPaid: true,
        paymentDate: todayLocalString(),
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
    const row = screen.getByText('Internet paga').closest('.group') as HTMLElement;
    expect(within(row).getByText('Fixo')).toBeInTheDocument();
    expect(within(row).getByText('Gestão de Contas')).toBeInTheDocument();

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

  it('mantem compra parcelada no cartao visivel mesmo sem isPaid e exibe pagamento de fatura e transferencia no extrato', async () => {
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
            id: 'inst-card-open',
            userId: 'user-1',
            description: 'Notebook (2/10)',
            amount: 300,
            type: 'expense',
            transactionType: 'installment',
            date: '2026-04-20',
            isPaid: false,
            cardId: 'card-1',
            categoryId: 'cat-1',
            installmentGroupId: 'group-card-1',
            installmentNumber: 2,
            installmentTotal: 10,
            invoiceMonthYear: '2026-05',
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
            categoryId: 'cat-1',
            isInvoicePayment: true,
            invoiceMonthYear: '2026-04',
          },
          {
            id: 'transfer-1',
            userId: 'user-1',
            description: 'Transferencia poupanca',
            amount: 150,
            type: 'expense',
            transactionType: 'punctual',
            date: '2026-04-11',
            isPaid: true,
            accountId: 'acc-1',
            categoryId: 'cat-1',
            isTransfer: true,
          },
        ] as Transaction[]}
        onEdit={vi.fn()}
        onPayBill={vi.fn(async () => undefined)}
      />,
      { wrapper }
    );

    expect(screen.getByText('Notebook (2/10)')).toBeInTheDocument();
    const installmentRow = screen.getByText('Notebook (2/10)').closest('.group') as HTMLElement;
    expect(within(installmentRow).getByText('Compra no cartão')).toBeInTheDocument();
    expect(within(installmentRow).getByText('Parcelado')).toBeInTheDocument();
    expect(screen.getByText('Pagamento fatura abril')).toBeInTheDocument();
    const invoiceRow = screen.getByText('Pagamento fatura abril').closest('.group') as HTMLElement;
    expect(within(invoiceRow).getByText('Pagamento de fatura')).toBeInTheDocument();
    expect(screen.getByText('Transferencia poupanca')).toBeInTheDocument();
    const transferRow = screen.getByText('Transferencia poupanca').closest('.group') as HTMLElement;
    expect(within(transferRow).getByText('Transferência')).toBeInTheDocument();

    vi.doUnmock('@/hooks/useFinanceStore');
    vi.doUnmock('@/hooks/useTransactionMutations');
    vi.doUnmock('@/components/ui/use-toast');
  });

  it('abre transferencia para correcao e nao permite copiar uma ponta isolada', async () => {
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

    const onEdit = vi.fn();
    const onCopy = vi.fn();
    const { TransactionList } = await import('@/components/transactions/TransactionList');

    render(
      <TransactionList
        transactions={[
          {
            id: 'transfer-out',
            userId: 'user-1',
            description: '[Saída] Reserva',
            amount: 150,
            type: 'expense',
            transactionType: 'punctual',
            date: '2026-04-11',
            isPaid: true,
            accountId: 'acc-1',
            categoryId: 'cat-1',
            isTransfer: true,
            transferGroupId: 'transfer-group-1',
          },
        ] as Transaction[]}
        onEdit={onEdit}
        onCopy={onCopy}
        onPayBill={vi.fn(async () => undefined)}
      />,
      { wrapper }
    );

    expect(screen.getByText('Transferência')).toBeInTheDocument();
    expect(screen.queryByLabelText('Duplicar lançamento')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('[Saída] Reserva'));

    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({
      id: 'transfer-out',
      isTransfer: true,
      transferGroupId: 'transfer-group-1',
    }));
    expect(onCopy).not.toHaveBeenCalled();

    vi.doUnmock('@/hooks/useFinanceStore');
    vi.doUnmock('@/hooks/useTransactionMutations');
    vi.doUnmock('@/components/ui/use-toast');
  });

  it('continua ocultando boleto e divida parcelada pendentes no extrato comum', async () => {
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
            id: 'boleto-open-1',
            userId: 'user-1',
            description: 'Geladeira carnê (3/12)',
            amount: 220,
            type: 'expense',
            transactionType: 'installment',
            date: '2026-04-14',
            isPaid: false,
            accountId: 'acc-1',
            categoryId: 'cat-1',
            installmentGroupId: 'group-boleto-1',
            installmentNumber: 3,
            installmentTotal: 12,
          },
          {
            id: 'debt-open-1',
            userId: 'user-1',
            description: 'Acordo banco (2/8)',
            amount: 180,
            type: 'expense',
            transactionType: 'installment',
            date: '2026-04-18',
            isPaid: false,
            categoryId: 'cat-1',
            debtId: 'debt-1',
            installmentGroupId: 'group-debt-1',
            installmentNumber: 2,
            installmentTotal: 8,
          },
        ] as Transaction[]}
        onEdit={vi.fn()}
        onPayBill={vi.fn(async () => undefined)}
      />,
      { wrapper }
    );

    expect(screen.queryByText('Geladeira carnê (3/12)')).not.toBeInTheDocument();
    expect(screen.queryByText('Acordo banco (2/8)')).not.toBeInTheDocument();

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

  it('estorno de parcela de acordo paga limpa fonte pela mutation protegida', async () => {
    vi.resetModules();

    const toastMock = vi.fn();
    const togglePaidMock = vi.fn(async () => undefined);
    const onUndoPayment = vi.fn();

    vi.doMock('@/hooks/useFinanceStore', () => ({
      useFinanceStore: () => financeStoreState,
    }));

    vi.doMock('@/hooks/useTransactionMutations', () => ({
      useToggleTransactionPaid: () => ({ mutateAsync: togglePaidMock }),
    }));

    vi.doMock('@/components/ui/use-toast', () => ({
      toast: toastMock,
    }));

    const { TransactionList } = await import('@/components/transactions/TransactionList');

    render(
      <TransactionList
        transactions={[
          {
            id: 'debt-paid-1',
            userId: 'user-1',
            description: 'Acordo banco (1/3)',
            amount: 180,
            type: 'expense',
            transactionType: 'installment',
            date: '2026-04-10',
            paymentDate: '2026-04-10',
            isPaid: true,
            accountId: 'acc-1',
            categoryId: 'cat-1',
            debtId: 'debt-1',
            installmentGroupId: 'group-debt-1',
            installmentNumber: 1,
            installmentTotal: 3,
          },
        ] as Transaction[]}
        onEdit={vi.fn()}
        onPayBill={vi.fn(async () => undefined)}
        onUndoPayment={onUndoPayment}
      />,
      { wrapper }
    );

    fireEvent.click(screen.getByLabelText('Estornar pagamento'));

    await waitFor(() => {
      expect(togglePaidMock).toHaveBeenCalledWith({
        id: 'debt-paid-1',
        isPaid: false,
        clearSourceOnUnpay: true,
      });
    });
    expect(onUndoPayment).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith({ title: 'Pagamento estornado com sucesso.' });

    vi.doUnmock('@/hooks/useFinanceStore');
    vi.doUnmock('@/hooks/useTransactionMutations');
    vi.doUnmock('@/components/ui/use-toast');
  });
  it('filtra lancamentos por categoria real e combina com busca textual', async () => {
    await renderTransactionListForFiltering([
      {
        id: 'tx-home',
        userId: 'user-1',
        description: 'Aluguel apartamento',
        amount: 900,
        type: 'expense',
        transactionType: 'punctual',
        date: '2026-04-10',
        isPaid: true,
        accountId: 'acc-1',
        categoryId: 'cat-1',
      },
      {
        id: 'tx-food',
        userId: 'user-1',
        description: 'Mercado bairro',
        amount: 180,
        type: 'expense',
        transactionType: 'punctual',
        date: '2026-04-11',
        isPaid: true,
        accountId: 'acc-1',
        categoryId: 'cat-2',
      },
    ], [
      { id: 'cat-1', name: 'Moradia' },
      { id: 'cat-2', name: 'Alimentação' },
    ] as any);

    expect(screen.getByText('Aluguel apartamento')).toBeInTheDocument();
    expect(screen.getByText('Mercado bairro')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'category:cat-1' } });

    expect(screen.getByText('Aluguel apartamento')).toBeInTheDocument();
    expect(screen.queryByText('Mercado bairro')).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/Pesquisar/), { target: { value: 'mercado' } });
    expect(screen.queryByText('Aluguel apartamento')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'all' } });
    expect(screen.getByText('Mercado bairro')).toBeInTheDocument();
  });

  it('filtra lancamentos pela categoria logica Acordo', async () => {
    await renderTransactionListForFiltering([
      {
        id: 'tx-agreement',
        userId: 'user-1',
        description: 'Parcela acordo banco',
        amount: 180,
        type: 'expense',
        transactionType: 'installment',
        date: '2026-04-10',
        isPaid: true,
        accountId: 'acc-1',
        debtId: 'debt-1',
      },
      {
        id: 'tx-home',
        userId: 'user-1',
        description: 'Conta de luz',
        amount: 90,
        type: 'expense',
        transactionType: 'punctual',
        date: '2026-04-11',
        isPaid: true,
        accountId: 'acc-1',
        categoryId: 'cat-1',
      },
    ]);

    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'logical:agreement' } });

    expect(screen.getByText('Parcela acordo banco')).toBeInTheDocument();
    expect(screen.queryByText('Conta de luz')).not.toBeInTheDocument();
  });

  it('filtra lancamentos por Renegociacao e Nao identificados sem misturar buckets', async () => {
    await renderTransactionListForFiltering([
      {
        id: 'tx-reneg',
        userId: 'user-1',
        description: 'Renegociação de Pendências (1/9)',
        amount: 483.86,
        type: 'expense',
        transactionType: 'installment',
        date: '2026-04-10',
        isPaid: true,
        accountId: 'acc-1',
        categoryId: 'cat-unknown',
        cardId: 'card-1',
        invoiceMonthYear: '2026-04',
      },
      {
        id: 'tx-uncategorized',
        userId: 'user-1',
        description: 'Despesa sem categoria',
        amount: 42,
        type: 'expense',
        transactionType: 'punctual',
        date: '2026-04-11',
        isPaid: true,
        accountId: 'acc-1',
      },
    ], [
      { id: 'cat-unknown', name: 'Não Identificados' },
    ] as any);

    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'logical:renegotiation' } });
    expect(screen.getByText('Renegociação de Pendências (1/9)')).toBeInTheDocument();
    expect(screen.queryByText('Despesa sem categoria')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'logical:uncategorized' } });
    expect(screen.getByText('Despesa sem categoria')).toBeInTheDocument();
    expect(screen.queryByText('Renegociação de Pendências (1/9)')).not.toBeInTheDocument();
  });
});
