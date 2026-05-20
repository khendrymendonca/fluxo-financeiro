import { addDays, endOfMonth, endOfYear, isAfter, isBefore, startOfDay, startOfMonth, startOfYear } from 'date-fns';
import { Account, Category, Debt, Transaction } from '@/types/finance';
import { isDateOverdue, parseLocalDate } from '@/utils/dateUtils';

export type MonthStatus = 'safe' | 'attention' | 'critical';
export type MonthPlanAlertSeverity = 'info' | 'warning' | 'danger';
export type MonthPlanActionType = 'pay' | 'avoid' | 'review' | 'negotiate' | 'save';
export type MonthPlanItemKind = 'essential' | 'variable' | 'card' | 'debt';
export type MonthPlanVisualTone = 'safe' | 'attention' | 'risk' | 'default';

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

export interface MonthPlanFlowPoint {
  key: 'income' | 'committed' | 'essential' | 'variable' | 'card' | 'debt' | 'margin';
  label: string;
  amount: number;
  ratio: number;
  tone: MonthPlanVisualTone;
  colorClass?: string;
}

export interface MonthPlanPressureBucket {
  key: MonthPlanItemKind;
  label: string;
  amount: number;
  ratio: number;
  tone: MonthPlanVisualTone;
}

export interface MonthPlanInsight {
  commitmentRatio: number;
  freeRatio: number;
  debtRatio: number;
  dominantPressureKey: MonthPlanItemKind | 'none';
  dominantPressureLabel: string;
  dominantPressureAmount: number;
  upcomingCount: number;
  overdueCount: number;
  riskScore: number;
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

export interface MonthPlanCashItem {
  id: string;
  description: string;
  amount: number;
  date: string;
  status: 'overdue' | 'today' | 'soon';
  isOverdue: boolean;
}

export interface MonthPlanInput {
  transactions: Transaction[];
  accounts?: Account[];
  categories: Category[];
  debts?: Debt[];
  viewDate: Date;
  periodMode?: 'month' | 'year';
  currentDate?: Date;
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
  totalAccountBalance: number;
  openExpensesTotal: number;
  cashBalance: number;
  overdueOpenExpensesTotal: number;
  overdueOpenExpensesCount: number;
  upcomingOpenExpenses: MonthPlanCashItem[];
  upcomingMustPay: MonthPlanItem[];
  deferableItems: MonthPlanItem[];
  alerts: MonthPlanAlert[];
  recommendedActions: MonthPlanRecommendedAction[];
  flowPoints: MonthPlanFlowPoint[];
  pressureBuckets: MonthPlanPressureBucket[];
  insight: MonthPlanInsight;
}

function normalizeAmount(value: number | string | undefined | null): number {
  return Math.abs(Number(value || 0));
}

function clampRatio(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function currencyLabel(value: number): string {
  return Math.abs(Number(value || 0)).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function isMonthTransaction(transaction: Transaction, monthStart: Date, monthEnd: Date): boolean {
  const date = parseLocalDate(transaction.date);
  return !isBefore(date, monthStart) && !isAfter(date, monthEnd);
}

function getPeriodBounds(viewDate: Date, periodMode: 'month' | 'year') {
  if (periodMode === 'year') {
    return {
      start: startOfYear(viewDate),
      end: endOfYear(viewDate),
    };
  }

  return {
    start: startOfMonth(viewDate),
    end: endOfMonth(viewDate),
  };
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
  const category = transaction.categoryId ? categoryById.get(transaction.categoryId) : undefined;
  return category?.budgetGroup === 'essential';
}

function isLifestyleExpense(transaction: Transaction, categoryById: Map<string, Category>): boolean {
  if (isDebtRelated(transaction)) return false;
  const category = transaction.categoryId ? categoryById.get(transaction.categoryId) : undefined;
  return category?.budgetGroup === 'lifestyle';
}

function buildCommitmentItem(
  transaction: Transaction,
  categoryById: Map<string, Category>,
  referenceDay: Date,
  upcomingDeadline: Date
): MonthPlanItem {
  const date = parseLocalDate(transaction.date);
  const amount = normalizeAmount(transaction.amount);
  const overdue = isDateOverdue(date, referenceDay);
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

function isOpenCashExpense(transaction: Transaction): boolean {
  return (
    transaction.type === 'expense' &&
    !transaction.isPaid &&
    !transaction.isTransfer &&
    !transaction.deleted_at &&
    (!transaction.cardId || Boolean(transaction.isInvoicePayment))
  );
}

function buildCashItem(transaction: Transaction, referenceDay: Date): MonthPlanCashItem {
  const date = parseLocalDate(transaction.date);
  const normalizedDate = startOfDay(date);
  const isOverdue = isDateOverdue(normalizedDate, referenceDay);
  const isToday = normalizedDate.getTime() === referenceDay.getTime();

  return {
    id: transaction.id,
    description: transaction.description,
    amount: normalizeAmount(transaction.amount),
    date: transaction.date,
    status: isOverdue ? 'overdue' : isToday ? 'today' : 'soon',
    isOverdue,
  };
}

function sortCashItems(a: MonthPlanCashItem, b: MonthPlanCashItem): number {
  if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;

  const dateDifference = parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime();
  if (dateDifference !== 0) return dateDifference;

  return b.amount - a.amount;
}

export function buildMonthPlan({
  transactions,
  accounts = [],
  categories,
  debts = [],
  viewDate,
  periodMode = 'month',
  currentDate,
  debtSafeBaseline = 0,
  upcomingWindowDays = 7,
}: MonthPlanInput): MonthPlanEngineResult {
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeAccounts = Array.isArray(accounts) ? accounts : [];
  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeDebts = Array.isArray(debts) ? debts : [];

  const { start: periodStart, end: periodEnd } = getPeriodBounds(viewDate, periodMode);
  const referenceDay = startOfDay(currentDate ?? new Date());
  const upcomingDeadline = addDays(referenceDay, upcomingWindowDays);
  const categoryById = new Map(safeCategories.map((category) => [category.id, category]));

  const periodTransactions = safeTransactions.filter((transaction) => isMonthTransaction(transaction, periodStart, periodEnd));
  const incomes = periodTransactions.filter(isRelevantIncome);
  const expenses = periodTransactions.filter(isRelevantExpense);
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
    .filter((transaction) => isLifestyleExpense(transaction, categoryById))
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

  const totalAccountBalance = safeAccounts.reduce((sum, account) => sum + Number(account.balance || 0), 0);
  const openExpenseItems = safeTransactions
    .filter((transaction) => isOpenCashExpense(transaction) && !isAfter(parseLocalDate(transaction.date), periodEnd))
    .map((transaction) => buildCashItem(transaction, referenceDay))
    .sort(sortCashItems);
  const currentPeriodOpenExpenseItems = safeTransactions
    .filter((transaction) => isOpenCashExpense(transaction) && isMonthTransaction(transaction, periodStart, periodEnd))
    .map((transaction) => buildCashItem(transaction, referenceDay));
  const openExpensesTotal = currentPeriodOpenExpenseItems.reduce((sum, item) => sum + item.amount, 0);
  const overdueOpenExpenses = openExpenseItems.filter((item) => item.isOverdue);
  const overdueOpenExpensesTotal = overdueOpenExpenses.reduce((sum, item) => sum + item.amount, 0);
  const cashBalance = totalAccountBalance - openExpensesTotal;

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
      title: 'Ainda nao ha dados suficientes.',
      message: 'Sem receitas e compromissos lancados, o plano do mes permanece neutro ate novos dados entrarem.',
    });
  }

  if (essentialExpenses > expectedIncome && expectedIncome > 0) {
    alerts.push({
      severity: 'danger',
      title: 'As despesas essenciais ja superam a renda prevista.',
      message: 'Antes de pensar em novos gastos, o mes precisa de corte, renegociacao ou reforco de receita.',
    });
  }

  if (projectedBalance < 0) {
    alerts.push({
      severity: 'danger',
      title: 'Ha risco de fechamento negativo.',
      message: `A projecao do mes aponta ${currencyLabel(projectedBalance)} abaixo do necessario.`,
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
      title: 'Parte do mes ja esta comprometida no cartao.',
      message: `Ha ${currencyLabel(cardCommitments)} em compromissos no credito dentro desta leitura.`,
    });
  }

  if (debtCommitments > 0 && debtPaymentCapacity === 0) {
    alerts.push({
      severity: monthStatus === 'critical' ? 'danger' : 'warning',
      title: 'Nao ha folga segura para acelerar dividas.',
      message: 'Neste mes, a prioridade deve ser proteger o caixa minimo antes de antecipar pagamentos adicionais.',
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      severity: 'info',
      title: 'Seu mes esta respirando bem.',
      message: 'A leitura atual indica margem para decidir com calma, mantendo disciplina no restante do periodo.',
    });
  }

  const recommendedActions: MonthPlanRecommendedAction[] = [];

  if (expectedIncome === 0 && totalCommitted === 0) {
    recommendedActions.push({
      type: 'review',
      title: 'Lance a base do mes antes de decidir.',
      message: 'Registre receitas e compromissos principais para que o plano consiga orientar o que cabe fazer agora.',
    });
  }

  if (upcomingMustPayTotal > 0) {
    recommendedActions.push({
      type: 'pay',
      title: 'Proteja os proximos compromissos primeiro.',
      message: `Separe ${currencyLabel(upcomingMustPayTotal)} para os itens mais urgentes do mes.`,
      amount: upcomingMustPayTotal,
    });
  }

  if (monthStatus === 'critical') {
    recommendedActions.push({
      type: 'avoid',
      title: 'Evite novos parcelamentos agora.',
      message: 'O mes ja esta pressionado e novas parcelas ampliam o risco de fechamento negativo.',
    });
    recommendedActions.push({
      type: 'review',
      title: 'Revise gastos variaveis e adiaveis.',
      message: 'Priorize cortes nos itens nao essenciais antes de mexer em compromissos estruturais.',
    });
  } else if (monthStatus === 'attention') {
    recommendedActions.push({
      type: 'review',
      title: 'Revise o restante do mes antes de ampliar gastos.',
      message: 'A folga existe, mas esta curta para decisoes impulsivas.',
    });
  } else if (expectedIncome > 0 || totalCommitted > 0) {
    recommendedActions.push({
      type: 'save',
      title: 'Guarde parte da folga como protecao.',
      message: `Voce ainda pode gastar com seguranca, mas manter uma reserva de ${currencyLabel(safetyBuffer)} deixa o mes mais solido.`,
      amount: safetyBuffer,
    });
  }

  if (debtCommitments > 0 && debtPaymentCapacity > 0) {
    recommendedActions.push({
      type: 'pay',
      title: 'Ha espaco seguro para acelerar dividas.',
      message: `A margem conservadora para dividas neste mes e ${currencyLabel(debtPaymentCapacity)}.`,
      amount: debtPaymentCapacity,
    });
  } else if (debtCommitments > 0) {
    recommendedActions.push({
      type: monthStatus === 'critical' ? 'negotiate' : 'review',
      title: monthStatus === 'critical' ? 'Negocie o peso das dividas.' : 'Mantenha as dividas no minimo planejado.',
      message: monthStatus === 'critical'
        ? 'Sem folga segura, a melhor defesa e renegociar prazo, parcela ou prioridade.'
        : 'Sem folga suficiente para acelerar, preserve o fluxo principal do mes.',
    });
  }

  if (deferableItems.length > 0) {
    recommendedActions.push({
      type: 'review',
      title: 'Ha itens que podem ser adiados sem ferir o essencial.',
      message: `${deferableItems.length} compromisso(s) aparecem como adiaveis nesta leitura inicial do mes.`,
    });
  }

  const pressureBase = Math.max(totalCommitted, 1);
  const incomeBase = Math.max(expectedIncome, 1);
  const dominantPressure = [
    { key: 'essential' as const, label: 'Essenciais', amount: essentialExpenses },
    { key: 'variable' as const, label: 'Variaveis', amount: variableExpenses },
    { key: 'card' as const, label: 'Cartao/Fatura', amount: cardCommitments },
    { key: 'debt' as const, label: 'Dividas', amount: debtCommitments },
  ].sort((a, b) => b.amount - a.amount)[0];

  const pressureBuckets: MonthPlanPressureBucket[] = [
    {
      key: 'essential',
      label: 'Essenciais',
      amount: essentialExpenses,
      ratio: clampRatio(essentialExpenses / pressureBase),
      tone: essentialExpenses > expectedIncome * 0.45 ? 'risk' : 'attention',
    },
    {
      key: 'variable',
      label: 'Estilo de vida',
      amount: variableExpenses,
      ratio: clampRatio(variableExpenses / pressureBase),
      tone: variableExpenses > expectedIncome * 0.2 ? 'attention' : 'default',
    },
    {
      key: 'card',
      label: 'Cartao/Fatura',
      amount: cardCommitments,
      ratio: clampRatio(cardCommitments / pressureBase),
      tone: cardCommitments > expectedIncome * 0.25 ? 'attention' : 'default',
    },
    {
      key: 'debt',
      label: 'Dividas',
      amount: debtCommitments,
      ratio: clampRatio(debtCommitments / pressureBase),
      tone: debtCommitments > expectedIncome * 0.2 ? 'risk' : 'attention',
    },
  ];

  const flowPoints: MonthPlanFlowPoint[] = [
    {
      key: 'income',
      label: 'Receitas',
      amount: expectedIncome,
      ratio: expectedIncome > 0 ? 1 : 0,
      tone: 'safe',
    },
    {
      key: 'committed',
      label: 'Comprometido',
      amount: totalCommitted,
      ratio: clampRatio(totalCommitted / incomeBase),
      tone: totalCommitted > expectedIncome ? 'risk' : 'attention',
    },
    {
      key: 'essential',
      label: 'Essenciais',
      amount: essentialExpenses,
      ratio: clampRatio(essentialExpenses / incomeBase),
      tone: 'attention',
    },
    {
      key: 'variable',
      label: 'Estilo de vida',
      amount: variableExpenses,
      ratio: clampRatio(variableExpenses / incomeBase),
      tone: 'default',
      colorClass: 'bg-sky-600',
    },
    {
      key: 'card',
      label: 'Cartao/Fatura',
      amount: cardCommitments,
      ratio: clampRatio(cardCommitments / incomeBase),
      tone: 'attention',
      colorClass: 'bg-emerald-600',
    },
    {
      key: 'debt',
      label: 'Acordos',
      amount: debtCommitments,
      ratio: clampRatio(debtCommitments / incomeBase),
      tone: debtCommitments > expectedIncome * 0.2 ? 'risk' : 'attention',
      colorClass: 'bg-rose-600',
    },
    {
      key: 'margin',
      label: 'Saldo',
      amount: projectedBalance,
      ratio: clampRatio(Math.max(projectedBalance, 0) / incomeBase),
      tone: monthStatus === 'critical' ? 'risk' : monthStatus === 'attention' ? 'attention' : 'safe',
      colorClass: 'bg-black dark:bg-white',
    },
  ];

  const insight: MonthPlanInsight = {
    commitmentRatio: clampRatio(totalCommitted / incomeBase),
    freeRatio: clampRatio(safeToSpend / incomeBase),
    debtRatio: clampRatio(debtCommitments / incomeBase),
    dominantPressureKey: dominantPressure?.key ?? 'none',
    dominantPressureLabel: dominantPressure?.label ?? 'Sem pressao dominante',
    dominantPressureAmount: dominantPressure?.amount ?? 0,
    upcomingCount: upcomingMustPay.length,
    overdueCount: upcomingMustPay.filter((item) => item.isOverdue).length,
    riskScore: Math.round(
      Math.min(
        100,
        (clampRatio(totalCommitted / incomeBase) * 55) +
        (upcomingMustPay.length > 0 ? Math.min(20, upcomingMustPay.length * 4) : 0) +
        (projectedBalance < 0 ? 25 : rawSafeToSpend <= 0 ? 12 : 0)
      )
    ),
  };

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
    totalAccountBalance,
    openExpensesTotal,
    cashBalance,
    overdueOpenExpensesTotal,
    overdueOpenExpensesCount: overdueOpenExpenses.length,
    upcomingOpenExpenses: openExpenseItems,
    upcomingMustPay,
    deferableItems,
    alerts,
    recommendedActions,
    flowPoints,
    pressureBuckets,
    insight,
  };
}
