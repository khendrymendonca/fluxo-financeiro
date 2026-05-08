import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReportsDashboard, { buildCategoryExpenseRanking } from '@/pages/ReportsDashboard';
import { Category, Transaction } from '@/types/finance';

const financeStoreMock = vi.hoisted(() => ({
  useFinanceStore: vi.fn(),
}));

const featureFlagsMock = vi.hoisted(() => ({
  useFeatureFlag: vi.fn(),
}));

vi.mock('@/hooks/useFinanceStore', () => financeStoreMock);
vi.mock('@/hooks/useFeatureFlags', () => featureFlagsMock);

const makeCategory = (id: string, name: string): Category => ({
  id,
  userId: 'user-1',
  groupId: 'group-1',
  name,
  type: 'expense',
  budgetGroup: 'lifestyle',
  isActive: true,
});

const makeTransaction = (overrides: Partial<Transaction>): Transaction => ({
  id: overrides.id ?? `tx-${Math.random()}`,
  userId: 'user-1',
  description: overrides.description ?? 'Despesa',
  amount: overrides.amount ?? 100,
  type: overrides.type ?? 'expense',
  transactionType: overrides.transactionType ?? 'punctual',
  date: overrides.date ?? '2026-04-10',
  isPaid: overrides.isPaid ?? true,
  isTransfer: overrides.isTransfer ?? false,
  isInvoicePayment: overrides.isInvoicePayment ?? false,
  ...overrides,
});

describe('ReportsDashboard - categoria de acordo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    featureFlagsMock.useFeatureFlag.mockReturnValue(true);
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
    expect(screen.getAllByText('Mapa anual por categoria').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Despesas').length).toBeGreaterThan(0);
  });

  it('calcula Por Categoria como top 10 ordenado e proporcional ao maior gasto', () => {
    const categories = Array.from({ length: 11 }, (_, index) =>
      makeCategory(`cat-${index + 1}`, `Categoria ${String(index + 1).padStart(2, '0')}`)
    );
    const amounts = [500, 250, 100, 90, 80, 70, 60, 50, 40, 30, 20];
    const transactions = categories.map((category, index) =>
      makeTransaction({
        id: `tx-${category.id}`,
        categoryId: category.id,
        amount: amounts[index],
      })
    );

    const ranking = buildCategoryExpenseRanking({
      transactions,
      categories,
      start: new Date(2026, 3, 1),
      end: new Date(2026, 3, 30),
      selectedAccountId: 'all',
    });

    expect(ranking).toHaveLength(10);
    expect(ranking.map((item) => item.name)).toEqual([
      'Categoria 01',
      'Categoria 02',
      'Categoria 03',
      'Categoria 04',
      'Categoria 05',
      'Categoria 06',
      'Categoria 07',
      'Categoria 08',
      'Categoria 09',
      'Categoria 10',
    ]);
    expect(ranking.find((item) => item.name === 'Categoria 11')).toBeUndefined();
    expect(ranking[0].barWidth).toBe(100);
    expect(ranking[1].barWidth).toBe(50);
    expect(ranking[2].barWidth).toBe(20);
  });

  it('ignora receitas, transferencias, soft-delete, pendentes, compra comum no cartao e fora do periodo', () => {
    const categories = [makeCategory('cat-home', 'Moradia')];

    const ranking = buildCategoryExpenseRanking({
      transactions: [
        makeTransaction({ id: 'wallet-expense', categoryId: 'cat-home', amount: 100, accountId: 'acc-1' }),
        makeTransaction({
          id: 'invoice-payment',
          description: 'Pagamento fatura',
          amount: 300,
          cardId: 'card-1',
          accountId: 'acc-1',
          isInvoicePayment: true,
          invoiceMonthYear: '2026-04',
        }),
        makeTransaction({ id: 'income', type: 'income', amount: 999, accountId: 'acc-1' }),
        makeTransaction({ id: 'transfer', amount: 888, isTransfer: true, accountId: 'acc-1' }),
        makeTransaction({ id: 'deleted', amount: 777, deleted_at: '2026-04-11T10:00:00.000Z', accountId: 'acc-1' }),
        makeTransaction({ id: 'pending', amount: 555, isPaid: false, accountId: 'acc-1' }),
        makeTransaction({ id: 'card-purchase', amount: 666, cardId: 'card-1', isPaid: true }),
        makeTransaction({ id: 'outside-period', amount: 444, date: '2026-05-01', accountId: 'acc-1' }),
      ],
      categories,
      start: new Date(2026, 3, 1),
      end: new Date(2026, 3, 30),
      selectedAccountId: 'acc-1',
    });

    expect(ranking).toHaveLength(2);
    expect(ranking[0]).toEqual(expect.objectContaining({ name: 'Pagamento de fatura', value: 300, barWidth: 100 }));
    expect(ranking[1]).toEqual(expect.objectContaining({ name: 'Moradia', value: 100 }));
    expect(ranking[1].barWidth).toBeCloseTo(100 / 3);
  });

  it('renderiza barras do Por Categoria com a maior categoria em 100%', () => {
    financeStoreMock.useFinanceStore.mockReturnValue({
      transactions: [
        makeTransaction({ id: 'tx-home', categoryId: 'cat-home', amount: 400 }),
        makeTransaction({ id: 'tx-food', categoryId: 'cat-food', amount: 200 }),
      ],
      categories: [
        makeCategory('cat-home', 'Moradia'),
        makeCategory('cat-food', 'Alimentacao'),
      ],
      accounts: [],
      viewDate: new Date(2026, 3, 15),
      setViewDate: vi.fn(),
    });

    render(<ReportsDashboard />);

    const bars = screen.getAllByTestId(/category-ranking-bar-/);
    expect(bars).toHaveLength(2);
    expect(bars[0]).toHaveStyle({ width: '100%' });
    expect(bars[1]).toHaveStyle({ width: '50%' });
  });

  it('oculta o bloco avancado quando advanced_reports nao estiver liberado', () => {
    featureFlagsMock.useFeatureFlag.mockReturnValue(false);

    financeStoreMock.useFinanceStore.mockReturnValue({
      transactions: [],
      categories: [],
      accounts: [],
      viewDate: new Date(2026, 3, 15),
      setViewDate: vi.fn(),
    });

    render(<ReportsDashboard />);

    expect(screen.queryByText('Mapa anual por categoria')).not.toBeInTheDocument();
    expect(screen.getByText('Evolução Mensal')).toBeInTheDocument();
    expect(screen.getByText('Por Categoria')).toBeInTheDocument();
  });
});
