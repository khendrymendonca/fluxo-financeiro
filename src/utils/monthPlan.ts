import { addDays, endOfMonth, isAfter, isBefore, startOfDay, startOfMonth } from 'date-fns';
import { Category, Debt, Transaction } from '@/types/finance';
import { parseLocalDate } from '@/utils/dateUtils';

export type MonthStatus = 'safe' | 'attention' | 'critical';
export type MonthPlanAlertSeverity = 'info' | 'warning' | 'danger';
export type MonthPlanActionType = 'pay' | 'avoid' | 'review' | 'negotiate' | 'save';
export type MonthPlanItemKind = 'essential' | 'variable' | 'card' | 'debt';

export interface MonthPlanAlert {
  severity: MonthPlanAlertSeverity;
  title: string;
  message: string;
}

export interface MonthPlanRecommendedAction {
  type: MonthPlanActionType;
  title: string;
  message: string;
  amount?: number;
}

export interface MonthPlanItem {
  id: string;
  description: string;
  amount: number;
  date: string;
  kind: MonthPlanItemKind;
  isOverdue: boolean;
  isUpcoming: boolean;
  canDefer: boolean;
}

export interface MonthPlanInput {
  transactions: Transaction[];
  categories: Category[];
  debts?: Debt[];
  viewDate: Date;
  debtSafeBaseline?: number;
  upcomingWindowDays?: number;
}

export interface MonthPlanEngineResult {
  monthStatus: MonthStatus;
  expectedIncome: number;
  receivedIncome: number;
  paidExpenses: number;
  pendingExpenses: number;
  essentialExpenses: number;
  variableExpenses: number;
  cardCommitments: number;
  debtCommitments: number;
  totalCommitted: number;
  projectedBalance: number;
  safeToSpend: number;
  debtPaymentCapacity: number;
  upcomingMustPay: MonthPlanItem[];
  deferableItems: MonthPlanItem[];
  alerts: MonthPlanAlert[];
  recommendedActions: MonthPlanRecommendedAction[];
}

function normalizeAmount(value: number | string | undefined | null): number {
  return Math.abs(Number(value || 0));
}

function isMonthTransaction(transaction: Transaction, monthStart: Date, monthEnd: Date): boolean {
  const date = parseLocalDate(transaction.date);
  return !isBefore(date, monthStart) && !isAfter(date, monthEnd);
}

function isRelevantIncome(transaction: Transaction): boolean {
  return transaction.type === 'income' && !transaction.isTransfer;
}

function isRelevantExpense(transaction: Transaction): boolean {
  return transaction.type === 'expense' && !transaction.isTransfer && !transaction.isInvoicePayment;
}

function isCardCommitment(transaction: Transaction): boolean {
  return isRelevantExpense(transaction) && Boolean(transaction.cardId);
}

function isDebtRelated(transaction: Transaction): boolean {
  return Boolean(transaction.debtId);
}

function isEssentialExpense(transaction: Transaction, categoryById: Map<string, Category>): boolean {
  if (isDebtRelated(transaction)) return false;
  if (transaction.isRecurring || transaction.transactionType === 'recurring') return true;

  const category = transaction.categoryId ? categoryById.get(transaction.categoryId) : undefined;
  return Boolean(category?.isFixed || category?.budgetGroup === 'essential');
}

function buildCommitmentItem(
  transaction: Transaction,
  categoryById: Map<string, Category>,
  referenceDay: Date,
  upcomingDeadline: Date
): MonthPlanItem {
  const date = parseLocalDate(transaction.date);
  const amount = normalizeAmount(transaction.amount);
  const overdue = isBefore(date, referenceDay);
  const upcoming = overdue || !isAfter(date, upcomingDeadline);
  const card = isCardCommitment(transaction);
  const debt = isDebtRelated(transaction);
  const essential = isEssentialExpense(transaction, categoryById);

  let kind: MonthPlanItemKind = 'variable';
  if (debt) kind = 'debt';
  else if (card) kind = 'card';
  else if (essential) kind = 'essential';

  const canDefer = !overdue && !upcoming && kind === 'variable';

  return {
    id: transaction.id,
    description: transaction.description,
    amount,
    date: transaction.date,
    kind,
    isOverdue: overdue,
    isUpcoming: upcoming,
    canDefer,
  };
}

function getActiveDebtCommitments(debts: Debt[]): number {
  return debts
    .filter((debt) => debt.status !== 'paid' && Number(debt.remainingAmount || 0) > 0)
    .reduce((sum, debt) => sum + normalizeAmount(debt.installmentAmount || debt.minimumPayment || 0), 0);
}

function getActiveDebtCount(debts: Debt[]): number {
  return debts.filter((debt) => debt.status !== 'paid' && Number(debt.remainingAmount || 0) > 0).length;
}

function buildSafetyBuffer(
  expectedIncome: number,
  essentialExpenses: number,
  pendingExpenses: number,
  upcomingMustPayTotal: number
): number {
  const incomeGuard = expectedIncome * 0.05;
  const essentialsGuard = essentialExpenses * 0.1;
  const pendingGuard = pendingExpenses * 0.15;
  const urgencyGuard = upcomingMustPayTotal * 0.25;

  return Math.max(incomeGuard, essentialsGuard, pendingGuard, urgencyGuard, 0);
}

export function buildMonthPlan({
  transactions,
  categories,
  debts = [],
  viewDate,
  debtSafeBaseline = 0,
  upcomingWindowDays = 7,
}: MonthPlanInput): MonthPlanEngineResult {
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeDebts = Array.isArray(debts) ? debts : [];

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const referenceDay = startOfDay(viewDate);
  const upcomingDeadline = addDays(referenceDay, upcomingWindowDays);
  const categoryById = new Map(safeCategories.map((category) => [category.id, category]));

  const monthTransactions = safeTransactions.filter((transaction) => isMonthTransaction(transaction, monthStart, monthEnd));
  const incomes = monthTransactions.filter(isRelevantIncome);
  const expenses = monthTransactions.filter(isRelevantExpense);
  const debtExpenseTransactions = expenses.filter(isDebtRelated);
  const nonDebtNonCardExpenses = expenses.filter((transaction) => !transaction.cardId && !isDebtRelated(transaction));

  const expectedIncome = incomes.reduce((sum, transaction) => sum + normalizeAmount(transaction.amount), 0);
  const receivedIncome = incomes
    .filter((transaction) => transaction.isPaid)
    .reduce((sum, transaction) => sum + normalizeAmount(transaction.amount), 0);

  const paidExpenses = nonDebtNonCardExpenses
    .filter((transaction) => transaction.isPaid)
    .reduce((sum, transaction) => sum + normalizeAmount(transaction.amount), 0);

  const pendingExpenseTransactions = expenses.filter((transaction) => !transaction.isPaid && !transaction.cardId);
  const pendingExpenses = nonDebtNonCardExpenses
    .filter((transaction) => !transaction.isPaid)
    .reduce((sum, transaction) => sum + normalizeAmount(transaction.amount), 0);

  const essentialExpenses = nonDebtNonCardExpenses
    .filter((transaction) => isEssentialExpense(transaction, categoryById))
    .reduce((sum, transaction) => sum + normalizeAmount(transaction.amount), 0);

  const variableExpenses = nonDebtNonCardExpenses
    .filter((transaction) => !isEssentialExpense(transaction, categoryById))
    .reduce((sum, transaction) => sum + normalizeAmount(transaction.amount), 0);

  const cardCommitments = expenses
    .filter(isCardCommitment)
    .reduce((sum, transaction) => sum + normalizeAmount(transaction.amount), 0);

  const activeDebtCommitments = getActiveDebtCommitments(safeDebts);
  const activeDebtCount = getActiveDebtCount(safeDebts);
  const debtTransactionCommitments = debtExpenseTransactions.reduce((sum, transaction) => sum + normalizeAmount(transaction.amount), 0);
  const debtCommitments = Math.max(activeDebtCommitments, debtTransactionCommitments);
  const totalCommitted = paidExpenses + pendingExpenses + cardCommitments + debtCommitments;
  const projectedBalance = expectedIncome - totalCommitted;

  const commitmentItems = pendingExpenseTransactions
    .map((transaction) => buildCommitmentItem(transaction, categoryById, referenceDay, upcomingDeadline))
    .sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());

  const upcomingMustPay = commitmentItems.filter((item) => item.isUpcoming);
  const deferableItems = commitmentItems.filter((item) => item.canDefer);
  const upcomingMustPayTotal = upcomingMustPay.reduce((sum, item) => sum + item.amount, 0);

  const safetyBuffer = buildSafetyBuffer(expectedIncome, essentialExpenses, pendingExpenses, upcomingMustPayTotal);
  const rawSafeToSpend = projectedBalance - safetyBuffer;
  const safeToSpend = Math.max(0, rawSafeToSpend);

  const normalizedDebtBaseline = Math.max(0, Number(debtSafeBaseline || 0));
  const debtPaymentCapacity = projectedBalance <= 0 || essentialExpenses > expectedIncome || activeDebtCount === 0
    ? 0
    : Math.max(0, Math.min(normalizedDebtBaseline, safeToSpend * 0.6, projectedBalance * 0.5));

  let monthStatus: MonthStatus = 'safe';
  if (expectedIncome === 0 && totalCommitted === 0) {
    monthStatus = 'safe';
  } else if (projectedBalance < 0 || essentialExpenses > expectedIncome) {
    monthStatus = 'critical';
  } else if (rawSafeToSpend <= 0 || upcomingMustPayTotal > expectedIncome * 0.35) {
    monthStatus = 'attention';
  }

  const alerts: MonthPlanAlert[] = [];

  if (expectedIncome === 0 && totalCommitted === 0) {
    alerts.push({
      severity: 'info',
      title: 'Ainda não há dados suficientes.',
      message: 'Sem receitas e compromissos lançados, o plano do mês permanece neutro até novos dados entrarem.',
    });
  }

  if (essentialExpenses > expectedIncome && expectedIncome > 0) {
    alerts.push({
      severity: 'danger',
      title: 'As despesas essenciais já superam a renda prevista.',
      message: 'Antes de pensar em novos gastos, o mês precisa de corte, renegociação ou reforço de receita.',
    });
  }

  if (projectedBalance < 0) {
    alerts.push({
      severity: 'danger',
      title: 'Há risco de fechamento negativo.',
      message: `A projeção do mês aponta ${Math.abs(projectedBalance).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} abaixo do necessário.`,
    });
  }

  if (upcomingMustPay.some((item) => item.isOverdue)) {
    alerts.push({
      severity: 'warning',
      title: 'Existem compromissos atrasados ou vencendo agora.',
      message: 'Esses itens merecem prioridade antes de qualquer novo gasto opcional.',
    });
  }

  if (cardCommitments > 0) {
    alerts.push({
      severity: monthStatus === 'critical' ? 'warning' : 'info',
      title: 'Parte do mês já está comprometida no cartão.',
      message: `Há ${cardCommitments.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} em compromissos no crédito dentro desta leitura.`,
    });
  }

  if (debtCommitments > 0 && debtPaymentCapacity === 0) {
    alerts.push({
      severity: monthStatus === 'critical' ? 'danger' : 'warning',
      title: 'Não há folga segura para acelerar dívidas.',
      message: 'Neste mês, a prioridade deve ser proteger o caixa mínimo antes de antecipar pagamentos adicionais.',
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      severity: 'info',
      title: 'Seu mês está respirando bem.',
      message: 'A leitura atual indica margem para decidir com calma, mantendo disciplina no restante do período.',
    });
  }

  const recommendedActions: MonthPlanRecommendedAction[] = [];

  if (expectedIncome === 0 && totalCommitted === 0) {
    recommendedActions.push({
      type: 'review',
      title: 'Lance a base do mês antes de decidir.',
      message: 'Registre receitas e compromissos principais para que o plano consiga orientar o que cabe fazer agora.',
    });
  }

  if (upcomingMustPayTotal > 0) {
    recommendedActions.push({
      type: 'pay',
      title: 'Proteja os próximos compromissos primeiro.',
      message: `Separe ${upcomingMustPayTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} para os itens mais urgentes do mês.`,
      amount: upcomingMustPayTotal,
    });
  }

  if (monthStatus === 'critical') {
    recommendedActions.push({
      type: 'avoid',
      title: 'Evite novos parcelamentos agora.',
      message: 'O mês já está pressionado e novas parcelas ampliam o risco de fechamento negativo.',
    });
    recommendedActions.push({
      type: 'review',
      title: 'Revise gastos variáveis e adiáveis.',
      message: 'Priorize cortes nos itens não essenciais antes de mexer em compromissos estruturais.',
    });
  } else if (monthStatus === 'attention') {
    recommendedActions.push({
      type: 'review',
      title: 'Revise o restante do mês antes de ampliar gastos.',
      message: 'A folga existe, mas está curta para decisões impulsivas.',
    });
  } else if (expectedIncome > 0 || totalCommitted > 0) {
    recommendedActions.push({
      type: 'save',
      title: 'Guarde parte da folga como proteção.',
      message: `Você ainda pode gastar com segurança, mas manter uma reserva de ${safetyBuffer.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} deixa o mês mais sólido.`,
      amount: safetyBuffer,
    });
  }

  if (debtCommitments > 0 && debtPaymentCapacity > 0) {
    recommendedActions.push({
      type: 'pay',
      title: 'Há espaço seguro para acelerar dívidas.',
      message: `A margem conservadora para dívidas neste mês é ${debtPaymentCapacity.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`,
      amount: debtPaymentCapacity,
    });
  } else if (debtCommitments > 0) {
    recommendedActions.push({
      type: monthStatus === 'critical' ? 'negotiate' : 'review',
      title: monthStatus === 'critical' ? 'Negocie o peso das dívidas.' : 'Mantenha as dívidas no mínimo planejado.',
      message: monthStatus === 'critical'
        ? 'Sem folga segura, a melhor defesa é renegociar prazo, parcela ou prioridade.'
        : 'Sem folga suficiente para acelerar, preserve o fluxo principal do mês.',
    });
  }

  if (deferableItems.length > 0) {
    recommendedActions.push({
      type: 'review',
      title: 'Há itens que podem ser adiados sem ferir o essencial.',
      message: `${deferableItems.length} compromisso(s) aparecem como adiáveis nesta leitura inicial do mês.`,
    });
  }

  return {
    monthStatus,
    expectedIncome,
    receivedIncome,
    paidExpenses,
    pendingExpenses,
    essentialExpenses,
    variableExpenses,
    cardCommitments,
    debtCommitments,
    totalCommitted,
    projectedBalance,
    safeToSpend,
    debtPaymentCapacity,
    upcomingMustPay,
    deferableItems,
    alerts,
    recommendedActions,
  };
}
