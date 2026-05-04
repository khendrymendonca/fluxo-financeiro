import { describe, expect, it } from 'vitest';
import type { Debt } from '@/types/finance';
import type { MonthPlanEngineResult } from '@/utils/monthPlan';
import { buildDebtPlanning } from '@/utils/debtPlanning';

// ─── Factories ──────────────────────────────────────────────

function makeDebt(overrides: Partial<Debt> = {}): Debt {
  return {
    id: overrides.id ?? 'debt-1',
    userId: overrides.userId ?? 'user-1',
    name: overrides.name ?? 'Divida Teste',
    totalAmount: overrides.totalAmount ?? 2000,
    remainingAmount: overrides.remainingAmount ?? 1200,
    installmentAmount: overrides.installmentAmount ?? 200,
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

function makePlan(overrides: Partial<MonthPlanEngineResult> = {}): MonthPlanEngineResult {
  return {
    monthStatus: overrides.monthStatus ?? 'safe',
    expectedIncome: overrides.expectedIncome ?? 5000,
    receivedIncome: overrides.receivedIncome ?? 5000,
    paidExpenses: overrides.paidExpenses ?? 1000,
    pendingExpenses: overrides.pendingExpenses ?? 500,
    essentialExpenses: overrides.essentialExpenses ?? 1500,
    variableExpenses: overrides.variableExpenses ?? 300,
    cardCommitments: overrides.cardCommitments ?? 0,
    debtCommitments: overrides.debtCommitments ?? 200,
    totalCommitted: overrides.totalCommitted ?? 2000,
    projectedBalance: overrides.projectedBalance ?? 3000,
    safeToSpend: overrides.safeToSpend ?? 1500,
    debtPaymentCapacity: overrides.debtPaymentCapacity ?? 600,
    upcomingMustPay: overrides.upcomingMustPay ?? [],
    deferableItems: overrides.deferableItems ?? [],
    alerts: overrides.alerts ?? [],
    recommendedActions: overrides.recommendedActions ?? [],
  };
}

// ─── Testes ─────────────────────────────────────────────────

describe('buildDebtPlanning', () => {
  // viewDate com dia 15 do mês — referência neutra para testes de vencimento
  const viewDate = new Date('2026-04-15T12:00:00');

  it('classifica divida com juros altos como high e isHighRisk', () => {
    const result = buildDebtPlanning({
      viewDate,
      monthPlan: makePlan(),
      debts: [makeDebt({ interestRateMonthly: 0.08 })],
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].priority).toBe('high');
    expect(result.items[0].isHighRisk).toBe(true);
  });

  it('classifica divida vencida como urgent', () => {
    // dueDay: 10 — viewDate é dia 15 → already overdue
    const result = buildDebtPlanning({
      viewDate,
      monthPlan: makePlan(),
      debts: [makeDebt({ dueDay: 10 })],
    });

    expect(result.items[0].priority).toBe('urgent');
  });

  it('classifica divida vencendo em 5 dias como urgent', () => {
    // viewDate: dia 15 → dueDay: 20 (5 dias) → dueSoon
    const result = buildDebtPlanning({
      viewDate,
      monthPlan: makePlan(),
      debts: [makeDebt({ dueDay: 20 })],
    });

    expect(result.items[0].priority).toBe('urgent');
  });

  it('classifica divida essencial sem vencimento proximo como high', () => {
    const result = buildDebtPlanning({
      viewDate,
      monthPlan: makePlan(),
      debts: [
        makeDebt({
          name: 'Aluguel residencial',
          interestRateMonthly: 0,
          dueDay: 28, // dia 28 — 13 dias adiante, fora do range de 5 dias
        }),
      ],
    });

    expect(result.items[0].priority).toBe('high');
    expect(result.items[0].reason).toContain('essencial');
  });

  it('filtra dividas com status paid', () => {
    const result = buildDebtPlanning({
      viewDate,
      monthPlan: makePlan(),
      debts: [
        makeDebt({ id: 'active-1', status: 'active' }),
        makeDebt({ id: 'paid-1', status: 'paid' }),
      ],
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].debtId).toBe('active-1');
  });

  it('filtra dividas com remainingAmount zero', () => {
    const result = buildDebtPlanning({
      viewDate,
      monthPlan: makePlan(),
      debts: [makeDebt({ remainingAmount: 0 })],
    });

    expect(result.items).toHaveLength(0);
    expect(result.summary.activeCount).toBe(0);
  });

  it('recomenda maintain para todos quando debtPaymentCapacity e zero', () => {
    const result = buildDebtPlanning({
      viewDate,
      monthPlan: makePlan({ debtPaymentCapacity: 0 }),
      debts: [
        makeDebt({ id: 'urgent-1', dueDay: 10 }),
        makeDebt({ id: 'high-1', interestRateMonthly: 0.08 }),
        makeDebt({ id: 'low-1', interestRateMonthly: 0.01 }),
      ],
    });

    expect(result.items.every((i) => i.recommendation === 'maintain')).toBe(true);
  });

  it('recomenda pay para urgent e high quando ha capacidade disponivel', () => {
    const result = buildDebtPlanning({
      viewDate,
      monthPlan: makePlan({ debtPaymentCapacity: 1000 }),
      debts: [
        makeDebt({ id: 'urgent-1', dueDay: 10, installmentAmount: 300 }),
        makeDebt({ id: 'high-1', interestRateMonthly: 0.08, installmentAmount: 400 }),
      ],
    });

    expect(result.items.find((i) => i.debtId === 'urgent-1')?.recommendation).toBe('pay');
    expect(result.items.find((i) => i.debtId === 'high-1')?.recommendation).toBe('pay');
  });

  it('invoice_installment entra em isHighRisk sem virar urgent nem alterar priority', () => {
    const result = buildDebtPlanning({
      viewDate,
      monthPlan: makePlan(),
      debts: [
        makeDebt({
          name: 'Fatura Parcelada',
          debtType: 'invoice_installment',
          interestRateMonthly: 0,
          dueDay: undefined,
        }),
      ],
    });

    expect(result.items[0].isHighRisk).toBe(true);
    expect(result.items[0].priority).not.toBe('urgent');
  });

  it('priorityDebts contem urgent e high independente de recommendation', () => {
    const result = buildDebtPlanning({
      viewDate,
      monthPlan: makePlan({ debtPaymentCapacity: 0 }), // força maintain para todos
      debts: [
        makeDebt({ id: 'urgent-1', dueDay: 10 }),
        makeDebt({ id: 'high-1', interestRateMonthly: 0.08 }),
        makeDebt({ id: 'low-1', interestRateMonthly: 0.01 }),
      ],
    });

    const priorityIds = result.priorityDebts.map((i) => i.debtId);
    expect(priorityIds).toContain('urgent-1');
    expect(priorityIds).toContain('high-1');
    expect(priorityIds).not.toContain('low-1');
    // Mesmo com recommendation === 'maintain', devem estar em priorityDebts
    expect(result.priorityDebts.every((i) => i.recommendation === 'maintain')).toBe(true);
  });

  it('debtsToMaintain nao mistura com priorityDebts por priority', () => {
    const result = buildDebtPlanning({
      viewDate,
      monthPlan: makePlan({ debtPaymentCapacity: 1000 }),
      debts: [
        makeDebt({ id: 'urgent-pay', dueDay: 10, installmentAmount: 200 }),
        makeDebt({ id: 'low-maintain', interestRateMonthly: 0.005, installmentAmount: 50 }),
      ],
    });

    const maintainIds = result.debtsToMaintain.map((i) => i.debtId);
    // urgent com capacidade vai para 'pay', não para 'maintain'
    expect(maintainIds).not.toContain('urgent-pay');
    expect(maintainIds).toContain('low-maintain');
  });

  it('summary calcula corretamente totais e ratios', () => {
    const result = buildDebtPlanning({
      viewDate,
      monthPlan: makePlan({ expectedIncome: 4000 }),
      debts: [
        makeDebt({ id: 'a', remainingAmount: 1000, installmentAmount: 200, interestRateMonthly: 0.03 }),
        makeDebt({ id: 'b', remainingAmount: 500, installmentAmount: 100, interestRateMonthly: 0.01 }),
      ],
    });

    expect(result.summary.totalRemaining).toBe(1500);
    expect(result.summary.totalMonthlyCommitment).toBe(300);
    expect(result.summary.activeCount).toBe(2);
    expect(result.summary.monthlyIncomeRatio).toBeCloseTo(300 / 4000);
    expect(result.summary.highestInterestRate).toBe(0.03);
    expect(result.summary.averageInterestRate).toBeCloseTo(0.02);
  });

  it('retorna lista vazia e recomendacao neutra quando nao ha dividas', () => {
    const result = buildDebtPlanning({
      viewDate,
      monthPlan: makePlan(),
      debts: [],
    });

    expect(result.items).toHaveLength(0);
    expect(result.priorityDebts).toHaveLength(0);
    expect(result.debtsToMaintain).toHaveLength(0);
    expect(result.recommendations[0].title).toContain('Nenhuma dívida');
  });

  it('ordena items por prioridade: urgent > high > medium > low', () => {
    const result = buildDebtPlanning({
      viewDate,
      monthPlan: makePlan(),
      debts: [
        makeDebt({ id: 'low', interestRateMonthly: 0.005 }),
        makeDebt({ id: 'urgent', dueDay: 10 }),
        makeDebt({ id: 'high', interestRateMonthly: 0.08 }),
        makeDebt({ id: 'medium', interestRateMonthly: 0.03 }),
      ],
    });

    const priorities = result.items.map((i) => i.priority);
    expect(priorities[0]).toBe('urgent');
    expect(priorities[1]).toBe('high');
    expect(priorities[2]).toBe('medium');
    expect(priorities[3]).toBe('low');
  });
});
