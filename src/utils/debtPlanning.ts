import type { Debt } from '@/types/finance';
import type { MonthPlanEngineResult } from '@/utils/monthPlan';

// ─── Tipos ──────────────────────────────────────────────────

export type DebtPriority = 'urgent' | 'high' | 'medium' | 'low';
export type DebtRecommendation = 'pay' | 'maintain' | 'negotiate';

export interface DebtPlanningItem {
  debtId: string;
  name: string;
  remainingAmount: number;
  installmentAmount: number;
  interestRateMonthly: number;
  priority: DebtPriority;
  recommendation: DebtRecommendation;
  reason: string;
  isHighRisk: boolean;
  dueDay?: number;
}

export interface DebtPlanningSummary {
  totalRemaining: number;
  totalMonthlyCommitment: number;
  highestInterestRate: number;
  averageInterestRate: number;
  activeCount: number;
  monthlyIncomeRatio: number;
}

export interface DebtPlanningRecommendation {
  title: string;
  message: string;
}

export interface DebtPlanningInput {
  debts: Debt[];
  monthPlan: MonthPlanEngineResult;
  viewDate: Date;
}

export interface DebtPlanningResult {
  items: DebtPlanningItem[];
  summary: DebtPlanningSummary;
  priorityDebts: DebtPlanningItem[];
  highPriorityDebts: DebtPlanningItem[];
  debtsToMaintain: DebtPlanningItem[];
  recommendations: DebtPlanningRecommendation[];
}

// ─── Helpers ────────────────────────────────────────────────

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const ESSENTIAL_KEYWORDS = [
  'aluguel',
  'moradia',
  'luz',
  'energia',
  'agua',
  'saude',
  'transporte',
  'escola',
  'alimentacao',
  'mercado',
  'condominio',
  'internet',
  'gas',
];

function isEssentialDebt(debt: Debt): boolean {
  const normalized = normalizeText(debt.name);
  return ESSENTIAL_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function getMonthlyPayment(debt: Debt): number {
  return Math.abs(Number(debt.installmentAmount || debt.minimumPayment || 0));
}

function isActiveDebt(debt: Debt): boolean {
  return debt.status !== 'paid' && Number(debt.remainingAmount || 0) > 0;
}

function isDueSoon(debt: Debt, viewDate: Date): boolean {
  if (!debt.dueDay) return false;
  const currentDay = viewDate.getDate();
  const daysUntilDue = debt.dueDay >= currentDay
    ? debt.dueDay - currentDay
    : 0;
  return daysUntilDue >= 0 && daysUntilDue <= 5;
}

function isOverdue(debt: Debt, viewDate: Date): boolean {
  if (!debt.dueDay) return false;
  return viewDate.getDate() > debt.dueDay;
}

function formatRate(rate: number): string {
  return (rate * 100).toFixed(1);
}

// ─── Classificação ──────────────────────────────────────────

function classifyPriority(debt: Debt, viewDate: Date): DebtPriority {
  const overdue = isOverdue(debt, viewDate);
  const dueSoon = isDueSoon(debt, viewDate);
  const essential = isEssentialDebt(debt);

  // Atrasada ou vencendo nos próximos 5 dias → urgente
  if (overdue || dueSoon) {
    return 'urgent';
  }

  // Essencial sem vencimento próximo → pelo menos high
  if (essential) {
    return 'high';
  }

  // Juros altos (acima de 5% a.m.) → alta
  // interestRateMonthly é armazenado em escala decimal: 0.05 = 5%
  if (debt.interestRateMonthly > 0.05) {
    return 'high';
  }

  // Prioridade manual do usuário (quanto menor o número, mais prioritário)
  if (debt.strategyPriority != null && debt.strategyPriority <= 2) {
    return 'high';
  }

  // Juros moderados (acima de 2% a.m.)
  if (debt.interestRateMonthly > 0.02) {
    return 'medium';
  }

  return 'low';
}

function classifyRecommendation(
  debt: Debt,
  priority: DebtPriority,
  monthPlan: MonthPlanEngineResult,
): DebtRecommendation {
  const monthlyPayment = getMonthlyPayment(debt);

  // Sem capacidade segura para dívidas → manter no mínimo
  if (monthPlan.debtPaymentCapacity <= 0) {
    return 'maintain';
  }

  // Urgentes ou altas com folga → pagar
  if (
    (priority === 'urgent' || priority === 'high') &&
    monthlyPayment <= monthPlan.debtPaymentCapacity
  ) {
    return 'pay';
  }

  // Parcela acima de 1,5× a capacidade segura → considerar renegociação
  if (monthlyPayment > monthPlan.debtPaymentCapacity * 1.5) {
    return 'negotiate';
  }

  // Média com alguma folga → pagar
  if (priority === 'medium' && monthlyPayment <= monthPlan.safeToSpend * 0.3) {
    return 'pay';
  }

  return 'maintain';
}

function buildReason(
  debt: Debt,
  priority: DebtPriority,
  recommendation: DebtRecommendation,
  viewDate: Date,
): string {
  if (priority === 'urgent' && isOverdue(debt, viewDate)) {
    return 'Essa dívida já passou do vencimento neste mês.';
  }

  if (priority === 'urgent' && isDueSoon(debt, viewDate)) {
    return 'O vencimento está nos próximos dias.';
  }

  if (recommendation === 'negotiate') {
    return 'A parcela está acima da sua margem segura atual. Pode valer renegociar.';
  }

  if (priority === 'high' && debt.interestRateMonthly > 0.05) {
    return `Juros de ${formatRate(debt.interestRateMonthly)}% ao mês pesam no saldo restante.`;
  }

  if (priority === 'high' && isEssentialDebt(debt)) {
    return 'Dívida ligada a serviço essencial. Manter em dia evita cortes.';
  }

  if (recommendation === 'pay') {
    return 'Há margem para manter ou acelerar esse pagamento com segurança.';
  }

  return 'Seguir com o pagamento mínimo planejado é suficiente por enquanto.';
}

function evaluateHighRisk(debt: Debt): boolean {
  // Juros altos (escala decimal: 0.05 = 5%)
  if (debt.interestRateMonthly > 0.05) return true;

  // Saldo remanescente maior que 10× a parcela (dívida muito longa)
  const monthly = getMonthlyPayment(debt);
  if (monthly > 0 && debt.remainingAmount / monthly > 10) return true;

  // Fatura parcelada — sinalizador informativo; não altera prioridade
  if (debt.debtType === 'invoice_installment') return true;

  return false;
}

// ─── Motor Principal ────────────────────────────────────────

export function buildDebtPlanning({
  debts,
  monthPlan,
  viewDate,
}: DebtPlanningInput): DebtPlanningResult {
  const safeDebts = Array.isArray(debts) ? debts : [];

  const activeDebts = safeDebts.filter(isActiveDebt);

  const items: DebtPlanningItem[] = activeDebts
    .map((debt) => {
      const priority = classifyPriority(debt, viewDate);
      const recommendation = classifyRecommendation(debt, priority, monthPlan);
      const reason = buildReason(debt, priority, recommendation, viewDate);
      const isHighRisk = evaluateHighRisk(debt);

      return {
        debtId: debt.id,
        name: debt.name,
        remainingAmount: Number(debt.remainingAmount || 0),
        installmentAmount: getMonthlyPayment(debt),
        interestRateMonthly: debt.interestRateMonthly,
        priority,
        recommendation,
        reason,
        isHighRisk,
        dueDay: debt.dueDay,
      };
    })
    .sort((a, b) => {
      const order: Record<DebtPriority, number> = {
        urgent: 0,
        high: 1,
        medium: 2,
        low: 3,
      };
      return order[a.priority] - order[b.priority];
    });

  // Resumo
  const totalRemaining = items.reduce((sum, i) => sum + i.remainingAmount, 0);
  const totalMonthlyCommitment = items.reduce(
    (sum, i) => sum + i.installmentAmount,
    0,
  );
  const rates = items.map((i) => i.interestRateMonthly).filter((r) => r > 0);
  const highestInterestRate = rates.length > 0 ? Math.max(...rates) : 0;
  const averageInterestRate =
    rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;

  const monthlyIncomeRatio =
    monthPlan.expectedIncome > 0
      ? totalMonthlyCommitment / monthPlan.expectedIncome
      : 0;

  const summary: DebtPlanningSummary = {
    totalRemaining,
    totalMonthlyCommitment,
    highestInterestRate,
    averageInterestRate,
    activeCount: items.length,
    monthlyIncomeRatio,
  };

  // Agrupamentos — separação limpa
  // priorityDebts: urgent + high, independente de recommendation
  const priorityDebts = items.filter(
    (i) => i.priority === 'urgent' || i.priority === 'high',
  );

  // highPriorityDebts: apenas high (subconjunto de priorityDebts)
  const highPriorityDebts = items.filter((i) => i.priority === 'high');

  // debtsToMaintain: somente recommendation === 'maintain' (sem mistura com priority)
  const debtsToMaintain = items.filter((i) => i.recommendation === 'maintain');

  const recommendations = buildRecommendations(items, summary, monthPlan);

  return {
    items,
    summary,
    priorityDebts,
    highPriorityDebts,
    debtsToMaintain,
    recommendations,
  };
}

// ─── Recomendações ──────────────────────────────────────────

function buildRecommendations(
  items: DebtPlanningItem[],
  summary: DebtPlanningSummary,
  monthPlan: MonthPlanEngineResult,
): DebtPlanningRecommendation[] {
  const recommendations: DebtPlanningRecommendation[] = [];

  if (items.length === 0) {
    recommendations.push({
      title: 'Nenhuma dívida ativa no momento.',
      message:
        'Continue mantendo o controle. Sem compromissos de dívida, a margem do mês fica mais livre.',
    });
    return recommendations;
  }

  // Comprometimento alto da renda (> 30%)
  if (summary.monthlyIncomeRatio > 0.3) {
    recommendations.push({
      title: 'As dívidas consomem uma parte relevante da renda.',
      message: `Cerca de ${(summary.monthlyIncomeRatio * 100).toFixed(0)}% da receita prevista vai para parcelas de dívida. Quando possível, tente reduzir esse peso.`,
    });
  }

  // Juros altos presentes (> 5% a.m.)
  const highInterestItems = items.filter((i) => i.interestRateMonthly > 0.05);
  if (highInterestItems.length > 0) {
    recommendations.push({
      title: 'Há dívidas com juros acima de 5% ao mês.',
      message:
        'Esses itens tendem a crescer rápido. Se houver margem, priorizar a quitação deles pode aliviar o saldo mais adiante.',
    });
  }

  // Sem capacidade para dívidas este mês
  if (monthPlan.debtPaymentCapacity <= 0 && items.length > 0) {
    recommendations.push({
      title: 'O mês não tem folga segura para acelerar pagamentos.',
      message:
        'Manter as parcelas no mínimo planejado é a melhor estratégia por enquanto. Proteja o caixa do mês antes de antecipar.',
    });
  }

  // Há capacidade disponível
  if (
    monthPlan.debtPaymentCapacity > 0 &&
    items.some((i) => i.recommendation === 'pay')
  ) {
    recommendations.push({
      title: 'Há margem para acelerar algum pagamento.',
      message: `A leitura do mês indica capacidade segura de até ${monthPlan.debtPaymentCapacity.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} para dívidas.`,
    });
  }

  // Dívidas essenciais presentes
  const essentialDebts = items.filter((i) => {
    const normalized = normalizeText(i.name);
    return ESSENTIAL_KEYWORDS.some((kw) => normalized.includes(kw));
  });
  if (essentialDebts.length > 0) {
    recommendations.push({
      title: 'Algumas dívidas estão ligadas a serviços essenciais.',
      message:
        'Manter esses pagamentos em dia evita cortes e encargos adicionais.',
    });
  }

  // Itens que pedem renegociação
  const negotiateItems = items.filter((i) => i.recommendation === 'negotiate');
  if (negotiateItems.length > 0) {
    recommendations.push({
      title: 'Algumas parcelas estão acima da margem segura.',
      message:
        'Pode valer conversar com o credor sobre condições melhores de prazo ou valor.',
    });
  }

  return recommendations;
}
