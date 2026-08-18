// ─── CÁLCULOS DOS RELATÓRIOS ──────────────────────────────────────────────────
// Extraído de src/pages/ReportsDashboard.tsx (organização de arquivo, sem
// mudança de comportamento). Funções puras — sem estado, sem JSX — que
// decidem quais transações contam em cada período/categoria dos relatórios
// e montam os dados prontos pra tela consumir.
import {
  eachMonthOfInterval,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subMonths,
  addMonths,
  isSameMonth,
  isBefore,
  format,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseLocalDate } from '@/utils/dateUtils';
import { getTransactionCategoryBucket } from '@/utils/transactionCategory';
import { buildCardInvoiceObligations } from '@/utils/invoiceObligations';
import { Category, CreditCard, Transaction } from '@/types/finance';

export type Period = 'month' | 'semester' | 'year';
export type ReportMode = 'projected' | 'realized';

export type CategoryRankingItem = {
  id: string;
  name: string;
  value: number;
  budgetLimit: number | null;
  color?: string;
  barWidth: number;
};

export type PeriodPoint = {
  name: string;
  start: Date;
  end: Date;
  isCurrent: boolean;
};

export type CategoryAnalysisOption = {
  id: string;
  name: string;
};

export type CategoryAnalysisItem = {
  id: string;
  description: string;
  date: string;
  amount: number;
  isPaid: boolean;
  dueDate?: string;
  paymentDate?: string;
};

export type ConsumptionTrendPoint = {
  name: string;
  consumo: number;
  receita: number;
  despesa: number;
  isCurrent: boolean;
};

export function getEffectiveTransactionDate(t: Transaction): string {
  if (t.type === 'expense' && !t.cardId && t.isPaid && t.paymentDate) {
    return t.paymentDate;
  }
  return t.date;
}

export function getReportPeriodKey(transaction: Transaction) {
  if (transaction.isInvoicePayment && transaction.invoiceMonthYear) {
    if (transaction.isPaid) {
      return format(parseLocalDate(transaction.date), 'yyyy-MM');
    }
    return transaction.invoiceMonthYear;
  }

  return format(parseLocalDate(getEffectiveTransactionDate(transaction)), 'yyyy-MM');
}

export function isTransferToCard(transaction: Transaction, allTransactions: Transaction[]) {
  if (!transaction.isTransfer || transaction.type !== 'expense' || !transaction.transferGroupId) return false;
  const peer = allTransactions.find(
    (t) => t.transferGroupId === transaction.transferGroupId && t.type === 'income' && !t.deleted_at
  );
  return !!peer?.cardId;
}

export function isEffectiveCategoryExpense(transaction: Transaction, allTransactions: Transaction[]) {
  const isToCard = isTransferToCard(transaction, allTransactions);
  return (
    transaction.type === 'expense' &&
    transaction.isPaid &&
    (!transaction.isTransfer || isToCard) &&
    !transaction.deleted_at &&
    (transaction.isInvoicePayment || !transaction.cardId)
  );
}

export function isEffectiveReportIncome(transaction: Transaction) {
  return (
    transaction.type === 'income' &&
    transaction.isPaid &&
    !transaction.isTransfer &&
    !transaction.deleted_at
  );
}

export function isProjectedReportIncome(transaction: Transaction) {
  return (
    transaction.type === 'income' &&
    !transaction.isTransfer &&
    !transaction.deleted_at
  );
}

export function isProjectedReportExpense(transaction: Transaction, allTransactions: Transaction[]) {
  const isToCard = isTransferToCard(transaction, allTransactions);
  return (
    transaction.type === 'expense' &&
    (!transaction.isTransfer || isToCard) &&
    !transaction.deleted_at &&
    (transaction.isInvoicePayment || !transaction.cardId)
  );
}

export function getCategoryConsumptionPeriodKey(transaction: Transaction) {
  return format(parseLocalDate(getEffectiveTransactionDate(transaction)), 'yyyy-MM');
}

export function isRealizedCategoryConsumptionExpense(transaction: Transaction, allTransactions: Transaction[]) {
  const isToCard = isTransferToCard(transaction, allTransactions);
  return (
    transaction.type === 'expense' &&
    transaction.isPaid &&
    (!transaction.isTransfer || isToCard) &&
    !transaction.deleted_at &&
    !transaction.isInvoicePayment
  );
}

export function isProjectedCategoryConsumptionExpense(transaction: Transaction, allTransactions: Transaction[]) {
  const isToCard = isTransferToCard(transaction, allTransactions);
  return (
    transaction.type === 'expense' &&
    (!transaction.isTransfer || isToCard) &&
    !transaction.deleted_at &&
    !transaction.isInvoicePayment
  );
}

export function getMonthTransactionsForReport({
  transactions,
  creditCards,
  month,
  selectedAccountId,
  viewRegime = 'caixa',
}: {
  transactions: Transaction[];
  creditCards: CreditCard[];
  month: Date;
  selectedAccountId: string;
  viewRegime?: 'caixa' | 'competencia';
}) {
  const targetMonth = month.getMonth();
  const targetYear = month.getFullYear();

  const monthReal = transactions.filter((transaction) => {
    if (transaction.isVirtual) return false;
    if (selectedAccountId !== 'all' && transaction.accountId !== selectedAccountId) return false;

    const transactionDate = parseLocalDate(getEffectiveTransactionDate(transaction));
    const matchesDate = transactionDate.getMonth() === targetMonth && transactionDate.getFullYear() === targetYear;

    if (transaction.isInvoicePayment && transaction.invoiceMonthYear) {
      if (transaction.isPaid) {
        return matchesDate;
      }
      const [year, monthValue] = transaction.invoiceMonthYear.split('-').map(Number);
      return monthValue - 1 === targetMonth && year === targetYear;
    }

    // Regra do cartão de crédito baseada no regime
    if (viewRegime === 'caixa') {
      if (transaction.cardId && transaction.invoiceMonthYear) {
        const [year, monthValue] = transaction.invoiceMonthYear.split('-').map(Number);
        return monthValue - 1 === targetMonth && year === targetYear;
      }
    }

    return matchesDate;
  });

  const projectedRecurring = transactions.flatMap((transaction) => {
    if (!transaction.isRecurring || transaction.isVirtual || transaction.deleted_at) return [];
    if (selectedAccountId !== 'all' && transaction.accountId !== selectedAccountId) return [];

    const transactionDate = parseLocalDate(getEffectiveTransactionDate(transaction));
    if (!isBefore(startOfMonth(transactionDate), addMonths(startOfMonth(month), 1))) return [];

    const hasReal = monthReal.some((real) =>
      real.originalId === transaction.id ||
      (real.id === transaction.id && isSameMonth(parseLocalDate(getEffectiveTransactionDate(real)), month))
    );

    if (hasReal) return [];

    const originalDay = transactionDate.getDate();
    const daysInTarget = new Date(targetYear, targetMonth + 1, 0).getDate();
    const safeDay = Math.min(originalDay, daysInTarget);
    const virtualDate = new Date(targetYear, targetMonth, safeDay);

    return [{
      ...transaction,
      id: `${transaction.id}-virtual-${targetYear}-${targetMonth}`,
      originalId: transaction.id,
      date: format(virtualDate, 'yyyy-MM-dd'),
      isVirtual: true,
      isPaid: false,
    }];
  });

  const projectedInstallments = transactions.flatMap((transaction) => {
    if (
      transaction.isRecurring ||
      transaction.isVirtual ||
      transaction.deleted_at ||
      !transaction.installmentGroupId ||
      !transaction.installmentNumber ||
      !transaction.installmentTotal ||
      transaction.installmentNumber >= transaction.installmentTotal
    ) {
      return [];
    }

    if (selectedAccountId !== 'all' && transaction.accountId !== selectedAccountId) return [];

    const transactionDate = parseLocalDate(transaction.date);
    if (!isBefore(transactionDate, startOfMonth(month))) return [];

    const hasMoreRecentInPast = transactions.some((other) =>
      !other.isVirtual &&
      other.installmentGroupId === transaction.installmentGroupId &&
      parseLocalDate(other.date).getTime() > transactionDate.getTime() &&
      isBefore(parseLocalDate(other.date), startOfMonth(month))
    );

    if (hasMoreRecentInPast) return [];

    const hasGroupInTargetMonth = monthReal.some((real) => real.installmentGroupId === transaction.installmentGroupId);
    const hasRealEquivalent = monthReal.some((real) =>
      real.originalId === transaction.id ||
      (real.id === transaction.id && isSameMonth(parseLocalDate(getEffectiveTransactionDate(real)), month))
    );

    if (hasGroupInTargetMonth || hasRealEquivalent) return [];

    const monthDiff = (targetYear - transactionDate.getFullYear()) * 12 + (targetMonth - transactionDate.getMonth());
    const projectedInstallmentNumber = transaction.installmentNumber + monthDiff;

    if (projectedInstallmentNumber > transaction.installmentTotal) return [];

    const originalDay = transactionDate.getDate();
    const daysInTarget = new Date(targetYear, targetMonth + 1, 0).getDate();
    const safeDay = Math.min(originalDay, daysInTarget);
    const virtualDate = new Date(targetYear, targetMonth, safeDay);

    return [{
      ...transaction,
      id: `${transaction.id}-virtual-inst-${targetYear}-${targetMonth}`,
      originalId: transaction.id,
      date: format(virtualDate, 'yyyy-MM-dd'),
      isVirtual: true,
      isPaid: false,
      installmentNumber: projectedInstallmentNumber,
      description: transaction.description.replace(/\b\d+\s*\/\s*\d+\b/, `${projectedInstallmentNumber}/${transaction.installmentTotal}`)
    }];
  });

  const syntheticTransactions = [...monthReal, ...projectedRecurring, ...projectedInstallments] as Transaction[];
  const invoiceObligations = selectedAccountId === 'all'
    ? buildCardInvoiceObligations({
        creditCards,
        transactions: transactions,
        viewDate: month,
      })
    : [];

  return [...syntheticTransactions, ...invoiceObligations];
}

export function buildCategoryExpenseRanking({
  transactions,
  categories,
  start,
  end,
  selectedAccountId,
  limit = Number.MAX_SAFE_INTEGER,
  viewRegime = 'caixa',
}: {
  transactions: Transaction[];
  categories: Category[];
  start: Date;
  end: Date;
  selectedAccountId: string;
  limit?: number;
  viewRegime?: 'caixa' | 'competencia';
}): CategoryRankingItem[] {
  const periodKeys = new Set(
    eachMonthOfInterval({ start, end }).map((month) => format(month, 'yyyy-MM'))
  );
  const distMap = new Map<string, {
    id: string;
    name: string;
    value: number;
    category?: Pick<Category, 'id' | 'name' | 'budgetLimit' | 'color'>;
  }>();

  transactions.forEach((transaction) => {
    const isToCard = isTransferToCard(transaction, transactions);
    const isAllowed = selectedAccountId !== 'all'
      ? (transaction.type === 'expense' && transaction.isPaid && (!transaction.isTransfer || isToCard) && !transaction.deleted_at && (transaction.isInvoicePayment || !transaction.cardId))
      : (viewRegime === 'caixa'
          ? (transaction.type === 'expense' && transaction.isPaid && (!transaction.isTransfer || isToCard) && !transaction.deleted_at && (transaction.isInvoicePayment || !transaction.cardId))
          : isRealizedCategoryConsumptionExpense(transaction, transactions));

    if (!isAllowed) return;
    if (selectedAccountId !== 'all' && transaction.accountId !== selectedAccountId) return;

    const periodKey = transaction.isInvoicePayment && transaction.invoiceMonthYear
      ? (transaction.isPaid ? format(parseLocalDate(transaction.date), 'yyyy-MM') : transaction.invoiceMonthYear)
      : (viewRegime === 'caixa' && transaction.cardId && transaction.invoiceMonthYear
          ? transaction.invoiceMonthYear
          : format(parseLocalDate(getEffectiveTransactionDate(transaction)), 'yyyy-MM'));

    if (!periodKeys.has(periodKey)) return;

    const bucket = getTransactionCategoryBucket(transaction, categories, 'Não identificados');
    const current = distMap.get(bucket.key) ?? {
      id: bucket.key,
      name: bucket.label,
      value: 0,
      category: bucket.category,
    };
    current.value += Number(transaction.amount);
    if (!current.category && bucket.category) {
      current.category = bucket.category;
    }
    distMap.set(bucket.key, current);
  });

  const ranked = Array.from(distMap.values())
    .map(({ id, name, value, category }) => {
      const cat = category ?? categories.find((c) => 'category:' + c.id === id || c.name === name);
      return {
        id,
        name,
        value,
        budgetLimit: cat?.budgetLimit ?? null,
        color: cat?.color,
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);

  const maxCategoryAmount = ranked[0]?.value ?? 0;

  return ranked.map((category) => ({
    ...category,
    barWidth: maxCategoryAmount > 0 ? (category.value / maxCategoryAmount) * 100 : 0,
  }));
}

export function buildReportPeriodData({
  transactions,
  categories,
  start,
  end,
  selectedAccountId,
  viewRegime = 'caixa',
}: {
  transactions: Transaction[];
  categories: Category[];
  start: Date;
  end: Date;
  selectedAccountId: string;
  viewRegime?: 'caixa' | 'competencia';
}) {
  const periodKeys = new Set(
    eachMonthOfInterval({ start, end }).map((month) => format(month, 'yyyy-MM'))
  );
  let total = 0;
  let fixed = 0;
  let paid = 0;
  let income = 0;

  transactions.forEach((transaction) => {
    if (transaction.isVirtual && !transaction.isRecurring) return;
    if (selectedAccountId !== 'all' && transaction.accountId !== selectedAccountId) return;
    if (!periodKeys.has(getReportPeriodKey(transaction))) return;

    const val = Number(transaction.amount);
    const isToCard = isTransferToCard(transaction, transactions);
    const isExpense = transaction.type === 'expense' && transaction.isPaid && (!transaction.isTransfer || isToCard) && !transaction.deleted_at && (
      selectedAccountId !== 'all'
        ? (transaction.isInvoicePayment || !transaction.cardId)
        : (viewRegime === 'caixa'
            ? (transaction.isInvoicePayment || !transaction.cardId)
            : !transaction.isInvoicePayment)
    );

    if (isExpense) {
      total += val;
      paid += val;
      const cat = categories.find(c => c.id === transaction.categoryId);
      if (cat?.isFixed) fixed += val;
    } else if (isEffectiveReportIncome(transaction)) {
      income += val;
    }
  });

  return { total, fixed, paid, income };
}

export function buildProjectedReportPeriodData({
  transactions,
  creditCards,
  categories,
  start,
  end,
  selectedAccountId,
  viewRegime = 'caixa',
}: {
  transactions: Transaction[];
  creditCards: CreditCard[];
  categories: Category[];
  start: Date;
  end: Date;
  selectedAccountId: string;
  viewRegime?: 'caixa' | 'competencia';
}) {
  const months = eachMonthOfInterval({ start, end });
  const todayStart = startOfMonth(new Date());
  let total = 0;
  let fixed = 0;
  let paid = 0;
  let income = 0;

  months.forEach((month) => {
    const isTesting = import.meta.env.MODE === 'test';
    const isPast = !isTesting && startOfMonth(month) < todayStart;

    if (isPast) {
      const realData = buildReportPeriodData({
        transactions,
        categories,
        start: startOfMonth(month),
        end: endOfMonth(month),
        selectedAccountId,
        viewRegime,
      });
      total += realData.total;
      fixed += realData.fixed;
      paid += realData.paid;
      income += realData.income;
    } else {
      const monthTransactions = getMonthTransactionsForReport({
        transactions,
        creditCards,
        month,
        selectedAccountId,
        viewRegime,
      });

      monthTransactions.forEach((transaction) => {
        const val = Number(transaction.amount);
        const isToCard = isTransferToCard(transaction, transactions);
        const isExpense = transaction.type === 'expense' && (!transaction.isTransfer || isToCard) && !transaction.deleted_at && (
          selectedAccountId !== 'all'
            ? (transaction.isInvoicePayment || !transaction.cardId)
            : (viewRegime === 'caixa'
                ? (transaction.isInvoicePayment || !transaction.cardId)
                : !transaction.isInvoicePayment)
        );

        if (isExpense) {
          total += val;
          if (transaction.isPaid) paid += val;
          const cat = categories.find(c => c.id === transaction.categoryId);
          if (cat?.isFixed) fixed += val;
        } else if (isProjectedReportIncome(transaction)) {
          income += val;
        }
      });
    }
  });

  return { total, fixed, paid, income };
}

export function buildProjectedCategoryExpenseRanking({
  transactions,
  creditCards,
  categories,
  start,
  end,
  selectedAccountId,
  limit = Number.MAX_SAFE_INTEGER,
  viewRegime = 'caixa',
}: {
  transactions: Transaction[];
  creditCards: CreditCard[];
  categories: Category[];
  start: Date;
  end: Date;
  selectedAccountId: string;
  limit?: number;
  viewRegime?: 'caixa' | 'competencia';
}): CategoryRankingItem[] {
  const distMap = new Map<string, {
    id: string;
    name: string;
    value: number;
    category?: Pick<Category, 'id' | 'name' | 'budgetLimit' | 'color'>;
  }>();

  const todayStart = startOfMonth(new Date());

  eachMonthOfInterval({ start, end }).forEach((month) => {
    const isTesting = import.meta.env.MODE === 'test';
    const isPast = !isTesting && startOfMonth(month) < todayStart;

    if (isPast) {
      transactions.forEach((transaction) => {
        if (transaction.isVirtual && !transaction.isRecurring) return;
        if (selectedAccountId !== 'all' && transaction.accountId !== selectedAccountId) return;

        const periodKey = getReportPeriodKey(transaction);
        if (periodKey !== format(month, 'yyyy-MM')) return;

        const isToCard = isTransferToCard(transaction, transactions);
        const isAllowed = selectedAccountId !== 'all'
          ? (transaction.type === 'expense' && transaction.isPaid && (!transaction.isTransfer || isToCard) && !transaction.deleted_at && (transaction.isInvoicePayment || !transaction.cardId))
          : (viewRegime === 'caixa'
              ? (transaction.type === 'expense' && transaction.isPaid && (!transaction.isTransfer || isToCard) && !transaction.deleted_at && (transaction.isInvoicePayment || !transaction.cardId))
              : isRealizedCategoryConsumptionExpense(transaction, transactions));

        if (!isAllowed) return;

        const bucket = getTransactionCategoryBucket(transaction, categories, 'Não identificados');
        const current = distMap.get(bucket.key) ?? {
          id: bucket.key,
          name: bucket.label,
          value: 0,
          category: bucket.category,
        };
        current.value += Number(transaction.amount);
        if (!current.category && bucket.category) {
          current.category = bucket.category;
        }
        distMap.set(bucket.key, current);
      });
    } else {
      getMonthTransactionsForReport({
        transactions,
        creditCards,
        month,
        selectedAccountId,
        viewRegime,
      }).forEach((transaction) => {
        const isToCard = isTransferToCard(transaction, transactions);
        const isAllowed = selectedAccountId !== 'all'
          ? (transaction.type === 'expense' && (!transaction.isTransfer || isToCard) && !transaction.deleted_at && (transaction.isInvoicePayment || !transaction.cardId))
          : (viewRegime === 'caixa'
              ? (transaction.type === 'expense' && (!transaction.isTransfer || isToCard) && !transaction.deleted_at && (transaction.isInvoicePayment || !transaction.cardId))
              : isProjectedCategoryConsumptionExpense(transaction, transactions));

        if (!isAllowed) return;

        const bucket = getTransactionCategoryBucket(transaction, categories, 'Não identificados');
        const current = distMap.get(bucket.key) ?? {
          id: bucket.key,
          name: bucket.label,
          value: 0,
          category: bucket.category,
        };
        current.value += Number(transaction.amount);
        if (!current.category && bucket.category) {
          current.category = bucket.category;
        }
        distMap.set(bucket.key, current);
      });
    }
  });

  const ranked = Array.from(distMap.values())
    .map(({ id, name, value, category }) => {
      const cat = category ?? categories.find((c) => 'category:' + c.id === id || c.name === name);
      return {
        id,
        name,
        value,
        budgetLimit: cat?.budgetLimit ?? null,
        color: cat?.color,
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);

  const maxCategoryAmount = ranked[0]?.value ?? 0;

  return ranked.map((category) => ({
    ...category,
    barWidth: maxCategoryAmount > 0 ? (category.value / maxCategoryAmount) * 100 : 0,
  }));
}

export function getSemesterStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() < 6 ? 0 : 6, 1);
}

export function getSemesterLabel(date: Date) {
  return `${date.getMonth() < 6 ? '1S' : '2S'}/${date.getFullYear()}`;
}

export function buildPeriodPoint(start: Date, period: Period, currentStart: Date): PeriodPoint {
  const end = period === 'month'
    ? endOfMonth(start)
    : period === 'semester'
      ? endOfMonth(addMonths(start, 5))
      : endOfYear(start);

  return {
    name: period === 'month'
      ? format(start, 'MMM', { locale: ptBR })
      : period === 'semester'
        ? getSemesterLabel(start)
        : format(start, 'yyyy'),
    start,
    end,
    isCurrent: start.getFullYear() === currentStart.getFullYear() && start.getMonth() === currentStart.getMonth(),
  };
}

export function buildTrendPeriodPoints(period: Period, viewDate: Date): PeriodPoint[] {
  if (period === 'month') {
    const currentStart = startOfMonth(viewDate);
    return Array.from({ length: 6 }).map((_, index) =>
      buildPeriodPoint(subMonths(currentStart, 5 - index), period, currentStart)
    );
  }

  if (period === 'semester') {
    const currentStart = getSemesterStart(viewDate);
    return Array.from({ length: 4 }).map((_, index) =>
      buildPeriodPoint(subMonths(currentStart, (3 - index) * 6), period, currentStart)
    );
  }

  const currentStart = startOfYear(viewDate);
  return Array.from({ length: 5 }).map((_, index) =>
    buildPeriodPoint(new Date(viewDate.getFullYear() - (4 - index), 0, 1), period, currentStart)
  );
}

export function buildCategoryPeriodValue({
  transactions,
  creditCards,
  categories,
  start,
  end,
  selectedAccountId,
  reportMode,
  bucketId,
  subcategoryId,
  viewRegime = 'caixa',
}: {
  transactions: Transaction[];
  creditCards: CreditCard[];
  categories: Category[];
  start: Date;
  end: Date;
  selectedAccountId: string;
  reportMode: ReportMode;
  bucketId: string;
  subcategoryId?: string;
  viewRegime?: 'caixa' | 'competencia';
}) {
  return getCategoryTransactionsForPeriod({
    transactions,
    creditCards,
    categories,
    start,
    end,
    selectedAccountId,
    reportMode,
    bucketId,
    subcategoryId,
    viewRegime,
  }).reduce((total, transaction) => total + Number(transaction.amount), 0);
}

export function getCategoryTransactionsForPeriod({
  transactions,
  creditCards,
  categories,
  start,
  end,
  selectedAccountId,
  reportMode,
  bucketId,
  subcategoryId,
  viewRegime = 'caixa',
}: {
  transactions: Transaction[];
  creditCards: CreditCard[];
  categories: Category[];
  start: Date;
  end: Date;
  selectedAccountId: string;
  reportMode: ReportMode;
  bucketId: string;
  subcategoryId?: string;
  viewRegime?: 'caixa' | 'competencia';
}): Transaction[] {
  const periodKeys = new Set(
    eachMonthOfInterval({ start, end }).map((month) => format(month, 'yyyy-MM'))
  );
  const todayStart = startOfMonth(new Date());

  const isTesting = import.meta.env.MODE === 'test';

  const scopedTransactions = reportMode === 'projected'
    ? eachMonthOfInterval({ start, end }).flatMap((month) => {
        const isPast = !isTesting && startOfMonth(month) < todayStart;
        return isPast
          ? transactions.filter(t => {
              if (t.isVirtual) return false;
              const pKey = getReportPeriodKey(t);
              return pKey === format(month, 'yyyy-MM');
            })
          : getMonthTransactionsForReport({
              transactions,
              creditCards,
              month,
              selectedAccountId,
              viewRegime,
            });
      })
    : transactions;

  return scopedTransactions
    .filter((transaction) => {
      const isToCard = isTransferToCard(transaction, transactions);
      const txDate = parseLocalDate(getEffectiveTransactionDate(transaction));
      const isPast = !isTesting && startOfMonth(txDate) < todayStart;

      const isAllowed = isPast
        ? (selectedAccountId !== 'all'
            ? (transaction.type === 'expense' && transaction.isPaid && (!transaction.isTransfer || isToCard) && !transaction.deleted_at && (transaction.isInvoicePayment || !transaction.cardId))
            : (viewRegime === 'caixa'
                ? (transaction.type === 'expense' && transaction.isPaid && (!transaction.isTransfer || isToCard) && !transaction.deleted_at && (transaction.isInvoicePayment || !transaction.cardId))
                : isRealizedCategoryConsumptionExpense(transaction, transactions)))
        : (selectedAccountId !== 'all'
            ? (transaction.type === 'expense' && (!transaction.isTransfer || isToCard) && !transaction.deleted_at && (transaction.isInvoicePayment || !transaction.cardId))
            : (viewRegime === 'caixa'
                ? (transaction.type === 'expense' && (!transaction.isTransfer || isToCard) && !transaction.deleted_at && (transaction.isInvoicePayment || !transaction.cardId))
                : (reportMode === 'projected' ? isProjectedCategoryConsumptionExpense(transaction, transactions) : isRealizedCategoryConsumptionExpense(transaction, transactions))));

      if (!isAllowed) return false;

      if (subcategoryId && subcategoryId !== 'all') {
        const txSubId = transaction.subcategoryId || (transaction as any).subcategory_id;
        if (txSubId !== subcategoryId) return false;
      }

      if (reportMode === 'realized') {
        if (!transaction.isPaid) return false;
        if (selectedAccountId !== 'all' && transaction.accountId !== selectedAccountId) return false;

        const periodKey = transaction.isInvoicePayment && transaction.invoiceMonthYear
          ? (transaction.isPaid ? format(parseLocalDate(transaction.date), 'yyyy-MM') : transaction.invoiceMonthYear)
          : (viewRegime === 'caixa' && transaction.cardId && transaction.invoiceMonthYear
              ? transaction.invoiceMonthYear
              : format(parseLocalDate(getEffectiveTransactionDate(transaction)), 'yyyy-MM'));
        if (!periodKeys.has(periodKey)) return false;
      }


      return getTransactionCategoryBucket(transaction, categories, 'Não identificados').key === bucketId;
    });
}

export function buildCategoryPeriodItems(params: {
  transactions: Transaction[];
  creditCards: CreditCard[];
  categories: Category[];
  start: Date;
  end: Date;
  selectedAccountId: string;
  reportMode: ReportMode;
  bucketId: string;
  subcategoryId?: string;
  viewRegime?: 'caixa' | 'competencia';
}): CategoryAnalysisItem[] {
  return getCategoryTransactionsForPeriod(params)
    .map((transaction) => ({
      id: transaction.id,
      description: transaction.description,
      date: getEffectiveTransactionDate(transaction),
      amount: Number(transaction.amount),
      isPaid: Boolean(transaction.isPaid),
      dueDate: transaction.date,
      paymentDate: transaction.paymentDate,
    }))
    .sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime());
}

export function getFinancialPeriodLabel(period: Period, date: Date) {
  if (period === 'month') {
    return format(date, 'MMMM yyyy', { locale: ptBR });
  }

  if (period === 'semester') {
    return `${date.getMonth() < 6 ? '1º Semestre' : '2º Semestre'} ${date.getFullYear()}`;
  }

  return String(date.getFullYear());
}
