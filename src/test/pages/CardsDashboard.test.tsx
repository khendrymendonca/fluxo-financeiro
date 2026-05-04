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

    fireEvent.click(screen.getAllByRole('button', { name: /novo cartão/i })[0]);

    expect(screen.queryByText(/adicionar cartão/i)).not.toBeInTheDocument();
    expect(toastMock.toast).toHaveBeenCalledWith({
      title: 'Limite do plano Free atingido',
      description: 'Você pode cadastrar 1 cartão no plano Free. Para adicionar mais, libere cartões ilimitados.',
    });
  });
});
