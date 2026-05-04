import { describe, expect, it } from 'vitest';
import { evaluatePaymentDecision } from '@/utils/paymentDecision';
import type { MonthPlanEngineResult } from '@/utils/monthPlan';

function makeMonthPlan(overrides: Partial<MonthPlanEngineResult> = {}): MonthPlanEngineResult {
  return {
    monthStatus: 'safe',
    expectedIncome: 5000,
    receivedIncome: 5000,
    paidExpenses: 1200,
    pendingExpenses: 800,
    essentialExpenses: 1500,
    variableExpenses: 500,
    cardCommitments: 300,
    debtCommitments: 200,
    totalCommitted: 2500,
    projectedBalance: 2500,
    safeToSpend: 1000,
    debtPaymentCapacity: 400,
    upcomingMustPay: [],
    deferableItems: [],
    alerts: [],
    recommendedActions: [],
    ...overrides,
  };
}

describe('evaluatePaymentDecision', () => {
  it('aprova compra a vista que cabe com seguranca', () => {
    const result = evaluatePaymentDecision({
      type: 'purchase',
      amount: 300,
      monthPlan: makeMonthPlan(),
    });

    expect(result.decision).toBe('recommended');
    expect(result.safeMarginAfter).toBe(700);
    expect(result.suggestedMaxAmount).toBe(1000);
  });

  it('marca compra a vista como atencao quando consome a margem segura', () => {
    const result = evaluatePaymentDecision({
      type: 'purchase',
      amount: 1200,
      monthPlan: makeMonthPlan({ safeToSpend: 1000, projectedBalance: 1500 }),
    });

    expect(result.decision).toBe('attention');
    expect(result.safeMarginAfter).toBe(-200);
  });

  it('recusa compra que nao cabe', () => {
    const result = evaluatePaymentDecision({
      type: 'purchase',
      amount: 1800,
      monthPlan: makeMonthPlan({ safeToSpend: 1000, projectedBalance: 1500 }),
    });

    expect(result.decision).toBe('not_recommended');
  });

  it('marca parcelamento como atencao quando cabe, mas consome parte forte da margem', () => {
    const result = evaluatePaymentDecision({
      type: 'installment',
      amount: 900,
      installments: 3,
      monthPlan: makeMonthPlan({ safeToSpend: 500 }),
    });

    expect(result.decision).toBe('attention');
    expect(result.currentMonthImpact).toBe(300);
    expect(result.suggestedMaxAmount).toBe(1500);
  });

  it('marca parcelamento como atencao quando compromete parte forte da margem', () => {
    const result = evaluatePaymentDecision({
      type: 'installment',
      amount: 1200,
      installments: 2,
      monthPlan: makeMonthPlan({ safeToSpend: 1000 }),
    });

    expect(result.decision).toBe('attention');
    expect(result.futureImpact?.monthlyAmount).toBe(600);
  });

  it('marca pagamento de divida como atencao quando zera a margem segura', () => {
    const result = evaluatePaymentDecision({
      type: 'debt_payment',
      amount: 400,
      monthPlan: makeMonthPlan({ debtPaymentCapacity: 400 }),
    });

    expect(result.decision).toBe('attention');
    expect(result.safeMarginAfter).toBe(0);
  });

  it('recusa acordo acima da capacidade usada pelo motor de dividas', () => {
    const result = evaluatePaymentDecision({
      type: 'agreement',
      amount: 2400,
      installments: 3,
      monthPlan: makeMonthPlan({ safeToSpend: 500, projectedBalance: 500 }),
    });

    expect(result.decision).toBe('not_recommended');
    expect(result.suggestedMaxAmount).toBe(1200);
  });

  it('recusa acordo acima da capacidade segura para dividas', () => {
    const result = evaluatePaymentDecision({
      type: 'agreement',
      amount: 1200,
      installments: 3,
      monthPlan: makeMonthPlan({
        safeToSpend: 1000,
        projectedBalance: 1000,
        debtPaymentCapacity: 300,
      }),
    });

    expect(result.decision).toBe('not_recommended');
    expect(result.currentMonthImpact).toBe(400);
    expect(result.safeMarginAfter).toBe(-100);
    expect(result.suggestedMaxAmount).toBe(900);
  });

  it('trata dados vazios ou valor zero com retorno defensivo', () => {
    const result = evaluatePaymentDecision({
      type: 'purchase',
      amount: 0,
      monthPlan: makeMonthPlan({ safeToSpend: 0, debtPaymentCapacity: 0, projectedBalance: 0 }),
    });

    expect(result.decision).toBe('attention');
    expect(result.currentMonthImpact).toBe(0);
  });
});
