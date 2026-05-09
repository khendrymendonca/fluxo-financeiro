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
          name: 'Cartao Principal',
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

  it('bloqueia a abertura do modal ao atingir 1 cartao sem unlimited_cards', () => {
    render(<CardsDashboard />);

    fireEvent.click(screen.getAllByRole('button', { name: /novo cart/i })[0]);

    expect(screen.queryByText(/adicionar cart/i)).not.toBeInTheDocument();
    expect(toastMock.toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Limite do plano Free atingido',
    }));
  });

  it('lista compra pela invoiceMonthYear da fatura e nao pelo mes da data da compra', async () => {
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
          description: 'Renegociacao de Pendencias (1/9)',
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

    expect(screen.queryByText('Renegociacao de Pendencias (1/9)')).not.toBeInTheDocument();

    financeStoreMock.useFinanceStore.mockReturnValue({
      ...store,
      viewDate: new Date(2026, 5, 15),
    });
    rerender(<CardsDashboard />);

    expect(await screen.findByText('Renegociacao de Pendencias (1/9)')).toBeInTheDocument();
  });
});
