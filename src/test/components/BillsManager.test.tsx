import React, { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BillsManager } from '@/components/accounts/BillsManager';

const financeStoreMock = vi.hoisted(() => ({
  useFinanceStore: vi.fn(),
}));

const updateTransactionMock = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock('@/hooks/useFinanceStore', () => financeStoreMock);

vi.mock('@/hooks/useTransactionMutations', () => ({
  useUpdateTransaction: () => ({ mutateAsync: updateTransactionMock }),
  useDeleteTransaction: () => ({ mutateAsync: vi.fn() }),
  useAddTransaction: () => ({ mutateAsync: vi.fn() }),
  useToggleTransactionPaid: () => ({ mutateAsync: vi.fn() }),
  useBulkUpdateTransactions: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('@/components/ui/use-toast', () => ({
  toast: vi.fn(),
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

function buildStore(amount: number) {
  return {
    categories: [],
    accounts: [
      {
        id: 'acc-1',
        name: 'Conta teste',
        bank: 'Banco A',
        institution: 'Banco A',
        balance: 0,
        color: '#000000',
        accountType: 'corrente',
        hasOverdraft: true,
        overdraftLimit: 110,
      },
    ],
    creditCards: [],
    debts: [],
    viewDate: new Date(2026, 3, 15),
    currentMonthTransactions: [],
    transactions: [
      {
        id: `bill-${amount}`,
        description: `Conta ${amount}`,
        amount,
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
  };
}

async function openPaymentFlow() {
  fireEvent.click(screen.getByLabelText('Baixar conta'));
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar Pagamento' }));
  return screen.getByText('Conta teste').closest('button') as HTMLButtonElement;
}

describe('BillsManager - contas pendentes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it('mantem item pendente na Gestao de Contas e remove item pago da lista principal', () => {
    financeStoreMock.useFinanceStore.mockReturnValue({
      categories: [],
      accounts: [],
      creditCards: [],
      debts: [],
      viewDate: new Date(2026, 3, 15),
      currentMonthTransactions: [],
      transactions: [
        {
          id: 'bill-pending',
          description: 'Internet pendente',
          amount: 120,
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
        {
          id: 'bill-paid',
          description: 'Internet paga',
          amount: 120,
          date: '2026-04-08',
          type: 'expense',
          isRecurring: true,
          transactionType: 'recurring',
          isPaid: true,
          isVirtual: false,
          originalId: null,
          cardId: null,
          isInvoicePayment: false,
        },
      ],
    });

    render(<BillsManager />, { wrapper });

    expect(screen.getByText('Internet pendente')).toBeInTheDocument();
    expect(screen.queryByText('Internet paga')).not.toBeInTheDocument();
  });

  it('reapresenta filho materializado como pendente na Gestao de Contas apos estorno', () => {
    financeStoreMock.useFinanceStore.mockReturnValue({
      categories: [],
      accounts: [],
      creditCards: [],
      debts: [],
      viewDate: new Date(2026, 3, 15),
      currentMonthTransactions: [],
      transactions: [
        {
          id: 'child-unpaid',
          description: 'Internet paga',
          amount: 120,
          date: '2026-04-10',
          type: 'expense',
          isRecurring: false,
          transactionType: 'punctual',
          isPaid: false,
          isVirtual: false,
          originalId: 'mother-1',
          cardId: null,
          accountId: null,
          isInvoicePayment: false,
        },
      ],
    });

    render(<BillsManager />, { wrapper });

    expect(screen.getByText('Internet paga')).toBeInTheDocument();
    expect(screen.getByLabelText('Baixar conta')).toBeInTheDocument();
  });

  it('permite pagamento que leva o saldo para -110 com limite 110', async () => {
    financeStoreMock.useFinanceStore.mockReturnValue(buildStore(110));

    render(<BillsManager />, { wrapper });

    const accountButton = await openPaymentFlow();

    expect(accountButton).not.toBeDisabled();
    expect(screen.getByText('R$ 0,00')).toBeInTheDocument();
    expect(screen.getByText('Após pagamento: -R$ 110,00')).toBeInTheDocument();
    expect(screen.getByText('Limite utilizado: R$ 110,00')).toBeInTheDocument();
    expect(screen.getByText('Limite disponivel: R$ 0,00')).toBeInTheDocument();

    fireEvent.click(accountButton);

    await waitFor(() => {
      expect(updateTransactionMock).toHaveBeenCalledWith({
        id: 'bill-110',
        updates: {
          isPaid: true,
          paymentDate: '2026-04-10',
          accountId: 'acc-1',
          cardId: undefined,
          invoiceMonthYear: undefined,
          amount: 110,
        },
      });
    });
  });

  it('permite pagamento que leva o saldo para -130 com limite 110 e exibe excesso além do limite', async () => {
    financeStoreMock.useFinanceStore.mockReturnValue(buildStore(130));

    render(<BillsManager />, { wrapper });

    const accountButton = await openPaymentFlow();

    expect(accountButton).not.toBeDisabled();
    expect(screen.getByText('R$ 0,00')).toBeInTheDocument();
    expect(screen.getByText('Após pagamento: -R$ 130,00')).toBeInTheDocument();
    expect(screen.getByText('Limite utilizado: R$ 110,00')).toBeInTheDocument();
    expect(screen.getByText('Limite disponivel: R$ 0,00')).toBeInTheDocument();
    expect(screen.getByText('Excesso alem do limite: R$ 20,00')).toBeInTheDocument();

    fireEvent.click(accountButton);

    await waitFor(() => {
      expect(updateTransactionMock).toHaveBeenCalledWith({
        id: 'bill-130',
        updates: {
          isPaid: true,
          paymentDate: '2026-04-10',
          accountId: 'acc-1',
          cardId: undefined,
          invoiceMonthYear: undefined,
          amount: 130,
        },
      });
    });
  });
});
