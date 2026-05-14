import React, { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BillsManager } from '@/components/accounts/BillsManager';

const financeStoreMock = vi.hoisted(() => ({
  useFinanceStore: vi.fn(),
}));

const updateTransactionMock = vi.hoisted(() => vi.fn(async () => undefined));
const addTransactionMock = vi.hoisted(() => vi.fn(async () => undefined));
const bulkUpdateTransactionsMock = vi.hoisted(() => vi.fn(async () => undefined));
const toastMock = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useFinanceStore', () => financeStoreMock);

vi.mock('@/hooks/useTransactionMutations', () => ({
  useUpdateTransaction: () => ({ mutateAsync: updateTransactionMock }),
  useDeleteTransaction: () => ({ mutateAsync: vi.fn() }),
  useAddTransaction: () => ({ mutateAsync: addTransactionMock }),
  useToggleTransactionPaid: () => ({ mutateAsync: vi.fn() }),
  useBulkUpdateTransactions: () => ({ mutateAsync: bulkUpdateTransactionsMock }),
}));

vi.mock('@/components/ui/use-toast', () => ({
  toast: toastMock,
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

function buildDebtInstallmentStore(options: { withCard?: boolean } = {}) {
  return {
    categories: [{ id: 'cat-debt', name: 'Acordo' }],
    accounts: [
      {
        id: 'acc-1',
        name: 'Conta teste',
        bank: 'Banco A',
        institution: 'Banco A',
        balance: 500,
        color: '#000000',
        accountType: 'corrente',
        hasOverdraft: false,
        overdraftLimit: 0,
      },
    ],
    creditCards: options.withCard
      ? [
          {
            id: 'card-1',
            name: 'Cartao teste',
            bank: 'Banco Card',
            limit: 1000,
            closingDay: 15,
            dueDay: 25,
            color: '#111111',
          },
        ]
      : [],
    debts: [{ id: 'debt-1', name: 'Acordo banco' }],
    viewDate: new Date(2026, 3, 15),
    currentMonthTransactions: [],
    transactions: [
      {
        id: 'debt-installment-1',
        description: 'Acordo banco (1/3)',
        amount: 180,
        date: '2026-04-10',
        type: 'expense',
        isRecurring: false,
        transactionType: 'installment',
        isPaid: false,
        isVirtual: false,
        originalId: null,
        accountId: null,
        cardId: null,
        debtId: 'debt-1',
        installmentGroupId: 'debt-group-1',
        installmentNumber: 1,
        installmentTotal: 3,
        isInvoicePayment: false,
        categoryId: 'cat-debt',
      },
    ],
  };
}

function buildInvoiceStore() {
  return {
    categories: [],
    accounts: [
      {
        id: 'acc-1',
        name: 'Conta teste',
        bank: 'Banco A',
        institution: 'Banco A',
        balance: 2000,
        color: '#000000',
        accountType: 'corrente',
        hasOverdraft: false,
        overdraftLimit: 0,
      },
    ],
    creditCards: [
      {
        id: 'card-1',
        name: 'Nubank',
        bank: 'Nubank',
        limit: 5000,
        closingDay: 10,
        dueDay: 20,
        color: '#111111',
      },
    ],
    debts: [],
    viewDate: new Date(2026, 4, 15),
    currentMonthTransactions: [],
    transactions: [
      {
        id: 'purchase-1',
        description: 'Compra A',
        amount: 600,
        date: '2026-05-05',
        type: 'expense',
        isRecurring: false,
        transactionType: 'punctual',
        isPaid: false,
        isVirtual: false,
        cardId: 'card-1',
        isInvoicePayment: false,
        invoiceMonthYear: '2026-05',
      },
      {
        id: 'purchase-2',
        description: 'Compra B',
        amount: 400,
        date: '2026-05-06',
        type: 'expense',
        isRecurring: false,
        transactionType: 'punctual',
        isPaid: false,
        isVirtual: false,
        cardId: 'card-1',
        isInvoicePayment: false,
        invoiceMonthYear: '2026-05',
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
    updateTransactionMock.mockResolvedValue(undefined);
    addTransactionMock.mockResolvedValue(undefined);
    bulkUpdateTransactionsMock.mockResolvedValue(undefined);
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

  it('mostra pendencias anteriores e do mes selecionado na busca sem depender de originalId', () => {
    financeStoreMock.useFinanceStore.mockReturnValue({
      categories: [],
      accounts: [],
      creditCards: [],
      debts: [],
      viewDate: new Date(2026, 5, 15),
      currentMonthTransactions: [],
      transactions: [
        {
          id: 'vero-celular-maio',
          description: 'Vero - Celular',
          amount: 36.66,
          date: '2026-05-20',
          type: 'expense',
          isRecurring: false,
          transactionType: 'punctual',
          isPaid: false,
          isVirtual: false,
          originalId: '954f87f4-0610-46e4-865c-e7144214a149',
          cardId: null,
          isInvoicePayment: false,
        },
        {
          id: 'vero-internet-maio',
          description: 'Vero - Internet',
          amount: 102.41,
          date: '2026-05-20',
          type: 'expense',
          isRecurring: false,
          transactionType: 'punctual',
          isPaid: false,
          isVirtual: false,
          originalId: null,
          cardId: null,
          isInvoicePayment: false,
        },
        {
          id: 'vero-celular-junho',
          description: 'Vero - Celular',
          amount: 50,
          date: '2026-06-20',
          type: 'expense',
          isRecurring: false,
          transactionType: 'punctual',
          isPaid: false,
          isVirtual: true,
          originalId: '954f87f4-0610-46e4-865c-e7144214a149',
          cardId: null,
          isInvoicePayment: false,
        },
        {
          id: 'vero-internet-junho',
          description: 'Vero - Internet',
          amount: 99.9,
          date: '2026-06-20',
          type: 'expense',
          isRecurring: false,
          transactionType: 'punctual',
          isPaid: false,
          isVirtual: true,
          originalId: 'internet-root',
          cardId: null,
          isInvoicePayment: false,
        },
      ],
    });

    render(<BillsManager />, { wrapper });

    fireEvent.change(screen.getByPlaceholderText('Pesquisar contas ou categorias...'), {
      target: { value: 'vero' },
    });

    expect(screen.getAllByLabelText('Baixar conta')).toHaveLength(4);
    expect(screen.getAllByText('Vero - Celular')).toHaveLength(2);
    expect(screen.getAllByText('Vero - Internet')).toHaveLength(2);
    expect(screen.getByText('R$ 36,66')).toBeInTheDocument();
    expect(screen.getByText('R$ 102,41')).toBeInTheDocument();
    expect(screen.getByText('R$ 50,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 99,90')).toBeInTheDocument();
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
          cardId: null,
          invoiceMonthYear: null,
          amount: 110,
        },
      });
    });

  });

  it('mantem parcela de acordo pendente e nao mostra sucesso quando baixa falha', async () => {
    updateTransactionMock.mockRejectedValueOnce(new Error('falha no banco'));
    financeStoreMock.useFinanceStore.mockReturnValue(buildDebtInstallmentStore());

    render(<BillsManager />, { wrapper });

    fireEvent.click(screen.getByLabelText('Baixar conta'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Pagamento' }));
    fireEvent.click(screen.getByText('Conta teste').closest('button') as HTMLButtonElement);

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith({
        title: 'Erro ao registrar pagamento.',
        variant: 'destructive',
      });
    });

    expect(toastMock).not.toHaveBeenCalledWith({ title: 'Pagamento registrado com sucesso!' });
    expect(screen.getByText('Acordo banco (1/3)')).toBeInTheDocument();
    expect(screen.getByLabelText('Baixar conta')).toBeInTheDocument();
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
          cardId: null,
          invoiceMonthYear: null,
          amount: 130,
        },
      });
    });

    await waitFor(() => {
      expect(screen.queryByText('Acordo banco (1/3)')).not.toBeInTheDocument();
    });
    expect(screen.queryByLabelText('Baixar conta')).not.toBeInTheDocument();
    expect(toastMock).toHaveBeenCalledWith({ title: 'Pagamento registrado com sucesso!' });
  });

  it('abre fluxo de pagamento de parcela de acordo e exige escolher fonte antes de baixar', async () => {
    financeStoreMock.useFinanceStore.mockReturnValue(buildDebtInstallmentStore());

    render(<BillsManager />, { wrapper });

    fireEvent.click(screen.getByLabelText('Baixar conta'));
    expect(updateTransactionMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Pagamento' }));
    expect(screen.getByText('Pagar com qual conta?')).toBeInTheDocument();
    expect(updateTransactionMock).not.toHaveBeenCalled();

    const accountButton = screen.getByText('Conta teste').closest('button') as HTMLButtonElement;
    fireEvent.click(accountButton);

    await waitFor(() => {
      expect(updateTransactionMock).toHaveBeenCalledWith({
        id: 'debt-installment-1',
        updates: {
          isPaid: true,
          paymentDate: '2026-04-10',
          accountId: 'acc-1',
          cardId: null,
          invoiceMonthYear: null,
          amount: 180,
        },
      });
    });
  });

  it('pagamento de parcela de acordo por cartao registra cardId e competencia da fatura', async () => {
    financeStoreMock.useFinanceStore.mockReturnValue(buildDebtInstallmentStore({ withCard: true }));

    render(<BillsManager />, { wrapper });

    fireEvent.click(screen.getByLabelText('Baixar conta'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Pagamento' }));
    fireEvent.click(screen.getByText(/Cart/).closest('button') as HTMLButtonElement);
    fireEvent.click(screen.getByText('Cartao teste').closest('button') as HTMLButtonElement);

    await waitFor(() => {
      expect(updateTransactionMock).toHaveBeenCalledWith({
        id: 'debt-installment-1',
        updates: {
          isPaid: true,
          paymentDate: '2026-04-10',
          accountId: null,
          cardId: 'card-1',
          invoiceMonthYear: '2026-04',
          amount: 180,
        },
      });
    });
  });

  it('baixa fatura de cartao com pagamento total pela Gestao de Contas', async () => {
    financeStoreMock.useFinanceStore.mockReturnValue(buildInvoiceStore());

    render(<BillsManager />, { wrapper });

    expect(screen.getByText('Fatura Nubank')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Baixar conta'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Pagamento' }));

    expect(screen.getByText('Como deseja baixar esta fatura?')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'acc-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar baixa da fatura' }));

    await waitFor(() => {
      expect(addTransactionMock).toHaveBeenCalledWith([
        expect.objectContaining({
          description: 'Pagamento fatura Nubank 05/2026',
          amount: 1000,
          type: 'expense',
          transactionType: 'punctual',
          isInvoicePayment: true,
          accountId: 'acc-1',
          cardId: 'card-1',
          invoiceMonthYear: '2026-05',
          isPaid: true,
        }),
      ]);
    });
    expect(bulkUpdateTransactionsMock).toHaveBeenCalledWith({
      ids: ['purchase-1', 'purchase-2'],
      updates: { isPaid: true, paymentDate: '2026-05-20' },
    });
  });

  it('baixa fatura parcialmente e gera saldo restante na proxima competencia', async () => {
    financeStoreMock.useFinanceStore.mockReturnValue(buildInvoiceStore());

    render(<BillsManager />, { wrapper });

    fireEvent.click(screen.getByLabelText('Baixar conta'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Pagamento' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pagamento parcial' }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'acc-1' } });
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '600' } });
    expect(screen.getByText('Restante calculado: R$ 400,00')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar baixa da fatura' }));

    await waitFor(() => {
      expect(addTransactionMock).toHaveBeenCalledWith([
        expect.objectContaining({
          amount: 600,
          isInvoicePayment: true,
          accountId: 'acc-1',
          invoiceMonthYear: '2026-05',
        }),
        expect.objectContaining({
          description: 'Saldo restante da fatura 05/2026',
          amount: 400,
          transactionType: 'adjustment',
          isInvoicePayment: false,
          isPaid: false,
          cardId: 'card-1',
          invoiceMonthYear: '2026-06',
        }),
      ]);
    });
    expect(bulkUpdateTransactionsMock).not.toHaveBeenCalled();
  });

  it('parcela fatura sem recalcular juros e gera parcelas futuras informadas', async () => {
    financeStoreMock.useFinanceStore.mockReturnValue(buildInvoiceStore());

    render(<BillsManager />, { wrapper });

    fireEvent.click(screen.getByLabelText('Baixar conta'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Pagamento' }));
    fireEvent.click(screen.getByRole('button', { name: 'Parcelar fatura' }));
    fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '200' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'acc-1' } });
    fireEvent.change(screen.getAllByRole('spinbutton')[1], { target: { value: '4' } });
    fireEvent.change(screen.getAllByRole('spinbutton')[2], { target: { value: '250' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar baixa da fatura' }));

    await waitFor(() => {
      expect(addTransactionMock).toHaveBeenCalledWith([
        expect.objectContaining({
          description: 'Entrada parcelamento fatura Nubank 05/2026',
          amount: 200,
          transactionType: 'adjustment',
          isInvoicePayment: true,
          accountId: 'acc-1',
        }),
        expect.objectContaining({ amount: 250, transactionType: 'installment', installmentNumber: 1, installmentTotal: 4, invoiceMonthYear: '2026-06' }),
        expect.objectContaining({ amount: 250, transactionType: 'installment', installmentNumber: 2, installmentTotal: 4, invoiceMonthYear: '2026-07' }),
        expect.objectContaining({ amount: 250, transactionType: 'installment', installmentNumber: 3, installmentTotal: 4, invoiceMonthYear: '2026-08' }),
        expect.objectContaining({ amount: 250, transactionType: 'installment', installmentNumber: 4, installmentTotal: 4, invoiceMonthYear: '2026-09' }),
      ]);
    });
    expect(bulkUpdateTransactionsMock).toHaveBeenCalledWith({
      ids: ['purchase-1', 'purchase-2'],
      updates: { isPaid: true, paymentDate: '2026-05-20' },
    });
  });
});
