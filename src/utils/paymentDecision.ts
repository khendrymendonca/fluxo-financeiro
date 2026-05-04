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
      message: 'Sem um valor valido, nao da para estimar o impacto no mes.',
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
        title: 'A compra cabe no mes.',
        message: 'O valor cabe dentro da sua margem segura atual.',
        currentMonthImpact: normalizedAmount,
        safeMarginAfter,
        suggestedMaxAmount: safeToSpend,
      };
    }

    if (normalizedAmount <= projectedBalance) {
      return {
        decision: 'attention',
        title: 'A compra e possivel, mas pede atencao.',
        message: 'Ela consome a margem segura e deixa o mes mais sensivel.',
        currentMonthImpact: normalizedAmount,
        safeMarginAfter,
        suggestedMaxAmount: safeToSpend,
      };
    }

    return {
      decision: 'not_recommended',
      title: 'A compra nao cabe neste mes.',
      message: 'Ela empurra o plano alem da margem disponivel.',
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
            : 'A parcela cabe com seguranca dentro da leitura atual.'
          : 'A parcela pressiona alem da margem segura deste mes.',
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
            ? 'O acordo cabe, mas consome uma parte relevante da sua margem segura para dividas.'
            : 'O acordo cabe dentro da sua capacidade segura para dividas.'
          : projectedBalance > 0
            ? 'O acordo pode ate caber no fechamento bruto do mes, mas fica acima da sua capacidade segura para dividas.'
            : 'O acordo fica acima da sua capacidade segura para dividas neste mes.',
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
    title: 'Impacto do pagamento de divida.',
    message:
      normalizedAmount <= debtCapacity
        ? safeMarginAfter <= 0
          ? 'O pagamento cabe, mas zera sua margem segura para dividas neste mes.'
          : 'O pagamento cabe dentro da capacidade segura para dividas.'
        : 'O valor esta acima da sua capacidade segura para dividas neste mes.',
    currentMonthImpact: normalizedAmount,
    safeMarginAfter,
    suggestedMaxAmount: debtCapacity,
  };
}
