import { describe, expect, it } from 'vitest';
import type { Category, Debt, Transaction } from '@/types/finance';
import { buildMonthPlan } from '@/utils/monthPlan';

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

describe('buildMonthPlan', () => {
  const viewDate = new Date('2026-04-15T12:00:00');
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

  it('classifica um mes positivo como seguro e calcula folga com conservadorismo', () => {
    const result = buildMonthPlan({
      viewDate,
      debtSafeBaseline: 600,
      categories: [essentialCategory, lifestyleCategory],
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
      ],
    });

    expect(result.monthStatus).toBe('safe');
    expect(result.expectedIncome).toBe(5000);
    expect(result.receivedIncome).toBe(5000);
    expect(result.paidExpenses).toBe(1500);
    expect(result.pendingExpenses).toBe(1100);
    expect(result.essentialExpenses).toBe(2200);
    expect(result.variableExpenses).toBe(400);
    expect(result.cardCommitments).toBe(300);
    expect(result.debtCommitments).toBe(250);
    expect(result.totalCommitted).toBe(3150);
    expect(result.projectedBalance).toBe(1850);
    expect(result.safeToSpend).toBe(1600);
    expect(result.debtPaymentCapacity).toBe(600);
    expect(result.upcomingMustPay.map((item) => item.id)).toEqual(['groceries']);
    expect(result.deferableItems.map((item) => item.id)).toEqual(['trip']);
    expect(result.recommendedActions.some((action) => action.type === 'save')).toBe(true);
  });

  it('marca o mes como attention quando os proximos vencimentos pressionam a renda', () => {
    const result = buildMonthPlan({
      viewDate,
      categories: [essentialCategory, lifestyleCategory],
      debts: [],
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

    expect(result.monthStatus).toBe('attention');
    expect(result.projectedBalance).toBe(500);
    expect(result.upcomingMustPay.map((item) => item.id)).toEqual(['school']);
    expect(result.alerts.some((alert) => alert.severity === 'warning')).toBe(false);
  });

  it('marca o mes como critical quando a projecao fica negativa', () => {
    const result = buildMonthPlan({
      viewDate,
      debtSafeBaseline: 300,
      categories: [essentialCategory, lifestyleCategory],
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

    expect(result.monthStatus).toBe('critical');
    expect(result.projectedBalance).toBe(-700);
    expect(result.safeToSpend).toBe(0);
    expect(result.debtPaymentCapacity).toBe(0);
    expect(result.alerts.some((alert) => alert.severity === 'danger')).toBe(true);
    expect(result.recommendedActions.some((action) => action.type === 'avoid')).toBe(true);
  });

  it('destaca compromissos proximos e atrasados que merecem atencao', () => {
    const result = buildMonthPlan({
      viewDate,
      categories: [essentialCategory, lifestyleCategory],
      debts: [],
      transactions: [
        makeTransaction({
          id: 'income-1',
          type: 'income',
          description: 'Salario',
          amount: 2000,
          date: '2026-04-05',
          isPaid: true,
        }),
        makeTransaction({
          id: 'late-bill',
          categoryId: 'essential',
          description: 'Conta atrasada',
          amount: 250,
          date: '2026-04-10',
          isPaid: false,
        }),
        makeTransaction({
          id: 'next-bill',
          categoryId: 'essential',
          description: 'Conta da semana',
          amount: 320,
          date: '2026-04-20',
          isPaid: false,
        }),
        makeTransaction({
          id: 'future-optional',
          categoryId: 'lifestyle',
          description: 'Compra adiada',
          amount: 180,
          date: '2026-04-29',
          isPaid: false,
        }),
      ],
    });

    expect(result.upcomingMustPay.map((item) => item.id)).toEqual(['late-bill', 'next-bill']);
    expect(result.upcomingMustPay[0]?.isOverdue).toBe(true);
    expect(result.deferableItems.map((item) => item.id)).toEqual(['future-optional']);
    expect(result.alerts.some((alert) => alert.title.includes('atrasados'))).toBe(true);
    expect(result.recommendedActions[0]?.type).toBe('pay');
  });

  it('zera a capacidade de divida quando o mes esta negativo', () => {
    const result = buildMonthPlan({
      viewDate,
      debtSafeBaseline: 800,
      categories: [essentialCategory],
      debts: [makeDebt({ installmentAmount: 200 })],
      transactions: [
        makeTransaction({
          id: 'income-1',
          type: 'income',
          description: 'Salario',
          amount: 1000,
          date: '2026-04-05',
          isPaid: true,
        }),
        makeTransaction({
          id: 'essential-1',
          categoryId: 'essential',
          description: 'Moradia',
          amount: 900,
          date: '2026-04-06',
          isPaid: true,
        }),
        makeTransaction({
          id: 'essential-2',
          categoryId: 'essential',
          description: 'Mercado',
          amount: 400,
          date: '2026-04-17',
          isPaid: false,
        }),
      ],
    });

    expect(result.projectedBalance).toBeLessThan(0);
    expect(result.debtPaymentCapacity).toBe(0);
  });

  it('trata despesas essenciais maiores que a renda como estado critico', () => {
    const result = buildMonthPlan({
      viewDate,
      categories: [essentialCategory],
      debts: [makeDebt({ installmentAmount: 100 })],
      transactions: [
        makeTransaction({
          id: 'income-1',
          type: 'income',
          description: 'Salario',
          amount: 1500,
          date: '2026-04-05',
          isPaid: true,
        }),
        makeTransaction({
          id: 'home',
          categoryId: 'essential',
          description: 'Moradia',
          amount: 1000,
          date: '2026-04-04',
          isPaid: true,
          isRecurring: true,
        }),
        makeTransaction({
          id: 'food',
          categoryId: 'essential',
          description: 'Alimentacao',
          amount: 700,
          date: '2026-04-18',
          isPaid: false,
        }),
      ],
    });

    expect(result.essentialExpenses).toBe(1700);
    expect(result.monthStatus).toBe('critical');
    expect(result.alerts.some((alert) => alert.title.includes('despesas essenciais'))).toBe(true);
  });

  it('retorna uma leitura neutra quando nao ha dados no mes', () => {
    const result = buildMonthPlan({
      viewDate,
      categories: [],
      debts: [],
      transactions: [],
    });

    expect(result.monthStatus).toBe('safe');
    expect(result.expectedIncome).toBe(0);
    expect(result.totalCommitted).toBe(0);
    expect(result.safeToSpend).toBe(0);
    expect(result.debtPaymentCapacity).toBe(0);
    expect(result.alerts[0]?.severity).toBe('info');
    expect(result.recommendedActions[0]?.type).toBe('review');
  });
});
