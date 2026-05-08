import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Account, Category, Debt, Transaction } from '@/types/finance';
import MonthPlanPage from '@/pages/MonthPlanPage';
import { buildMonthPlan } from '@/utils/monthPlan';

const financeStoreMock = vi.hoisted(() => ({
  useFinanceStore: vi.fn(),
}));

const debtProjectionMock = vi.hoisted(() => ({
  useDebtProjection: vi.fn(),
}));

const featureFlagsMock = vi.hoisted(() => ({
  useFeatureFlag: vi.fn(),
}));

const mobileMock = vi.hoisted(() => ({
  useIsMobile: vi.fn(),
}));

vi.mock('@/hooks/useFinanceStore', () => financeStoreMock);
vi.mock('@/hooks/useDebtProjection', () => debtProjectionMock);
vi.mock('@/hooks/useFeatureFlags', () => featureFlagsMock);
vi.mock('@/hooks/useIsMobile', () => mobileMock);
vi.mock('@/components/dashboard/MonthSelector', () => ({
  MonthSelector: () => <div>Month selector mock</div>,
}));
vi.mock('@/pages/LegacyDashboardHome', () => ({
  LegacyDashboardHome: () => <div>Legacy dashboard mock</div>,
}));

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: overrides.id ?? 'category-1',
    userId: overrides.userId ?? 'user-1',
    groupId: overrides.groupId ?? 'group-1',
    name: overrides.name ?? 'Categoria',
    type: overrides.type ?? 'expense',
    budgetGroup: overrides.budgetGroup ?? 'lifestyle',
    isActive: overrides.isActive ?? true,
    isFixed: overrides.isFixed,
    targetAmount: overrides.targetAmount,
    budgetLimit: overrides.budgetLimit,
    icon: overrides.icon,
    color: overrides.color,
  };
}

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: overrides.id ?? 'account-1',
    userId: overrides.userId ?? 'user-1',
    name: overrides.name ?? 'Conta',
    bank: overrides.bank ?? 'Banco',
    institution: overrides.institution ?? 'Banco',
    balance: overrides.balance ?? 0,
    color: overrides.color ?? '#0f766e',
    icon: overrides.icon,
    accountType: overrides.accountType ?? 'corrente',
    hasOverdraft: overrides.hasOverdraft,
    overdraftLimit: overrides.overdraftLimit,
  };
}

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: overrides.id ?? `tx-${Math.random().toString(36).slice(2, 8)}`,
    userId: overrides.userId ?? 'user-1',
    type: overrides.type ?? 'expense',
    transactionType: overrides.transactionType ?? 'punctual',
    description: overrides.description ?? 'Transacao',
    amount: overrides.amount ?? 0,
    date: overrides.date ?? '2026-04-01',
    isPaid: overrides.isPaid ?? false,
    categoryId: overrides.categoryId,
    subcategoryId: overrides.subcategoryId,
    accountId: overrides.accountId,
    cardId: overrides.cardId,
    paymentDate: overrides.paymentDate,
    installmentGroupId: overrides.installmentGroupId,
    installmentNumber: overrides.installmentNumber,
    installmentTotal: overrides.installmentTotal,
    invoiceMonthYear: overrides.invoiceMonthYear,
    isRecurring: overrides.isRecurring,
    recurrence: overrides.recurrence,
    debtId: overrides.debtId,
    isInvoicePayment: overrides.isInvoicePayment,
    isTransfer: overrides.isTransfer,
    isVirtual: overrides.isVirtual,
    isAutomatic: overrides.isAutomatic,
    originalBillId: overrides.originalBillId,
    originalId: overrides.originalId,
    deleted_at: overrides.deleted_at,
  };
}

function makeDebt(overrides: Partial<Debt> = {}): Debt {
  return {
    id: overrides.id ?? 'debt-1',
    userId: overrides.userId ?? 'user-1',
    name: overrides.name ?? 'Divida',
    totalAmount: overrides.totalAmount ?? 2000,
    remainingAmount: overrides.remainingAmount ?? 1200,
    installmentAmount: overrides.installmentAmount ?? 250,
    interestRateMonthly: overrides.interestRateMonthly ?? 0.02,
    startDate: overrides.startDate ?? '2026-01-01',
    endDate: overrides.endDate,
    dueDay: overrides.dueDay,
    strategyPriority: overrides.strategyPriority,
    minimumPayment: overrides.minimumPayment,
    accountId: overrides.accountId,
    status: overrides.status ?? 'active',
    totalInstallments: overrides.totalInstallments,
    cardId: overrides.cardId,
    debtType: overrides.debtType,
  };
}

const essentialCategory = makeCategory({
  id: 'essential',
  name: 'Moradia',
  budgetGroup: 'essential',
  isFixed: true,
});

const lifestyleCategory = makeCategory({
  id: 'lifestyle',
  name: 'Lazer',
  budgetGroup: 'lifestyle',
});

function renderPage({
  accounts = [makeAccount({ id: 'checking', balance: 3000 }), makeAccount({ id: 'wallet', balance: 500 })],
  transactions = [],
  debts = [],
  flags = { decision_engine: true, debt_strategy: true },
}: {
  accounts?: Account[];
  transactions?: Transaction[];
  debts?: Debt[];
  flags?: Record<string, boolean>;
}) {
  featureFlagsMock.useFeatureFlag.mockImplementation((key: string) => Boolean(flags[key]));
  mobileMock.useIsMobile.mockReturnValue(false);
  debtProjectionMock.useDebtProjection.mockReturnValue({
    diagnostico: { sobraReal: 500 },
    activeDebts: debts,
  });
  financeStoreMock.useFinanceStore.mockReturnValue({
    accounts,
    categories: [essentialCategory, lifestyleCategory],
    transactions,
    currentMonthTransactions: transactions,
    debts,
    viewDate: new Date('2026-04-15T12:00:00'),
  });

  render(
    <MonthPlanPage
      isBalanceVisible
      onRefreshData={vi.fn()}
      onOpenTransactionForm={vi.fn()}
      onOpenTransferForm={vi.fn()}
      onNavigateToBills={vi.fn()}
      onNavigateToTransactions={vi.fn()}
    />
  );
}

describe('MonthPlanPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mostra a estrutura principal como painel de caixa consolidado', () => {
    renderPage({
      debts: [makeDebt()],
      transactions: [
        makeTransaction({
          id: 'income-1',
          type: 'income',
          transactionType: 'recurring',
          description: 'Salario',
          amount: 5000,
          date: '2026-04-05',
          isPaid: true,
        }),
        makeTransaction({
          id: 'rent',
          categoryId: 'essential',
          transactionType: 'recurring',
          description: 'Aluguel',
          amount: 1500,
          date: '2026-04-05',
          isPaid: true,
          isRecurring: true,
        }),
        makeTransaction({
          id: 'groceries',
          categoryId: 'essential',
          description: 'Mercado',
          amount: 700,
          date: '2026-04-20',
          isPaid: false,
        }),
        makeTransaction({
          id: 'late-bill',
          categoryId: 'essential',
          description: 'Conta atrasada',
          amount: 250,
          date: '2026-03-20',
          isPaid: false,
        }),
        makeTransaction({
          id: 'today-bill',
          categoryId: 'essential',
          description: 'Conta de hoje',
          amount: 180,
          date: '2026-04-15',
          isPaid: false,
        }),
        makeTransaction({
          id: 'trip',
          categoryId: 'lifestyle',
          description: 'Passeio',
          amount: 400,
          date: '2026-04-26',
          isPaid: false,
        }),
        makeTransaction({
          id: 'card-1',
          categoryId: 'lifestyle',
          description: 'Compra no cartao',
          amount: 300,
          date: '2026-04-10',
          isPaid: false,
          cardId: 'card-1',
        }),
        makeTransaction({
          id: 'card-2',
          categoryId: 'lifestyle',
          description: 'Segunda compra no cartao',
          amount: 200,
          date: '2026-04-11',
          isPaid: false,
          cardId: 'card-2',
        }),
      ],
    });

    expect(screen.getByText('Painel de Abril de 2026')).toBeInTheDocument();
    expect(screen.getByText('Total em contas')).toBeInTheDocument();
    expect(screen.getByText('Despesas em aberto')).toBeInTheDocument();
    expect(screen.getAllByText('Saldo').length).toBeGreaterThan(0);
    expect(screen.getByText('Vencidas')).toBeInTheDocument();
    expect(screen.getByText('Vencimentos próximos')).toBeInTheDocument();
    expect(screen.getByText('Conta atrasada')).toBeInTheDocument();
    expect(screen.getByText('Conta de hoje')).toBeInTheDocument();
    expect(screen.getByText('Mercado')).toBeInTheDocument();
    expect(screen.getAllByText(/Vencida/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Hoje/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Em breve/i).length).toBeGreaterThan(0);
    expect(screen.queryByText('Entradas do mes')).not.toBeInTheDocument();
    expect(screen.queryByText('Compromissos do mes')).not.toBeInTheDocument();
    expect(screen.queryByText('Fluxo do mes')).not.toBeInTheDocument();
    expect(screen.queryByText('Fluxo do mês')).not.toBeInTheDocument();
    expect(screen.queryByText('Acordos em andamento')).not.toBeInTheDocument();
    expect(screen.queryByText('Proximos impactos')).not.toBeInTheDocument();
    expect(screen.queryByText('Próximos impactos')).not.toBeInTheDocument();
    expect(screen.queryByText('O que chega primeiro')).not.toBeInTheDocument();
    expect(screen.queryByText('Resumo do mes')).not.toBeInTheDocument();
    expect(screen.queryByText(/Mes com maior peso/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Margem livre')).not.toBeInTheDocument();
    expect(screen.queryByText(/Margem/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Pressao de dividas')).not.toBeInTheDocument();
    expect(screen.queryByText('O que fazer agora')).not.toBeInTheDocument();
    expect(screen.queryByText('Decisao recomendada')).not.toBeInTheDocument();
    expect(screen.queryByText('Pode esperar')).not.toBeInTheDocument();
    expect(screen.queryByText(/A historia visual/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Cards, composicao e comparacoes/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Posso pagar?')).not.toBeInTheDocument();
    expect(screen.queryByText('Dividas no plano')).not.toBeInTheDocument();
  });

  it('sinaliza um mes em atencao', () => {
    renderPage({
      transactions: [
        makeTransaction({
          id: 'income-1',
          type: 'income',
          description: 'Salario',
          amount: 3000,
          date: '2026-04-05',
          isPaid: true,
        }),
        makeTransaction({
          id: 'fixed-paid',
          categoryId: 'essential',
          description: 'Aluguel',
          amount: 1000,
          date: '2026-04-03',
          isPaid: true,
          isRecurring: true,
        }),
        makeTransaction({
          id: 'school',
          categoryId: 'essential',
          description: 'Escola',
          amount: 1200,
          date: '2026-04-18',
          isPaid: false,
        }),
        makeTransaction({
          id: 'fun',
          categoryId: 'lifestyle',
          description: 'Lazer',
          amount: 300,
          date: '2026-04-28',
          isPaid: false,
        }),
      ],
    });

    expect(screen.getByText('Painel de Abril de 2026')).toBeInTheDocument();
    expect(screen.queryByText('Fluxo do mes')).not.toBeInTheDocument();
    expect(screen.queryByText('Fluxo do mês')).not.toBeInTheDocument();
    expect(screen.getAllByText('Saldo').length).toBeGreaterThan(0);
  });

  it('sinaliza um mes critico e prioriza defesa do caixa', () => {
    renderPage({
      debts: [makeDebt({ installmentAmount: 300, remainingAmount: 900 })],
      transactions: [
        makeTransaction({
          id: 'income-1',
          type: 'income',
          description: 'Salario',
          amount: 2500,
          date: '2026-04-05',
          isPaid: true,
        }),
        makeTransaction({
          id: 'rent',
          categoryId: 'essential',
          description: 'Aluguel',
          amount: 1600,
          date: '2026-04-06',
          isPaid: true,
          isRecurring: true,
        }),
        makeTransaction({
          id: 'market',
          categoryId: 'essential',
          description: 'Mercado',
          amount: 900,
          date: '2026-04-19',
          isPaid: false,
        }),
        makeTransaction({
          id: 'extras',
          categoryId: 'lifestyle',
          description: 'Outros',
          amount: 400,
          date: '2026-04-22',
          isPaid: false,
        }),
      ],
    });

    expect(screen.getAllByText('Saldo').length).toBeGreaterThan(0);
    expect(screen.queryByText('Fluxo do mes')).not.toBeInTheDocument();
    expect(screen.queryByText('Fluxo do mês')).not.toBeInTheDocument();
    expect(screen.queryByText(/Mes com maior peso/i)).not.toBeInTheDocument();
  });

  it('trata o estado sem dados de forma neutra', () => {
    renderPage({
      transactions: [],
      debts: [],
    });

    expect(screen.getByText('Painel de Abril de 2026')).toBeInTheDocument();
    expect(screen.queryByText('Fluxo do mes')).not.toBeInTheDocument();
    expect(screen.queryByText('Fluxo do mês')).not.toBeInTheDocument();
    expect(screen.getByText('Vencimentos próximos')).toBeInTheDocument();
    expect(screen.queryByText('Resumo do mes')).not.toBeInTheDocument();
  });

  it('remove simulacao e acordos do painel principal mesmo com flags ativas', () => {
    renderPage({
      debts: [makeDebt()],
      transactions: [
        makeTransaction({
          id: 'income-1',
          type: 'income',
          description: 'Salario',
          amount: 5000,
          date: '2026-04-05',
          isPaid: true,
        }),
      ],
      flags: {
        decision_engine: false,
        debt_strategy: false,
      },
    });

    expect(screen.queryByText('Posso pagar?')).not.toBeInTheDocument();
    expect(screen.queryByText('Acordos em andamento')).not.toBeInTheDocument();
  });

  it('calcula essenciais e estilo de vida pelo budgetGroup da categoria', () => {
    const plan = buildMonthPlan({
      transactions: [
        makeTransaction({
          id: 'income',
          type: 'income',
          description: 'Salario',
          amount: 3000,
          date: '2026-04-05',
          isPaid: true,
        }),
        makeTransaction({
          id: 'essential-expense',
          categoryId: 'essential',
          description: 'Mercado',
          amount: 600,
          date: '2026-04-10',
          isPaid: false,
        }),
        makeTransaction({
          id: 'recurring-lifestyle',
          categoryId: 'lifestyle',
          transactionType: 'recurring',
          isRecurring: true,
          description: 'Streaming',
          amount: 120,
          date: '2026-04-11',
          isPaid: false,
        }),
      ],
      categories: [essentialCategory, lifestyleCategory],
      debts: [],
      viewDate: new Date('2026-04-15T12:00:00'),
      debtSafeBaseline: 0,
    });

    expect(plan.essentialExpenses).toBe(600);
    expect(plan.variableExpenses).toBe(120);
  });

  it('calcula cartao somando todos os cartoes e acordos pelo compromisso mensal', () => {
    const plan = buildMonthPlan({
      transactions: [
        makeTransaction({
          id: 'income',
          type: 'income',
          description: 'Salario',
          amount: 4000,
          date: '2026-04-05',
          isPaid: true,
        }),
        makeTransaction({
          id: 'card-a',
          categoryId: 'lifestyle',
          description: 'Compra cartao 1',
          amount: 300,
          date: '2026-04-08',
          isPaid: false,
          cardId: 'card-1',
        }),
        makeTransaction({
          id: 'card-b',
          categoryId: 'lifestyle',
          description: 'Compra cartao 2',
          amount: 200,
          date: '2026-04-09',
          isPaid: false,
          cardId: 'card-2',
        }),
        makeTransaction({
          id: 'invoice-payment',
          categoryId: 'lifestyle',
          description: 'Pagamento de fatura',
          amount: 500,
          date: '2026-04-20',
          isPaid: true,
          cardId: 'card-1',
          isInvoicePayment: true,
        }),
        makeTransaction({
          id: 'debt-transaction',
          categoryId: 'lifestyle',
          description: 'Parcela isolada menor',
          amount: 100,
          date: '2026-04-14',
          isPaid: false,
          debtId: 'debt-1',
        }),
      ],
      categories: [essentialCategory, lifestyleCategory],
      debts: [makeDebt({ installmentAmount: 350, remainingAmount: 5000, minimumPayment: 200 })],
      viewDate: new Date('2026-04-15T12:00:00'),
      debtSafeBaseline: 0,
    });

    expect(plan.cardCommitments).toBe(500);
    expect(plan.debtCommitments).toBe(350);
    expect(plan.projectedBalance).toBe(3150);
  });
});
