import type { MonthPlanEngineResult } from '@/utils/monthPlan';

export type PaymentDecisionType =
  | 'purchase'
  | 'installment'
  | 'debt_payment'
  | 'agreement';

export type PaymentDecisionLevel =
  | 'recommended'
  | 'attention'
  | 'not_recommended';

export interface PaymentDecisionInput {
  type: PaymentDecisionType;
  amount: number;
  installments?: number;
  startDate?: Date;
  monthPlan: MonthPlanEngineResult;
}

export interface PaymentDecisionFutureImpact {
  monthlyAmount: number;
  installments: number;
  monthsAffected: number;
}

export interface PaymentDecisionResult {
  decision: PaymentDecisionLevel;
  title: string;
  message: string;
  currentMonthImpact: number;
  safeMarginAfter: number;
  futureImpact?: PaymentDecisionFutureImpact;
  suggestedMaxAmount?: number;
}

function normalizeCurrency(value: number | string | undefined | null): number {
  return Math.max(0, Number(value || 0));
}

function normalizeInstallments(value: number | undefined): number {
  return Math.max(1, Math.floor(Number(value || 1)));
}

export function evaluatePaymentDecision({
  type,
  amount,
  installments,
  monthPlan,
}: PaymentDecisionInput): PaymentDecisionResult {
  const normalizedAmount = normalizeCurrency(amount);
  const normalizedInstallments = normalizeInstallments(installments);
  const safeToSpend = normalizeCurrency(monthPlan.safeToSpend);
  const projectedBalance = normalizeCurrency(monthPlan.projectedBalance);
  const debtCapacity = normalizeCurrency(monthPlan.debtPaymentCapacity);

  if (!normalizedAmount) {
    return {
      decision: 'attention',
      title: 'Informe um valor para simular.',
      message: 'Sem um valor válido, não dá para estimar o impacto no mês.',
      currentMonthImpact: 0,
      safeMarginAfter: safeToSpend,
      suggestedMaxAmount:
        type === 'installment'
          ? safeToSpend * normalizedInstallments
          : type === 'agreement'
            ? debtCapacity * normalizedInstallments
            : type === 'debt_payment'
              ? debtCapacity
              : safeToSpend,
    };
  }

  if (type === 'purchase') {
    const safeMarginAfter = safeToSpend - normalizedAmount;

    if (normalizedAmount <= safeToSpend) {
      return {
        decision: 'recommended',
        title: 'A compra cabe no mês.',
        message: 'O valor cabe dentro da sua margem segura atual.',
        currentMonthImpact: normalizedAmount,
        safeMarginAfter,
        suggestedMaxAmount: safeToSpend,
      };
    }

    if (normalizedAmount <= projectedBalance) {
      return {
        decision: 'attention',
        title: 'A compra é possível, mas pede atenção.',
        message: 'Ela consome a margem segura e deixa o mês mais sensível.',
        currentMonthImpact: normalizedAmount,
        safeMarginAfter,
        suggestedMaxAmount: safeToSpend,
      };
    }

    return {
      decision: 'not_recommended',
      title: 'A compra não cabe neste mês.',
      message: 'Ela empurra o plano além da margem disponível.',
      currentMonthImpact: normalizedAmount,
      safeMarginAfter,
      suggestedMaxAmount: safeToSpend,
    };
  }

  if (type === 'installment') {
    const monthlyAmount = normalizedAmount / normalizedInstallments;
    const safeMarginAfter = safeToSpend - monthlyAmount;
    const futureTight = monthlyAmount > safeToSpend * 0.5;
    const suggestedMaxAmount = safeToSpend * normalizedInstallments;

    return {
      decision:
        monthlyAmount <= safeToSpend
          ? futureTight ? 'attention' : 'recommended'
          : monthlyAmount <= projectedBalance
            ? 'attention'
            : 'not_recommended',
      title: 'Impacto do parcelamento no plano.',
      message:
        monthlyAmount <= safeToSpend
          ? futureTight
            ? 'A parcela cabe, mas consome uma parte relevante da sua margem.'
            : 'A parcela cabe com segurança dentro da leitura atual.'
          : 'A parcela pressiona além da margem segura deste mês.',
      currentMonthImpact: monthlyAmount,
      safeMarginAfter,
      futureImpact: {
        monthlyAmount,
        installments: normalizedInstallments,
        monthsAffected: normalizedInstallments,
      },
      suggestedMaxAmount,
    };
  }

  if (type === 'agreement') {
    const monthlyAmount = normalizedAmount / normalizedInstallments;
    const safeMarginAfter = debtCapacity - monthlyAmount;
    const futureTight = monthlyAmount > debtCapacity * 0.5;
    const suggestedMaxAmount = debtCapacity * normalizedInstallments;

    return {
      decision:
        monthlyAmount <= debtCapacity
          ? futureTight ? 'attention' : 'recommended'
          : 'not_recommended',
      title: 'Impacto do acordo no plano.',
      message:
        monthlyAmount <= debtCapacity
          ? futureTight
            ? 'O acordo cabe, mas consome uma parte relevante da sua margem segura para dívidas.'
            : 'O acordo cabe dentro da sua capacidade segura para dívidas.'
          : projectedBalance > 0
            ? 'O acordo pode até caber no fechamento bruto do mês, mas fica acima da sua capacidade segura para dívidas.'
            : 'O acordo fica acima da sua capacidade segura para dívidas neste mês.',
      currentMonthImpact: monthlyAmount,
      safeMarginAfter,
      futureImpact: {
        monthlyAmount,
        installments: normalizedInstallments,
        monthsAffected: normalizedInstallments,
      },
      suggestedMaxAmount,
    };
  }

  const safeMarginAfter = debtCapacity - normalizedAmount;

  return {
    decision:
      normalizedAmount <= debtCapacity
        ? safeMarginAfter <= 0 ? 'attention' : 'recommended'
        : 'not_recommended',
    title: 'Impacto do pagamento de dívida.',
    message:
      normalizedAmount <= debtCapacity
        ? safeMarginAfter <= 0
          ? 'O pagamento cabe, mas zera sua margem segura para dívidas neste mês.'
          : 'O pagamento cabe dentro da capacidade segura para dívidas.'
        : 'O valor está acima da sua capacidade segura para dívidas neste mês.',
    currentMonthImpact: normalizedAmount,
    safeMarginAfter,
    suggestedMaxAmount: debtCapacity,
  };
}
