import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReportsDashboard, { buildCategoryExpenseRanking, buildProjectedReportPeriodData, buildReportPeriodData } from '@/pages/ReportsDashboard';
import { buildIncomeConsumption, buildPeriodComparison } from '@/utils/reportComparisons';
import { Category, Transaction } from '@/types/finance';

const financeStoreMock = vi.hoisted(() => ({
  useFinanceStore: vi.fn(),
}));

const featureFlagsMock = vi.hoisted(() => ({
  useFeatureFlag: vi.fn(),
}));

const mobileMock = vi.hoisted(() => ({
  useIsMobile: vi.fn(),
}));

const themeMock = vi.hoisted(() => ({
  useTheme: vi.fn(),
}));

const authMock = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

const themeColorMock = vi.hoisted(() => ({
  useThemeColor: vi.fn(),
  accentColors: [
    { id: 'blue', name: 'Azul Real', hsl: '221.2 83.2% 53.3%' },
    { id: 'emerald', name: 'Esmeralda', hsl: '142.1 76.2% 36.3%' },
    { id: 'teal', name: 'Turquesa', hsl: '173.4 80.4% 40%' },
  ],
}));

vi.mock('@/hooks/useFinanceStore', () => financeStoreMock);
vi.mock('@/hooks/useFeatureFlags', () => featureFlagsMock);
vi.mock('@/hooks/useIsMobile', () => mobileMock);
vi.mock('@/hooks/useTheme', () => themeMock);
vi.mock('@/contexts/AuthContext', () => authMock);
vi.mock('@/hooks/useThemeColor', () => themeColorMock);

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
    mobileMock.useIsMobile.mockReturnValue(false);
    themeMock.useTheme.mockReturnValue({
      theme: 'dark',
      setTheme: vi.fn(),
      cycleTheme: vi.fn(),
    });
    authMock.useAuth.mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' },
      session: null,
      loading: false,
      signOut: vi.fn(),
    });
    themeColorMock.useThemeColor.mockReturnValue({
      accentColor: 'blue',
      setAccentColor: vi.fn(),
      accentColors: themeColorMock.accentColors,
    });
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
    expect(screen.getAllByText('Mapa por categoria').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Despesas').length).toBeGreaterThan(0);
  });

  it('agrupa dois acordos sem categoria em uma única linha Acordo', () => {
    const ranking = buildCategoryExpenseRanking({
      transactions: [
        makeTransaction({
          id: 'tx-debt-99',
          description: 'Parcela 99 - Empréstimo',
          amount: 167.67,
          debtId: 'debt-99',
          categoryId: null,
          date: '2026-06-10',
          isPaid: true,
          accountId: 'acc-1',
          transactionType: 'installment',
        }),
        makeTransaction({
          id: 'tx-debt-inter',
          description: 'Parcela Inter',
          amount: 90.39,
          debtId: 'debt-inter',
          categoryId: null,
          date: '2026-06-22',
          isPaid: true,
          accountId: 'acc-1',
          transactionType: 'installment',
        }),
      ],
      categories: [],
      start: new Date(2026, 5, 1),
      end: new Date(2026, 5, 30),
      selectedAccountId: 'all',
    });

    expect(ranking).toHaveLength(1);
    expect(ranking[0]).toEqual(expect.objectContaining({
      name: 'Acordo',
      value: 258.06,
    }));
  });

  it('unifica categoria real Acordo com acordo sem category_id no mesmo bucket', () => {
    const ranking = buildCategoryExpenseRanking({
      transactions: [
        makeTransaction({
          id: 'tx-real-acordo',
          description: 'Acordo categorizado',
          amount: 167.67,
          debtId: 'debt-99',
          categoryId: 'cat-acordo',
          date: '2026-06-10',
          isPaid: true,
          accountId: 'acc-1',
          transactionType: 'installment',
        }),
        makeTransaction({
          id: 'tx-fallback-acordo',
          description: 'Acordo sem categoria',
          amount: 90.39,
          debtId: 'debt-inter',
          categoryId: null,
          date: '2026-06-22',
          isPaid: true,
          accountId: 'acc-1',
          transactionType: 'installment',
        }),
      ],
      categories: [makeCategory('cat-acordo', 'Acordo')],
      start: new Date(2026, 5, 1),
      end: new Date(2026, 5, 30),
      selectedAccountId: 'all',
    });

    expect(ranking).toHaveLength(1);
    expect(ranking[0]).toEqual(expect.objectContaining({
      name: 'Acordo',
      value: 258.06,
    }));
  });

  it('classifica transação sem categoria e sem debtId como Não identificados', () => {
    const ranking = buildCategoryExpenseRanking({
      transactions: [
        makeTransaction({
          id: 'tx-uncat',
          description: 'Despesa sem categoria',
          amount: 42,
          categoryId: null,
          debtId: null,
          date: '2026-04-10',
          isPaid: true,
          accountId: 'acc-1',
        }),
      ],
      categories: [],
      start: new Date(2026, 3, 1),
      end: new Date(2026, 3, 30),
      selectedAccountId: 'all',
    });

    expect(ranking).toEqual([
      expect.objectContaining({
        name: 'Não identificados',
        value: 42,
      }),
    ]);
  });

  it('classifica a composição das despesas de junho/2026 com Renegociação acima de Não identificados genérico', () => {
    const categories = [
      makeCategory('cat-uncategorized', 'Não Identificados'),
      makeCategory('cat-home', 'Moradia'),
    ];

    const ranking = buildCategoryExpenseRanking({
      transactions: [
        makeTransaction({
          id: 'tx-renegotiation',
          description: 'Renegociação de Pendências (1/9)',
          amount: 483.86,
          categoryId: 'cat-uncategorized',
          transactionType: 'installment',
          cardId: '4207f524-9dd0-480a-970d-56ccc7691d0e',
          invoiceMonthYear: '2026-06',
          date: '2026-05-28',
          isPaid: true,
          accountId: 'acc-1',
        }),
        makeTransaction({
          id: 'tx-uncategorized',
          description: 'Despesa realmente sem categoria',
          amount: 42,
          categoryId: undefined,
          transactionType: 'punctual',
          date: '2026-06-14',
          isPaid: true,
          accountId: 'acc-1',
        }),
        makeTransaction({
          id: 'tx-agreement',
          description: 'Parcela acordo',
          amount: 90.39,
          categoryId: undefined,
          debtId: 'debt-1',
          transactionType: 'installment',
          date: '2026-06-20',
          isPaid: true,
          accountId: 'acc-1',
        }),
      ],
      categories,
      start: new Date(2026, 5, 1),
      end: new Date(2026, 5, 30),
      selectedAccountId: 'all',
    });

    expect(ranking).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Renegociação', value: 483.86 }),
      expect.objectContaining({ name: 'Não identificados', value: 42 }),
      expect.objectContaining({ name: 'Acordo', value: 90.39 }),
    ]));
    expect(ranking.find((item) => item.name === 'Não Identificados' && item.value === 483.86)).toBeUndefined();
  });

  it('inclui acordos pendentes no modo projetado e exclui no realizado até o pagamento', () => {
    const mayEntry = makeTransaction({
      id: 'tx-entry',
      description: 'Entrada acordo Inter',
      amount: 79.6,
      date: '2026-05-22',
      isPaid: false,
      debtId: 'debt-inter',
      categoryId: null,
      transactionType: 'adjustment',
      accountId: 'acc-1',
    });

    const juneInstallment = makeTransaction({
      id: 'tx-installment-1',
      description: 'Parcela 1/11 acordo Inter',
      amount: 90.39,
      date: '2026-06-22',
      isPaid: false,
      debtId: 'debt-inter',
      categoryId: null,
      transactionType: 'installment',
      accountId: 'acc-1',
    });

    expect(buildProjectedReportPeriodData({
      transactions: [mayEntry],
      creditCards: [],
      categories: [],
      start: new Date(2026, 4, 1),
      end: new Date(2026, 4, 31),
      selectedAccountId: 'all',
    }).total).toBeCloseTo(79.6, 2);

    expect(buildProjectedReportPeriodData({
      transactions: [juneInstallment],
      creditCards: [],
      categories: [],
      start: new Date(2026, 5, 1),
      end: new Date(2026, 5, 30),
      selectedAccountId: 'all',
    }).total).toBeCloseTo(90.39, 2);

    expect(buildReportPeriodData({
      transactions: [juneInstallment],
      categories: [],
      start: new Date(2026, 5, 1),
      end: new Date(2026, 5, 30),
      selectedAccountId: 'all',
    }).total).toBe(0);

    expect(buildReportPeriodData({
      transactions: [{ ...juneInstallment, isPaid: true }],
      categories: [],
      start: new Date(2026, 5, 1),
      end: new Date(2026, 5, 30),
      selectedAccountId: 'all',
    }).total).toBeCloseTo(90.39, 2);
  });

  it('calcula Por Categoria ordenado e proporcional ao maior gasto sem truncar categorias', () => {
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

    expect(ranking).toHaveLength(11);
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
      'Categoria 11',
    ]);
    expect(ranking[0].barWidth).toBe(100);
    expect(ranking[1].barWidth).toBe(50);
    expect(ranking[2].barWidth).toBe(20);
  });

  it('Por Categoria detalha consumo por categoria e ignora pagamento de fatura', () => {
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
        makeTransaction({ id: 'card-purchase', categoryId: 'cat-home', amount: 666, cardId: 'card-1', invoiceMonthYear: '2026-04', isPaid: true }),
        makeTransaction({ id: 'outside-period', amount: 444, date: '2026-05-01', accountId: 'acc-1' }),
      ],
      categories,
      start: new Date(2026, 3, 1),
      end: new Date(2026, 3, 30),
      selectedAccountId: 'all',
    });

    expect(ranking).toHaveLength(1);
    expect(ranking[0]).toEqual(expect.objectContaining({ name: 'Moradia', value: 766, barWidth: 100 }));
  });

  it('calcula os cards do periodo por despesa efetiva sem duplicar cartao e fatura', () => {
    const categories = [makeCategory('cat-home', 'Moradia')];

    const result = buildReportPeriodData({
      transactions: [
        makeTransaction({
          id: 'salary',
          type: 'income',
          description: 'Salario',
          amount: 3000,
          date: '2026-04-05',
          isPaid: true,
          accountId: 'acc-1',
        }),
        makeTransaction({
          id: 'unpaid-income',
          type: 'income',
          description: 'Receita pendente',
          amount: 500,
          date: '2026-04-06',
          isPaid: false,
          accountId: 'acc-1',
        }),
        makeTransaction({
          id: 'wallet-expense',
          categoryId: 'cat-home',
          description: 'Aluguel',
          amount: 1000,
          date: '2026-04-10',
          isPaid: true,
          accountId: 'acc-1',
        }),
        makeTransaction({
          id: 'open-expense',
          categoryId: 'cat-home',
          description: 'Conta pendente',
          amount: 700,
          date: '2026-04-11',
          isPaid: false,
          accountId: 'acc-1',
        }),
        makeTransaction({
          id: 'card-purchase',
          categoryId: 'cat-home',
          description: 'Compra no cartao',
          amount: 900,
          date: '2026-04-12',
          isPaid: true,
          cardId: 'card-1',
          invoiceMonthYear: '2026-04',
        }),
        makeTransaction({
          id: 'invoice-payment',
          categoryId: 'cat-home',
          description: 'Pagamento fatura abril',
          amount: 900,
          date: '2026-04-25',
          isPaid: true,
          accountId: 'acc-1',
          cardId: 'card-1',
          isInvoicePayment: true,
          invoiceMonthYear: '2026-04',
        }),
        makeTransaction({
          id: 'transfer-out',
          description: 'Transferencia saida',
          amount: 250,
          date: '2026-04-13',
          isPaid: true,
          accountId: 'acc-1',
          isTransfer: true,
        }),
        makeTransaction({
          id: 'transfer-in',
          type: 'income',
          description: 'Transferencia entrada',
          amount: 250,
          date: '2026-04-13',
          isPaid: true,
          accountId: 'acc-2',
          isTransfer: true,
        }),
      ],
      categories,
      start: new Date(2026, 3, 1),
      end: new Date(2026, 3, 30),
      selectedAccountId: 'all',
    });

    expect(result.income).toBe(3000);
    expect(result.total).toBe(1900);
    expect(result.paid).toBe(1900);
    expect(result.income - result.total).toBe(1100);
  });

  it('renderiza Renegociação na composição das despesas em junho/2026', () => {
    financeStoreMock.useFinanceStore.mockReturnValue({
      transactions: [
        makeTransaction({
          id: 'tx-renegotiation',
          description: 'Renegociação de Pendências (1/9)',
          amount: 483.86,
          categoryId: 'cat-uncategorized',
          transactionType: 'installment',
          cardId: '4207f524-9dd0-480a-970d-56ccc7691d0e',
          invoiceMonthYear: '2026-06',
          date: '2026-05-28',
          isPaid: true,
          accountId: 'acc-1',
        }),
        makeTransaction({
          id: 'tx-uncategorized',
          description: 'Despesa realmente sem categoria',
          amount: 42,
          categoryId: undefined,
          transactionType: 'punctual',
          date: '2026-06-14',
          isPaid: true,
          accountId: 'acc-1',
        }),
        makeTransaction({
          id: 'tx-agreement',
          description: 'Parcela acordo',
          amount: 90.39,
          categoryId: undefined,
          debtId: 'debt-1',
          transactionType: 'installment',
          date: '2026-06-20',
          isPaid: true,
          accountId: 'acc-1',
        }),
      ],
      categories: [makeCategory('cat-uncategorized', 'Não Identificados')],
      accounts: [],
      creditCards: [],
      viewDate: new Date(2026, 5, 15),
      setViewDate: vi.fn(),
    });

    render(<ReportsDashboard />);

    expect(screen.getAllByText('Renegociação').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Não identificados').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Acordo').length).toBeGreaterThan(0);
    expect(screen.getByText('R$ 483,86')).toBeInTheDocument();
  });

  it('respeita filtro de conta nos totais efetivos do relatorio', () => {
    const categories = [makeCategory('cat-home', 'Moradia')];

    const result = buildReportPeriodData({
      transactions: [
        makeTransaction({
          id: 'income-acc-1',
          type: 'income',
          amount: 2000,
          date: '2026-04-05',
          isPaid: true,
          accountId: 'acc-1',
        }),
        makeTransaction({
          id: 'income-acc-2',
          type: 'income',
          amount: 5000,
          date: '2026-04-05',
          isPaid: true,
          accountId: 'acc-2',
        }),
        makeTransaction({
          id: 'expense-acc-1',
          categoryId: 'cat-home',
          amount: 300,
          date: '2026-04-10',
          isPaid: true,
          accountId: 'acc-1',
        }),
        makeTransaction({
          id: 'invoice-acc-2',
          categoryId: 'cat-home',
          amount: 800,
          date: '2026-04-25',
          isPaid: true,
          accountId: 'acc-2',
          cardId: 'card-1',
          isInvoicePayment: true,
          invoiceMonthYear: '2026-04',
        }),
      ],
      categories,
      start: new Date(2026, 3, 1),
      end: new Date(2026, 3, 30),
      selectedAccountId: 'acc-1',
    });

    expect(result.income).toBe(2000);
    expect(result.total).toBe(300);
    expect(result.income - result.total).toBe(1700);
  });

  it('calcula o modo projetado por competencia com recorrencias, pendentes e fatura prevista sem duplicidade', () => {
    const categories = [makeCategory('cat-home', 'Moradia')];

    const result = buildProjectedReportPeriodData({
      transactions: [
        makeTransaction({
          id: 'future-salary',
          type: 'income',
          transactionType: 'recurring',
          description: 'Salario',
          amount: 4330,
          date: '2026-06-05',
          isPaid: false,
          isRecurring: true,
          accountId: 'acc-1',
        }),
        makeTransaction({
          id: 'future-rent',
          categoryId: 'cat-home',
          transactionType: 'recurring',
          description: 'Aluguel',
          amount: 1200,
          date: '2026-06-10',
          isPaid: false,
          isRecurring: true,
          accountId: 'acc-1',
        }),
        makeTransaction({
          id: 'future-bill',
          categoryId: 'cat-home',
          description: 'Conta aberta',
          amount: 300,
          date: '2026-07-15',
          isPaid: false,
          accountId: 'acc-1',
        }),
        makeTransaction({
          id: 'card-purchase',
          categoryId: 'cat-home',
          description: 'Compra no cartao',
          amount: 900,
          date: '2026-06-20',
          isPaid: false,
          cardId: 'card-1',
          invoiceMonthYear: '2026-07',
        }),
        makeTransaction({
          id: 'transfer',
          description: 'Transferencia',
          amount: 999,
          date: '2026-07-12',
          isPaid: true,
          isTransfer: true,
          accountId: 'acc-1',
        }),
      ],
      creditCards: [
        {
          id: 'card-1',
          userId: 'user-1',
          name: 'Nubank',
          bank: 'Nubank',
          limit: 5000,
          closingDay: 10,
          dueDay: 20,
          color: '#111111',
          isClosingDateFixed: false,
          isActive: true,
        },
      ],
      categories,
      start: new Date(2026, 6, 1),
      end: new Date(2026, 6, 31),
      selectedAccountId: 'all',
    });

    expect(result.income).toBe(4330);
    expect(result.total).toBe(2400);
    expect(result.income - result.total).toBe(1930);
  });

  it('calcula variacao contra periodo anterior com percentual seguro', () => {
    expect(buildPeriodComparison(2975.88, 3416.32)).toMatchObject({
      diff: -440.44,
      direction: 'down',
      hasBase: true,
    });
    expect(buildPeriodComparison(100, 0)).toMatchObject({
      diff: 100,
      percent: null,
      hasBase: false,
      direction: 'up',
    });
  });

  it('calcula consumo da receita com seguranca', () => {
    expect(buildIncomeConsumption(4000, 2800)).toEqual({
      income: 4000,
      expenses: 2800,
      percent: 70,
    });
    expect(buildIncomeConsumption(0, 500)).toEqual({
      income: 0,
      expenses: 500,
      percent: null,
    });
  });

  it('renderiza os cards financeiros com valores efetivos e sem quebra no negativo', () => {
    financeStoreMock.useFinanceStore.mockReturnValue({
      transactions: [
        makeTransaction({
          id: 'income',
          type: 'income',
          description: 'Salario',
          amount: 1000,
          date: '2026-04-05',
          isPaid: true,
          accountId: 'acc-1',
        }),
        makeTransaction({
          id: 'cash-expense',
          description: 'Despesa comum',
          amount: 700,
          date: '2026-04-10',
          isPaid: true,
          accountId: 'acc-1',
        }),
        makeTransaction({
          id: 'card-purchase',
          description: 'Compra no cartao',
          amount: 900,
          date: '2026-04-12',
          isPaid: true,
          cardId: 'card-1',
          invoiceMonthYear: '2026-04',
        }),
        makeTransaction({
          id: 'invoice-payment',
          description: 'Pagamento fatura abril',
          amount: 900,
          date: '2026-04-25',
          isPaid: true,
          accountId: 'acc-1',
          cardId: 'card-1',
          isInvoicePayment: true,
          invoiceMonthYear: '2026-04',
        }),
        makeTransaction({
          id: 'transfer',
          description: 'Transferencia',
          amount: 300,
          date: '2026-04-14',
          isPaid: true,
          accountId: 'acc-1',
          isTransfer: true,
        }),
      ],
      categories: [],
      creditCards: [],
      accounts: [],
      viewDate: new Date(2026, 3, 15),
      setViewDate: vi.fn(),
    });

    render(<ReportsDashboard />);
    fireEvent.click(screen.getByRole('button', { name: 'Realizado' }));

    expect(screen.getByText('Receitas efetivas')).toBeInTheDocument();
    expect(screen.getByText('Despesas efetivas')).toBeInTheDocument();
    expect(screen.getAllByText('R$ 1.000,00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('R$ 1.600,00').length).toBeGreaterThan(0);
    expect(screen.getByText('160.0%')).toBeInTheDocument();
    expect(screen.queryByText('R$ 2.500,00')).not.toBeInTheDocument();
    const negativeBalance = screen.getAllByText('-R$ 600,00')[0];
    expect(negativeBalance).toBeInTheDocument();
    expect(negativeBalance).toHaveClass('whitespace-nowrap');
    expect(negativeBalance).toHaveClass('tabular-nums');
  });

  it('usa Projetado como modo padrao e alterna os cards para Realizado', () => {
    financeStoreMock.useFinanceStore.mockReturnValue({
      transactions: [
        makeTransaction({
          id: 'pending-income',
          type: 'income',
          amount: 4330,
          date: '2026-04-05',
          isPaid: false,
          accountId: 'acc-1',
        }),
        makeTransaction({
          id: 'pending-expense',
          amount: 1200,
          date: '2026-04-10',
          isPaid: false,
          accountId: 'acc-1',
        }),
      ],
      categories: [],
      creditCards: [],
      accounts: [],
      viewDate: new Date(2026, 3, 15),
      setViewDate: vi.fn(),
    });

    render(<ReportsDashboard />);

    expect(screen.getByText('Receitas previstas')).toBeInTheDocument();
    expect(screen.getByText('Despesas previstas')).toBeInTheDocument();
    expect(screen.getByText('Saldo previsto')).toBeInTheDocument();
    expect(screen.getAllByText('R$ 4.330,00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('R$ 1.200,00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('R$ 3.130,00').length).toBeGreaterThan(0);
    expect(screen.getByText('27.7%')).toBeInTheDocument();
    expect(screen.queryAllByText(/anterior/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Receitas').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Despesas').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Realizado' }));

    expect(screen.getByText('Receitas efetivas')).toBeInTheDocument();
    expect(screen.getByText('Despesas efetivas')).toBeInTheDocument();
    expect(screen.getByText(/Saldo efetivo/)).toBeInTheDocument();
    expect(screen.getAllByText('R$ 0,00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Receitas').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Despesas').length).toBeGreaterThan(0);
  });

  it('modo Semestre soma o semestre, compara com semestre anterior e oculta orcamentos mensais', () => {
    financeStoreMock.useFinanceStore.mockReturnValue({
      transactions: [
        makeTransaction({
          id: 'jan-income',
          type: 'income',
          amount: 1000,
          date: '2026-01-05',
          isPaid: false,
          accountId: 'acc-1',
        }),
        makeTransaction({
          id: 'feb-income',
          type: 'income',
          amount: 2000,
          date: '2026-02-05',
          isPaid: false,
          accountId: 'acc-1',
        }),
        makeTransaction({
          id: 'jan-expense',
          amount: 500,
          date: '2026-01-10',
          isPaid: false,
          accountId: 'acc-1',
        }),
        makeTransaction({
          id: 'jul-income-prev',
          type: 'income',
          amount: 400,
          date: '2025-07-05',
          isPaid: false,
          accountId: 'acc-1',
        }),
        makeTransaction({
          id: 'outside-semester',
          type: 'income',
          amount: 9999,
          date: '2026-07-05',
          isPaid: false,
          accountId: 'acc-1',
        }),
      ],
      categories: [],
      creditCards: [],
      accounts: [],
      viewDate: new Date(2026, 2, 15),
      setViewDate: vi.fn(),
    });

    render(<ReportsDashboard />);
    fireEvent.click(screen.getByRole('button', { name: 'Semestre' }));

    expect(screen.getAllByText('R$ 3.000,00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('R$ 500,00').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/semestre anterior/).length).toBeGreaterThan(0);
    expect(screen.queryByText('Orcamentos por categoria')).not.toBeInTheDocument();
    expect(screen.queryByText('R$ 9.999,00')).not.toBeInTheDocument();
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

    expect(screen.queryByText('Mapa por categoria')).not.toBeInTheDocument();
    expect(screen.getByText('Total de Consumo vs Receita')).toBeInTheDocument();
    expect(screen.getByText('Ranking de Despesas')).toBeInTheDocument();
    expect(screen.queryByText('Composição das Despesas')).not.toBeInTheDocument();
  });

  it('renderiza o ranking completo em area rolavel, ordenado e sem trilho cinza', () => {
    financeStoreMock.useFinanceStore.mockReturnValue({
      transactions: [
        makeTransaction({ id: 'cat-1', description: 'Moradia abril', categoryId: 'cat-home', amount: 300, date: '2026-04-10', isPaid: true, accountId: 'acc-1' }),
        makeTransaction({ id: 'cat-2', description: 'Mercado abril', categoryId: 'cat-food', amount: 200, date: '2026-04-11', isPaid: true, accountId: 'acc-1' }),
        makeTransaction({ id: 'cat-3', description: 'Pet abril', categoryId: 'cat-pet', amount: 100, date: '2026-04-12', isPaid: true, accountId: 'acc-1' }),
        makeTransaction({ id: 'cat-4', description: 'Saúde abril', categoryId: 'cat-health', amount: 80, date: '2026-04-13', isPaid: true, accountId: 'acc-1' }),
      ],
      categories: [
        makeCategory('cat-home', 'Moradia'),
        makeCategory('cat-food', 'Alimentação'),
        makeCategory('cat-pet', 'Pet'),
        makeCategory('cat-health', 'Saúde'),
      ],
      creditCards: [],
      accounts: [],
      viewDate: new Date(2026, 3, 15),
      setViewDate: vi.fn(),
    });

    render(<ReportsDashboard />);

    const rankingScroll = screen.getByTestId('category-ranking-scroll');
    expect(rankingScroll).toHaveClass('overflow-y-auto');
    expect(rankingScroll).toHaveClass('max-h-[320px]');
    expect(rankingScroll).toHaveClass('md:max-h-[420px]');
    expect(rankingScroll).toHaveClass('lg:max-h-[480px]');

    const bars = screen.getAllByTestId(/category-ranking-bar-/);
    expect(bars).toHaveLength(4);
    expect(bars[0]).toHaveAttribute('data-category-name', 'Moradia');
    expect(bars[1]).toHaveAttribute('data-category-name', 'Alimentação');
    expect(bars[2]).toHaveAttribute('data-category-name', 'Pet');
    expect(bars[3]).toHaveAttribute('data-category-name', 'Saúde');

    expect(screen.getAllByText('Moradia').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Alimentação').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pet').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Saúde').length).toBeGreaterThan(0);
    expect(rankingScroll.querySelector('.bg-zinc-200\\/80')).toBeNull();
  });

  it('atualiza a Analise de Categoria ao clicar em uma categoria real na composicao das despesas', () => {
    financeStoreMock.useFinanceStore.mockReturnValue({
      transactions: [
        makeTransaction({
          id: 'transport-current',
          description: 'Uber abril',
          categoryId: 'cat-transport',
          amount: 120,
          date: '2026-04-10',
          isPaid: true,
          accountId: 'acc-1',
        }),
        makeTransaction({
          id: 'transport-previous',
          description: 'Uber marco',
          categoryId: 'cat-transport',
          amount: 80,
          date: '2026-03-10',
          isPaid: true,
          accountId: 'acc-1',
        }),
      ],
      categories: [makeCategory('cat-transport', 'Transporte')],
      creditCards: [],
      accounts: [],
      viewDate: new Date(2026, 3, 15),
      setViewDate: vi.fn(),
    });

    render(<ReportsDashboard />);

    fireEvent.click(screen.getAllByTestId(/category-ranking-bar-/)[0].closest('button') as HTMLButtonElement);

    const analysisCard = screen.getByText('Análise de Categoria').closest('.bg-white') as HTMLElement;
    expect(within(analysisCard).getAllByText('R$ 120,00').length).toBeGreaterThan(0);
    expect(within(analysisCard).getAllByText('R$ 80,00').length).toBeGreaterThan(0);
  });

  it('permite clicar novamente na mesma categoria para limpar a Analise de Categoria', () => {
    financeStoreMock.useFinanceStore.mockReturnValue({
      transactions: [
        makeTransaction({
          id: 'transport-current',
          description: 'Uber abril',
          categoryId: 'cat-transport',
          amount: 120,
          date: '2026-04-10',
          isPaid: true,
          accountId: 'acc-1',
        }),
      ],
      categories: [makeCategory('cat-transport', 'Transporte')],
      creditCards: [],
      accounts: [],
      viewDate: new Date(2026, 3, 15),
      setViewDate: vi.fn(),
    });

    render(<ReportsDashboard />);

    const rankingButton = screen.getAllByTestId(/category-ranking-bar-/)[0].closest('button') as HTMLButtonElement;
    fireEvent.click(rankingButton);
    expect(screen.queryByText('Sem categoria selecionada')).not.toBeInTheDocument();

    fireEvent.click(rankingButton);
    expect(screen.getByText('Sem categoria selecionada')).toBeInTheDocument();
  });

  it('mantem o ranking funcional no mobile', () => {
    mobileMock.useIsMobile.mockReturnValue(true);
    financeStoreMock.useFinanceStore.mockReturnValue({
      transactions: [
        makeTransaction({
          id: 'pet-current',
          description: 'Plano de saúde da gata',
          categoryId: 'cat-pet',
          amount: 13.2,
          date: '2026-04-20',
          isPaid: false,
          accountId: 'acc-1',
          recurrenceId: 'rec-pet',
        }),
      ],
      categories: [makeCategory('cat-pet', 'Pet')],
      creditCards: [],
      accounts: [],
      viewDate: new Date(2026, 3, 15),
      setViewDate: vi.fn(),
    });

    render(<ReportsDashboard />);

    const rankingScroll = screen.getByTestId('category-ranking-scroll');
    expect(rankingScroll).toHaveClass('max-h-[320px]');

    fireEvent.click(screen.getAllByTestId(/category-ranking-bar-/)[0].closest('button') as HTMLButtonElement);
    expect(screen.getByText('Plano de saúde da gata')).toBeInTheDocument();
  });

  it('renderiza topo mobile sem calendario diario e com cards compactos', () => {
    mobileMock.useIsMobile.mockReturnValue(true);
    financeStoreMock.useFinanceStore.mockReturnValue({
      transactions: [
        makeTransaction({
          id: 'mobile-income',
          description: 'Salário',
          type: 'income',
          amount: 3000,
          date: '2026-04-05',
          isPaid: true,
          accountId: 'acc-1',
        }),
        makeTransaction({
          id: 'mobile-expense',
          description: 'Mercado',
          categoryId: 'cat-food',
          amount: 500,
          date: '2026-04-10',
          isPaid: true,
          accountId: 'acc-1',
        }),
      ],
      categories: [makeCategory('cat-food', 'Alimentação')],
      creditCards: [],
      accounts: [{ id: 'acc-1', name: 'Conta Principal', balance: 1000 }],
      viewDate: new Date(2026, 3, 15),
      setViewDate: vi.fn(),
    });

    render(<ReportsDashboard />);

    expect(screen.getByText(/Consumo vs Receita/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Período anterior')).toBeInTheDocument();
    expect(screen.getByLabelText('Próximo período')).toBeInTheDocument();
    expect(screen.queryByText('dom')).not.toBeInTheDocument();
    expect(screen.queryByText('seg')).not.toBeInTheDocument();
    expect(screen.getAllByText('Receitas').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Despesas').length).toBeGreaterThan(0);
  });

  it('mostra itens do periodo em Projetado para categoria pendente da Gestao de Contas', () => {
    financeStoreMock.useFinanceStore.mockReturnValue({
      transactions: [
        makeTransaction({
          id: 'pet-current',
          description: 'Plano de saúde da gata',
          categoryId: 'cat-pet',
          amount: 13.2,
          date: '2026-04-20',
          dueDate: '2026-04-20',
          isPaid: false,
          accountId: 'acc-1',
          recurrenceId: 'rec-pet',
        }),
        makeTransaction({
          id: 'pet-previous',
          description: 'Plano de saúde da gata março',
          categoryId: 'cat-pet',
          amount: 13.2,
          date: '2026-03-20',
          dueDate: '2026-03-20',
          isPaid: false,
          accountId: 'acc-1',
          recurrenceId: 'rec-pet',
        }),
      ],
      categories: [makeCategory('cat-pet', 'Pet')],
      creditCards: [],
      accounts: [],
      viewDate: new Date(2026, 3, 15),
      setViewDate: vi.fn(),
    });

    render(<ReportsDashboard />);

    fireEvent.click(screen.getAllByTestId(/category-ranking-bar-/)[0].closest('button') as HTMLButtonElement);

    const analysisCard = screen.getByText('Análise de Categoria').closest('.bg-white') as HTMLElement;
    expect(within(analysisCard).getAllByText('R$ 13,20').length).toBeGreaterThan(0);
    expect(within(analysisCard).getByText('Plano de saúde da gata')).toBeInTheDocument();
    expect(within(analysisCard).queryByText('Nenhum item no período')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Realizado' }));

    const realizedAnalysisCard = screen.getByText('Análise de Categoria').closest('.bg-white') as HTMLElement;
    expect(within(realizedAnalysisCard).getAllByText('R$ 0,00').length).toBeGreaterThan(0);
    expect(within(realizedAnalysisCard).queryByText('Plano de saúde da gata')).not.toBeInTheDocument();
  });

  it('usa bucket canonico de Acordo na Analise de Categoria', () => {
    financeStoreMock.useFinanceStore.mockReturnValue({
      transactions: [
        makeTransaction({
          id: 'agreement-current',
          description: 'Parcela acordo abril',
          amount: 90.39,
          debtId: 'debt-1',
          date: '2026-04-20',
          isPaid: true,
          accountId: 'acc-1',
          transactionType: 'installment',
        }),
        makeTransaction({
          id: 'agreement-previous',
          description: 'Parcela acordo marco',
          amount: 45.2,
          debtId: 'debt-1',
          date: '2026-03-20',
          isPaid: true,
          accountId: 'acc-1',
          transactionType: 'installment',
        }),
      ],
      categories: [],
      creditCards: [],
      accounts: [],
      viewDate: new Date(2026, 3, 15),
      setViewDate: vi.fn(),
    });

    render(<ReportsDashboard />);

    fireEvent.click(screen.getAllByTestId(/category-ranking-bar-/)[0].closest('button') as HTMLButtonElement);

    const analysisCard = screen.getByText('Análise de Categoria').closest('.bg-white') as HTMLElement;
    expect(within(analysisCard).getAllByText('R$ 90,39').length).toBeGreaterThan(0);
    expect(within(analysisCard).getAllByText('R$ 45,20').length).toBeGreaterThan(0);
  });

  it('usa bucket canonico de Renegociacao e respeita Projetado x Realizado na Analise de Categoria', () => {
    financeStoreMock.useFinanceStore.mockReturnValue({
      transactions: [
        makeTransaction({
          id: 'reneg-current',
          description: 'Renegociação de Pendências (1/9)',
          amount: 483.86,
          categoryId: 'cat-uncategorized',
          transactionType: 'installment',
          cardId: 'card-1',
          invoiceMonthYear: '2026-04',
          date: '2026-04-18',
          isPaid: false,
          accountId: 'acc-1',
        }),
      ],
      categories: [makeCategory('cat-uncategorized', 'Não Identificados')],
      creditCards: [],
      accounts: [],
      viewDate: new Date(2026, 3, 15),
      setViewDate: vi.fn(),
    });

    render(<ReportsDashboard />);

    fireEvent.click(screen.getAllByTestId(/category-ranking-bar-/)[0].closest('button') as HTMLButtonElement);

    let analysisCard = screen.getByText('Análise de Categoria').closest('.bg-white') as HTMLElement;
    expect(within(analysisCard).getAllByText('R$ 483,86').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Realizado' }));

    analysisCard = screen.getByText('Análise de Categoria').closest('.bg-white') as HTMLElement;
    expect(within(analysisCard).getAllByText('R$ 0,00').length).toBeGreaterThan(0);
  });

  it('recalcula a Analise de Categoria em visoes de semestre e ano', () => {
    financeStoreMock.useFinanceStore.mockReturnValue({
      transactions: [
        makeTransaction({
          id: 'semester-current',
          description: 'Transporte 1S 2026',
          categoryId: 'cat-transport',
          amount: 300,
          date: '2026-02-10',
          isPaid: false,
          accountId: 'acc-1',
        }),
        makeTransaction({
          id: 'semester-previous',
          description: 'Transporte 2S 2025',
          categoryId: 'cat-transport',
          amount: 150,
          date: '2025-10-10',
          isPaid: false,
          accountId: 'acc-1',
        }),
        makeTransaction({
          id: 'year-current',
          description: 'Transporte 2026',
          categoryId: 'cat-transport',
          amount: 200,
          date: '2026-09-10',
          isPaid: false,
          accountId: 'acc-1',
        }),
        makeTransaction({
          id: 'year-previous',
          description: 'Transporte 2025',
          categoryId: 'cat-transport',
          amount: 100,
          date: '2025-04-10',
          isPaid: false,
          accountId: 'acc-1',
        }),
      ],
      categories: [makeCategory('cat-transport', 'Transporte')],
      creditCards: [],
      accounts: [],
      viewDate: new Date(2026, 2, 15),
      setViewDate: vi.fn(),
    });

    render(<ReportsDashboard />);

    fireEvent.click(screen.getByRole('button', { name: 'Semestre' }));
    fireEvent.click(screen.getAllByTestId(/category-ranking-bar-/)[0].closest('button') as HTMLButtonElement);

    let analysisCard = screen.getByText('Análise de Categoria').closest('.bg-white') as HTMLElement;
    expect(within(analysisCard).getAllByText('R$ 300,00').length).toBeGreaterThan(0);
    expect(within(analysisCard).getAllByText('R$ 150,00').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Ano' }));

    analysisCard = screen.getByText('Análise de Categoria').closest('.bg-white') as HTMLElement;
    expect(within(analysisCard).getAllByText('R$ 500,00').length).toBeGreaterThan(0);
    expect(within(analysisCard).getAllByText('R$ 250,00').length).toBeGreaterThan(0);
  });
});

