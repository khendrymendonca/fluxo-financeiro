import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CardsDashboard from '@/pages/CardsDashboard';

const financeStoreMock = vi.hoisted(() => ({
  useFinanceStore: vi.fn(),
}));

const featureFlagsMock = vi.hoisted(() => ({
  useFeatureFlag: vi.fn(),
}));

const toastMock = vi.hoisted(() => ({
  toast: vi.fn(),
}));

vi.mock('@/hooks/useFinanceStore', () => financeStoreMock);
vi.mock('@/hooks/useFeatureFlags', () => featureFlagsMock);
vi.mock('@/components/ui/use-toast', () => toastMock);
vi.mock('@/hooks/useIsMobile', () => ({
  useIsMobile: () => false,
}));
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: vi.fn(),
    }),
  };
});
vi.mock('@/hooks/useTransactionMutations', () => ({
  useAddTransaction: () => ({ mutateAsync: vi.fn() }),
  useUpdateTransaction: () => ({ mutateAsync: vi.fn() }),
  useBulkUpdateTransactions: () => ({ mutateAsync: vi.fn() }),
}));

describe('CardsDashboard - limite Free', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    featureFlagsMock.useFeatureFlag.mockReturnValue(false);
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
    financeStoreMock.useFinanceStore.mockReturnValue({
      creditCards: [
        {
          id: 'card-1',
          userId: 'user-1',
          name: 'Cartão Principal',
          brand: 'Visa',
          limit: 3000,
          closingDay: 10,
          dueDay: 20,
          color: '#111111',
        },
      ],
      transactions: [],
      accounts: [],
      categories: [],
      updateCreditCard: vi.fn(),
      addCreditCard: vi.fn(),
      getCardUsedLimit: vi.fn(() => 0),
      viewDate: new Date(2026, 3, 15),
      setViewDate: vi.fn(),
    });
  });

  it('bloqueia a abertura do modal ao atingir 1 cartão sem unlimited_cards', () => {
    render(<CardsDashboard />);

    fireEvent.click(screen.getAllByRole('button', { name: /novo cart/i })[0]);

    expect(screen.queryByText(/adicionar cart/i)).not.toBeInTheDocument();
    expect(toastMock.toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Limite do plano Free atingido',
    }));
  });

  it('lista compra pela invoiceMonthYear da fatura e não pelo mês da data da compra', async () => {
    const store = {
      creditCards: [
        {
          id: 'card-1',
          userId: 'user-1',
          name: 'Nu - Duda',
          brand: 'Mastercard',
          limit: 5800,
          closingDay: 28,
          dueDay: 5,
          color: '#111111',
          history: [
            { dueDay: 5, closingDay: 28, effectiveDate: '2026-01-01' },
          ],
        },
      ],
      transactions: [
        {
          id: 'inst-1',
          userId: 'user-1',
          type: 'expense',
          transactionType: 'installment',
          description: 'Renegociação de Pendências (1/9)',
          amount: 483.85,
          date: '2026-05-05',
          cardId: 'card-1',
          categoryId: 'cat-1',
          isPaid: true,
          installmentGroupId: 'group-card-1',
          installmentNumber: 1,
          installmentTotal: 9,
          invoiceMonthYear: '2026-06',
        },
      ],
      accounts: [],
      categories: [{ id: 'cat-1', name: 'Acordo', type: 'expense' }],
      updateCreditCard: vi.fn(),
      addCreditCard: vi.fn(),
      getCardUsedLimit: vi.fn(() => 483.85),
      viewDate: new Date(2026, 4, 15),
      setViewDate: vi.fn(),
    };
    financeStoreMock.useFinanceStore.mockReturnValue(store);

    const { rerender } = render(<CardsDashboard />);

    expect(screen.queryByText('Renegociação de Pendências (1/9)')).not.toBeInTheDocument();

    financeStoreMock.useFinanceStore.mockReturnValue({
      ...store,
      viewDate: new Date(2026, 5, 15),
    });
    rerender(<CardsDashboard />);

    expect(await screen.findByText('Renegociação de Pendências (1/9)')).toBeInTheDocument();
  });

  it('mantém Cartões como demonstrativo sem ação direta de pagamento de fatura', () => {
    financeStoreMock.useFinanceStore.mockReturnValue({
      creditCards: [
        {
          id: 'card-1',
          userId: 'user-1',
          name: 'Nubank',
          brand: 'Visa',
          limit: 3000,
          closingDay: 10,
          dueDay: 20,
          color: '#111111',
        },
      ],
      transactions: [
        {
          id: 'purchase-1',
          userId: 'user-1',
          type: 'expense',
          transactionType: 'punctual',
          description: 'Compra teste',
          amount: 1000,
          date: '2026-04-05',
          cardId: 'card-1',
          isPaid: false,
          invoiceMonthYear: '2026-04',
        },
      ],
      categories: [],
      updateCreditCard: vi.fn(),
      addCreditCard: vi.fn(),
      getCardUsedLimit: vi.fn(() => 1000),
      viewDate: new Date(2026, 3, 15),
      setViewDate: vi.fn(),
    });

    render(<CardsDashboard />);

    expect(screen.queryByRole('button', { name: /^pagar fatura$/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Abater Fatura')).not.toBeInTheDocument();
    expect(screen.queryByText('Parcelar Fatura')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(/Gerenciar na Gestão de Contas/i));
    expect(window.location.href).toContain('/?view=bills');
    expect(screen.getByText('Tela demonstrativa')).toBeInTheDocument();
  });

  it('exibe limite usado para fatura aberta sem pagamento', () => {
    financeStoreMock.useFinanceStore.mockReturnValue({
      creditCards: [
        {
          id: 'itau-7409',
          userId: 'user-1',
          name: 'Itau / 7409 - V',
          brand: 'Visa',
          limit: 1000,
          closingDay: 10,
          dueDay: 20,
          color: '#111111',
        },
      ],
      transactions: [
        {
          id: 'purchase-1',
          userId: 'user-1',
          type: 'expense',
          transactionType: 'punctual',
          description: 'Compra teste',
          amount: 13.9,
          date: '2026-05-19',
          cardId: 'itau-7409',
          isInvoicePayment: false,
          isPaid: false,
          invoiceMonthYear: '2026-07',
        },
      ],
      categories: [],
      updateCreditCard: vi.fn(),
      addCreditCard: vi.fn(),
      getCardUsedLimit: vi.fn(() => 13.9),
      viewDate: new Date(2026, 6, 15),
      setViewDate: vi.fn(),
    });

    render(<CardsDashboard />);

    expect(screen.getAllByText('R$ 986,10').length).toBeGreaterThan(0);
    expect(screen.getByText(/1% usado/i)).toBeInTheDocument();
    expect(screen.queryByText(/Total lançado/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Valor pago/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Diferença a conciliar/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Gastos$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Disponível$/i)).not.toBeInTheDocument();
  });

  it('usa o mesmo cálculo visual no cartão e na fatura para uma fatura aberta de 771,89', () => {
    financeStoreMock.useFinanceStore.mockReturnValue({
      creditCards: [
        {
          id: 'itau-7409',
          userId: 'user-1',
          name: 'Itau 7409 - V',
          brand: 'Visa',
          limit: 1000,
          closingDay: 10,
          dueDay: 20,
          color: '#111111',
        },
      ],
      transactions: [
        {
          id: 'purchase-1',
          userId: 'user-1',
          type: 'expense',
          transactionType: 'punctual',
          description: 'Compra A',
          amount: 500,
          date: '2026-04-20',
          cardId: 'itau-7409',
          isInvoicePayment: false,
          isPaid: true,
          invoiceMonthYear: '2026-05',
        },
        {
          id: 'purchase-2',
          userId: 'user-1',
          type: 'expense',
          transactionType: 'punctual',
          description: 'Compra B',
          amount: 271.89,
          date: '2026-05-02',
          cardId: 'itau-7409',
          isInvoicePayment: false,
          isPaid: true,
          invoiceMonthYear: '2026-05',
        },
      ],
      categories: [],
      updateCreditCard: vi.fn(),
      addCreditCard: vi.fn(),
      getCardUsedLimit: vi.fn(() => 771.89),
      viewDate: new Date(2026, 4, 15),
      setViewDate: vi.fn(),
    });

    render(<CardsDashboard />);

    expect(screen.getAllByText('R$ 771,89').length).toBeGreaterThan(0);
    expect(screen.getAllByText('R$ 228,11').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/77%/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Compra A')).toBeInTheDocument();
    expect(screen.getByText('Compra B')).toBeInTheDocument();
    expect(screen.getByText(/Gerenciar na Gestão de Contas/i)).toBeInTheDocument();
    expect(screen.queryByText(/Total lançado/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Valor pago/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Diferença a conciliar/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Gastos$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Disponível$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Há mais lançamentos do que pagamento registrado nesta competência/i)).not.toBeInTheDocument();
    expect(screen.queryByText('R$ 1.000,00 disponível')).not.toBeInTheDocument();
    expect(screen.queryByText(/0% usado/i)).not.toBeInTheDocument();
  });
});
