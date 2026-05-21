import { useState, useMemo, useCallback, useRef } from 'react';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  TrendingUp,
  ArrowUpCircle,
  ArrowDownCircle,
  PieChart as PieIcon,
  ChevronLeft,
  ChevronRight,
  Wallet
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subMonths,
  format,
  isSameMonth,
  eachMonthOfInterval,
  addMonths,
  isBefore
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';
import { formatCurrency } from '@/utils/formatters';
import { parseLocalDate } from '@/utils/dateUtils';
import {
  getTransactionCategoryBucket,
  getTransactionCategoryLabel,
  LOGICAL_AGREEMENT_CATEGORY_KEY,
  LOGICAL_RENEGOTIATION_CATEGORY_KEY,
  LOGICAL_UNCATEGORIZED_CATEGORY_KEY,
} from '@/utils/transactionCategory';
import { buildCardInvoiceObligations } from '@/utils/invoiceObligations';
import { buildIncomeConsumption, buildPeriodComparison, PeriodComparison } from '@/utils/reportComparisons';
import { Category, CreditCard, Transaction } from '@/types/finance';
import { BudgetOverview } from '@/components/budgets/BudgetOverview';
import { useIsMobile } from '@/hooks/useIsMobile';

type Period = 'month' | 'semester' | 'year';
type ReportMode = 'projected' | 'realized';

type CategoryRankingItem = {
  id: string;
  name: string;
  value: number;
  budgetLimit: number | null;
  color?: string;
  barWidth: number;
};

type PeriodPoint = {
  name: string;
  start: Date;
  end: Date;
  isCurrent: boolean;
};

type CategoryAnalysisOption = {
  id: string;
  name: string;
};

type CategoryAnalysisItem = {
  id: string;
  description: string;
  date: string;
  amount: number;
  isPaid: boolean;
};

type ConsumptionTrendPoint = {
  name: string;
  consumo: number;
  receita: number;
  despesa: number;
  isCurrent: boolean;
};

function getReportPeriodKey(transaction: Transaction) {
  if (transaction.isInvoicePayment && transaction.invoiceMonthYear) {
    return transaction.invoiceMonthYear;
  }

  return format(parseLocalDate(transaction.date), 'yyyy-MM');
}

function isEffectiveCategoryExpense(transaction: Transaction) {
  return (
    transaction.type === 'expense' &&
    transaction.isPaid &&
    !transaction.isTransfer &&
    !transaction.deleted_at &&
    (transaction.isInvoicePayment || !transaction.cardId)
  );
}

function isEffectiveReportIncome(transaction: Transaction) {
  return (
    transaction.type === 'income' &&
    transaction.isPaid &&
    !transaction.isTransfer &&
    !transaction.deleted_at
  );
}

function isProjectedReportIncome(transaction: Transaction) {
  return (
    transaction.type === 'income' &&
    !transaction.isTransfer &&
    !transaction.deleted_at
  );
}

function isProjectedReportExpense(transaction: Transaction) {
  return (
    transaction.type === 'expense' &&
    !transaction.isTransfer &&
    !transaction.deleted_at &&
    (transaction.isInvoicePayment || !transaction.cardId)
  );
}

function getCategoryConsumptionPeriodKey(transaction: Transaction) {
  if (transaction.cardId && transaction.invoiceMonthYear) {
    return transaction.invoiceMonthYear;
  }

  return format(parseLocalDate(transaction.date), 'yyyy-MM');
}

function isRealizedCategoryConsumptionExpense(transaction: Transaction) {
  return (
    transaction.type === 'expense' &&
    transaction.isPaid &&
    !transaction.isTransfer &&
    !transaction.deleted_at &&
    !transaction.isInvoicePayment
  );
}

function isProjectedCategoryConsumptionExpense(transaction: Transaction) {
  return (
    transaction.type === 'expense' &&
    !transaction.isTransfer &&
    !transaction.deleted_at &&
    !transaction.isInvoicePayment
  );
}

function getMonthTransactionsForReport({
  transactions,
  creditCards,
  month,
  selectedAccountId,
}: {
  transactions: Transaction[];
  creditCards: CreditCard[];
  month: Date;
  selectedAccountId: string;
}) {
  const targetMonth = month.getMonth();
  const targetYear = month.getFullYear();

  const monthReal = transactions.filter((transaction) => {
    if (transaction.isVirtual) return false;
    if (selectedAccountId !== 'all' && transaction.accountId !== selectedAccountId) return false;

    const transactionDate = parseLocalDate(transaction.date);
    const matchesDate = transactionDate.getMonth() === targetMonth && transactionDate.getFullYear() === targetYear;

    if (transaction.isInvoicePayment && transaction.invoiceMonthYear) {
      const [year, monthValue] = transaction.invoiceMonthYear.split('-').map(Number);
      return monthValue - 1 === targetMonth && year === targetYear;
    }

    if (transaction.cardId && transaction.invoiceMonthYear) {
      const [year, monthValue] = transaction.invoiceMonthYear.split('-').map(Number);
      return monthValue - 1 === targetMonth && year === targetYear;
    }

    return matchesDate;
  });

  const projectedRecurring = transactions.flatMap((transaction) => {
    if (!transaction.isRecurring || transaction.isVirtual || transaction.deleted_at) return [];
    if (selectedAccountId !== 'all' && transaction.accountId !== selectedAccountId) return [];

    const transactionDate = parseLocalDate(transaction.date);
    if (!isBefore(startOfMonth(transactionDate), addMonths(startOfMonth(month), 1))) return [];

    const hasReal = monthReal.some((real) =>
      real.originalId === transaction.id ||
      (real.id === transaction.id && isSameMonth(parseLocalDate(real.date), month))
    );

    return hasReal ? [] : [{ ...transaction, originalId: transaction.id, isVirtual: true }];
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
      (real.id === transaction.id && isSameMonth(parseLocalDate(real.date), month))
    );

    if (hasGroupInTargetMonth || hasRealEquivalent) return [];

    const monthDiff = (targetYear - transactionDate.getFullYear()) * 12 + (targetMonth - transactionDate.getMonth());
    const projectedInstallmentNumber = transaction.installmentNumber + monthDiff;

    if (projectedInstallmentNumber > transaction.installmentTotal) return [];

    return [{
      ...transaction,
      originalId: transaction.id,
      installmentNumber: projectedInstallmentNumber,
      isVirtual: true,
    }];
  });

  const syntheticTransactions = [...monthReal, ...projectedRecurring, ...projectedInstallments] as Transaction[];
  const invoiceObligations = selectedAccountId === 'all'
    ? buildCardInvoiceObligations({
        creditCards,
        transactions: syntheticTransactions,
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
}: {
  transactions: Transaction[];
  categories: Category[];
  start: Date;
  end: Date;
  selectedAccountId: string;
  limit?: number;
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
    if (!isRealizedCategoryConsumptionExpense(transaction)) return;
    if (selectedAccountId !== 'all' && transaction.accountId !== selectedAccountId) return;
    if (!periodKeys.has(getCategoryConsumptionPeriodKey(transaction))) return;

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
}: {
  transactions: Transaction[];
  categories: Category[];
  start: Date;
  end: Date;
  selectedAccountId: string;
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
    if (isEffectiveCategoryExpense(transaction)) {
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
}: {
  transactions: Transaction[];
  creditCards: CreditCard[];
  categories: Category[];
  start: Date;
  end: Date;
  selectedAccountId: string;
}) {
  const months = eachMonthOfInterval({ start, end });
  let total = 0;
  let fixed = 0;
  let paid = 0;
  let income = 0;

  months.forEach((month) => {
    const monthTransactions = getMonthTransactionsForReport({
      transactions,
      creditCards,
      month,
      selectedAccountId,
    });

    monthTransactions.forEach((transaction) => {
      const val = Number(transaction.amount);
      if (isProjectedReportExpense(transaction)) {
        total += val;
        if (transaction.isPaid) paid += val;
        const cat = categories.find(c => c.id === transaction.categoryId);
        if (cat?.isFixed) fixed += val;
      } else if (isProjectedReportIncome(transaction)) {
        income += val;
      }
    });
  });

  return { total, fixed, paid, income };
}

function buildProjectedCategoryExpenseRanking({
  transactions,
  creditCards,
  categories,
  start,
  end,
  selectedAccountId,
  limit = Number.MAX_SAFE_INTEGER,
}: {
  transactions: Transaction[];
  creditCards: CreditCard[];
  categories: Category[];
  start: Date;
  end: Date;
  selectedAccountId: string;
  limit?: number;
}): CategoryRankingItem[] {
  const distMap = new Map<string, {
    id: string;
    name: string;
    value: number;
    category?: Pick<Category, 'id' | 'name' | 'budgetLimit' | 'color'>;
  }>();

  eachMonthOfInterval({ start, end }).forEach((month) => {
    getMonthTransactionsForReport({
      transactions,
      creditCards,
      month,
      selectedAccountId,
    }).forEach((transaction) => {
      if (!isProjectedCategoryConsumptionExpense(transaction)) return;

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

function getSemesterStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() < 6 ? 0 : 6, 1);
}

function getSemesterLabel(date: Date) {
  return `${date.getMonth() < 6 ? '1S' : '2S'}/${date.getFullYear()}`;
}

function buildPeriodPoint(start: Date, period: Period, currentStart: Date): PeriodPoint {
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

function buildTrendPeriodPoints(period: Period, viewDate: Date): PeriodPoint[] {
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

function buildCategoryPeriodValue({
  transactions,
  creditCards,
  categories,
  start,
  end,
  selectedAccountId,
  reportMode,
  bucketId,
}: {
  transactions: Transaction[];
  creditCards: CreditCard[];
  categories: Category[];
  start: Date;
  end: Date;
  selectedAccountId: string;
  reportMode: ReportMode;
  bucketId: string;
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
  }).reduce((total, transaction) => total + Number(transaction.amount), 0);
}

function getCategoryTransactionsForPeriod({
  transactions,
  creditCards,
  categories,
  start,
  end,
  selectedAccountId,
  reportMode,
  bucketId,
}: {
  transactions: Transaction[];
  creditCards: CreditCard[];
  categories: Category[];
  start: Date;
  end: Date;
  selectedAccountId: string;
  reportMode: ReportMode;
  bucketId: string;
}): Transaction[] {
  const periodKeys = new Set(
    eachMonthOfInterval({ start, end }).map((month) => format(month, 'yyyy-MM'))
  );

  const scopedTransactions = reportMode === 'projected'
    ? eachMonthOfInterval({ start, end }).flatMap((month) =>
        getMonthTransactionsForReport({
          transactions,
          creditCards,
          month,
          selectedAccountId,
        })
      )
    : transactions;

  return scopedTransactions
    .filter((transaction) => {
      if (reportMode === 'projected') {
        if (!isProjectedCategoryConsumptionExpense(transaction)) return false;
      } else {
        if (!isRealizedCategoryConsumptionExpense(transaction)) return false;
        if (selectedAccountId !== 'all' && transaction.accountId !== selectedAccountId) return false;
        if (!periodKeys.has(getCategoryConsumptionPeriodKey(transaction))) return false;
      }


      return getTransactionCategoryBucket(transaction, categories, 'Não identificados').key === bucketId;
    });
}

function buildCategoryPeriodItems(params: {
  transactions: Transaction[];
  creditCards: CreditCard[];
  categories: Category[];
  start: Date;
  end: Date;
  selectedAccountId: string;
  reportMode: ReportMode;
  bucketId: string;
}): CategoryAnalysisItem[] {
  return getCategoryTransactionsForPeriod(params)
    .map((transaction) => ({
      id: transaction.id,
      description: transaction.description,
      date: transaction.date,
      amount: Number(transaction.amount),
      isPaid: Boolean(transaction.isPaid),
    }))
    .sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime());
}

function getFinancialPeriodLabel(period: Period, date: Date) {
  if (period === 'month') {
    return format(date, 'MMMM yyyy', { locale: ptBR });
  }

  if (period === 'semester') {
    return `${date.getMonth() < 6 ? '1º Semestre' : '2º Semestre'} ${date.getFullYear()}`;
  }

  return String(date.getFullYear());
}

export default function ReportsDashboard() {
  const {
    transactions,
    categories,
    accounts,
    creditCards = [],
    viewDate,
    setViewDate
  } = useFinanceStore();

  const [period, setPeriod] = useState<Period>('month');
  const [reportMode, setReportMode] = useState<ReportMode>('projected');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const canUseAdvancedReports = useFeatureFlag('advanced_reports');
  const isMobile = useIsMobile();
  const analysisSectionRef = useRef<HTMLDivElement | null>(null);
  const toggleSelectedCategory = useCallback((categoryId: string) => {
    setSelectedCategoryId((current) => {
      const nextValue = current === categoryId ? 'all' : categoryId;
      if (isMobile && nextValue !== 'all') {
        requestAnimationFrame(() => {
          analysisSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
      return nextValue;
    });
  }, [isMobile]);

  const shiftPeriodDate = useCallback((direction: -1 | 1) => {
    if (period === 'month') {
      setViewDate(addMonths(viewDate, direction));
      return;
    }

    if (period === 'semester') {
      setViewDate(addMonths(viewDate, direction * 6));
      return;
    }

    setViewDate(new Date(viewDate.getFullYear() + direction, 0, 1));
  }, [period, setViewDate, viewDate]);

  const handlePrevPeriod = () => shiftPeriodDate(-1);
  const handleNextPeriod = () => shiftPeriodDate(1);

  const yearMonths = useMemo(
    () => eachMonthOfInterval({ start: startOfYear(viewDate), end: endOfYear(viewDate) }),
    [viewDate]
  );

  const intervals = useMemo(() => {
    const end = endOfMonth(viewDate);
    let start = startOfMonth(viewDate);
    let prevStart = subMonths(start, 1);
    let prevEnd = subMonths(end, 1);

    if (period === 'semester') {
      const isFirstHalf = viewDate.getMonth() < 6;
      start = new Date(viewDate.getFullYear(), isFirstHalf ? 0 : 6, 1);
      const tempEnd = endOfMonth(new Date(viewDate.getFullYear(), isFirstHalf ? 5 : 11, 1));
      prevStart = subMonths(start, 6);
      prevEnd = subMonths(tempEnd, 6);
      return { start, end: tempEnd, prevStart, prevEnd };
    } else if (period === 'year') {
      start = startOfYear(viewDate);
      const finalEnd = endOfMonth(new Date(viewDate.getFullYear(), 11, 1));
      prevStart = startOfYear(subMonths(start, 1));
      prevEnd = endOfMonth(new Date(prevStart.getFullYear(), 11, 1));
      return { start, end: finalEnd, prevStart, prevEnd };
    }

    return { start, end, prevStart, prevEnd };
  }, [viewDate, period]);

  const periodMonths = useMemo(
    () => eachMonthOfInterval({ start: intervals.start, end: intervals.end }),
    [intervals]
  );

  const periodLabel = period === 'month' ? 'mês anterior' : period === 'semester' ? 'semestre anterior' : 'ano anterior';
  const currentPeriodLabel = useMemo(() => getFinancialPeriodLabel(period, viewDate), [period, viewDate]);

  const getPeriodData = useCallback((start: Date, end: Date) => {
    if (reportMode === 'realized') {
      return buildReportPeriodData({
        transactions,
        categories,
        start,
        end,
        selectedAccountId,
      });
    }

    return buildProjectedReportPeriodData({
      transactions,
      creditCards,
      categories,
      start,
      end,
      selectedAccountId,
    });
  }, [transactions, creditCards, categories, selectedAccountId, reportMode]);

  const metrics = useMemo(() => {
    const current = getPeriodData(intervals.start, intervals.end);
    const previous = getPeriodData(intervals.prevStart, intervals.prevEnd);
    const currentBalance = current.income - current.total;
    const previousBalance = previous.income - previous.total;

    const currentConsumption = buildIncomeConsumption(current.income, current.total);
    const previousConsumption = buildIncomeConsumption(previous.income, previous.total);

    return {
      totalExpenses: current.total,
      paidExpenses: current.paid,
      fixedExpenses: current.fixed,
      income: current.income,
      balance: currentBalance,
      consumption: currentConsumption,
      comparisons: {
        income: buildPeriodComparison(current.income, previous.income),
        expenses: buildPeriodComparison(current.total, previous.total),
        balance: buildPeriodComparison(currentBalance, previousBalance),
        consumption: buildPeriodComparison(currentConsumption.percent ?? 0, previousConsumption.percent ?? 0),
      },
    };
  }, [intervals, getPeriodData]);

  const consumptionTrendData = useMemo<ConsumptionTrendPoint[]>(() => {
    const points = buildTrendPeriodPoints(period, viewDate);

    return points.map((point) => {
      const data = getPeriodData(point.start, point.end);
      const consumption = buildIncomeConsumption(data.income, data.total);
      return {
        name: point.name,
        consumo: consumption.percent ?? 0,
        receita: data.income,
        despesa: data.total,
        isCurrent: point.isCurrent,
      };
    });
  }, [period, viewDate, getPeriodData]);

  const yearOptions = useMemo(() => {
    const years = new Set<number>([new Date().getFullYear(), viewDate.getFullYear()]);

    transactions.forEach((transaction) => {
      years.add(parseLocalDate(transaction.date).getFullYear());
      if (transaction.invoiceMonthYear) {
        years.add(Number(transaction.invoiceMonthYear.split('-')[0]));
      }
    });

    return Array.from(years).sort((a, b) => a - b);
  }, [transactions, viewDate]);

  const topCategories = useMemo(() => {
    if (reportMode === 'projected') {
      return buildProjectedCategoryExpenseRanking({
        transactions,
        creditCards,
        categories,
        start: intervals.start,
        end: intervals.end,
        selectedAccountId,
      });
    }

    return buildCategoryExpenseRanking({
      transactions,
      categories,
      start: intervals.start,
      end: intervals.end,
      selectedAccountId,
    });
  }, [transactions, creditCards, categories, intervals, selectedAccountId, reportMode]);

  const expenseCategories = useMemo(
    () => categories.filter((category) => category.type === 'expense' && category.isActive !== false),
    [categories]
  );

  const categoryAnalysisOptions = useMemo(() => {
    const optionMap = new Map<string, CategoryAnalysisOption>();

    [
      { id: LOGICAL_AGREEMENT_CATEGORY_KEY, name: 'Acordo' },
      { id: LOGICAL_RENEGOTIATION_CATEGORY_KEY, name: 'Renegociação' },
      { id: LOGICAL_UNCATEGORIZED_CATEGORY_KEY, name: 'Não identificados' },
    ].forEach((option) => optionMap.set(option.id, option));

    expenseCategories.forEach((category) => {
      optionMap.set(`category:${category.id}`, {
        id: `category:${category.id}`,
        name: category.name,
      });
    });

    topCategories.forEach((category) => {
      optionMap.set(category.id, { id: category.id, name: category.name });
    });

    return Array.from(optionMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [expenseCategories, topCategories]);

  const selectedCategory = selectedCategoryId === 'all'
    ? null
    : categoryAnalysisOptions.find((category) => category.id === selectedCategoryId) ?? null;

  const selectedCategoryAnalysis = useMemo(() => {
    if (!selectedCategory) return null;

    const current = buildCategoryPeriodValue({
      transactions,
      creditCards,
      categories,
      start: intervals.start,
      end: intervals.end,
      selectedAccountId,
      reportMode,
      bucketId: selectedCategory.id,
    });
    const previous = buildCategoryPeriodValue({
      transactions,
      creditCards,
      categories,
      start: intervals.prevStart,
      end: intervals.prevEnd,
      selectedAccountId,
      reportMode,
      bucketId: selectedCategory.id,
    });
    const trend = buildTrendPeriodPoints(period, viewDate).map((point) => ({
      name: point.name,
      valor: buildCategoryPeriodValue({
        transactions,
        creditCards,
        categories,
        start: point.start,
        end: point.end,
        selectedAccountId,
        reportMode,
        bucketId: selectedCategory.id,
      }),
      isCurrent: point.isCurrent,
    }));

    return {
      current,
      previous,
      comparison: buildPeriodComparison(current, previous),
      trend,
      items: buildCategoryPeriodItems({
        transactions,
        creditCards,
        categories,
        start: intervals.start,
        end: intervals.end,
        selectedAccountId,
        reportMode,
        bucketId: selectedCategory.id,
      }),
    };
  }, [categories, creditCards, intervals, period, reportMode, selectedAccountId, selectedCategory, transactions, viewDate]);

  const annualVision = useMemo(() => {
    const tableMonths = period === 'year' ? yearMonths : periodMonths;
    const monthKeys = tableMonths.map((month) => format(month, 'yyyy-MM'));

    const monthlyTransactionsMap = tableMonths.reduce<Record<string, typeof transactions>>((accumulator, month) => {
      accumulator[format(month, 'yyyy-MM')] = reportMode === 'projected'
        ? getMonthTransactionsForReport({
            transactions,
            creditCards,
            month,
            selectedAccountId,
          })
        : transactions.filter((transaction) => {
            if (transaction.isVirtual) return false;
            if (selectedAccountId !== 'all' && transaction.accountId !== selectedAccountId) return false;

            const transactionDate = parseLocalDate(transaction.date);
            const matchesDate = isSameMonth(transactionDate, month);

            if (transaction.isInvoicePayment && transaction.invoiceMonthYear) {
              return transaction.invoiceMonthYear === format(month, 'yyyy-MM');
            }

            return matchesDate;
          });
      return accumulator;
    }, {});

    const rowMap = new Map<string, {
      id: string;
      name: string;
      type: 'income' | 'expense';
      monthValues: Record<string, number>;
      annualTotal: number;
    }>();

    const ensureRow = (id: string, name: string, type: 'income' | 'expense') => {
      if (!rowMap.has(id)) {
        rowMap.set(id, {
          id,
          name,
          type,
          monthValues: monthKeys.reduce<Record<string, number>>((accumulator, monthKey) => {
            accumulator[monthKey] = 0;
            return accumulator;
          }, {}),
          annualTotal: 0,
        });
      }

      return rowMap.get(id)!;
    };

    monthKeys.forEach((monthKey) => {
      monthlyTransactionsMap[monthKey].forEach((transaction) => {
        if (transaction.isTransfer) return;
        if (transaction.type === 'income') {
          if (reportMode === 'projected' ? !isProjectedReportIncome(transaction) : !isEffectiveReportIncome(transaction)) return;
        }
        if (transaction.type === 'expense') {
          if (reportMode === 'projected' ? !isProjectedReportExpense(transaction) : !isEffectiveCategoryExpense(transaction)) return;
        }

        const rowName = transaction.isInvoicePayment
          ? 'Pagamento de fatura'
          : getTransactionCategoryLabel(
              transaction,
              categories,
              transaction.type === 'income' ? 'Receitas sem categoria' : 'Não identificados'
            );
        const rowId = `${transaction.type}-${transaction.categoryId ?? transaction.debtId ?? rowName}`;
        const row = ensureRow(rowId, rowName, transaction.type);
        row.monthValues[monthKey] += Number(transaction.amount);
      });
    });

    const rows = Array.from(rowMap.values())
      .map((row) => ({
        ...row,
        annualTotal: monthKeys.reduce((sum, monthKey) => sum + row.monthValues[monthKey], 0),
      }))
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'income' ? -1 : 1;
        return b.annualTotal - a.annualTotal;
      });

    const incomeRows = rows.filter((row) => row.type === 'income');
    const expenseRows = rows.filter((row) => row.type === 'expense');

    const incomeByMonth = monthKeys.reduce<Record<string, number>>((accumulator, monthKey) => {
      accumulator[monthKey] = incomeRows.reduce((sum, row) => sum + row.monthValues[monthKey], 0);
      return accumulator;
    }, {});

    const expenseByMonth = monthKeys.reduce<Record<string, number>>((accumulator, monthKey) => {
      accumulator[monthKey] = expenseRows.reduce((sum, row) => sum + row.monthValues[monthKey], 0);
      return accumulator;
    }, {});

    const netByMonth = monthKeys.reduce<Record<string, number>>((accumulator, monthKey) => {
      accumulator[monthKey] = incomeByMonth[monthKey] - expenseByMonth[monthKey];
      return accumulator;
    }, {});

    const annualIncome = monthKeys.reduce((sum, monthKey) => sum + incomeByMonth[monthKey], 0);
    const annualExpenses = monthKeys.reduce((sum, monthKey) => sum + expenseByMonth[monthKey], 0);
    const annualNet = annualIncome - annualExpenses;
    const negativeMonths = tableMonths.filter((month) => netByMonth[format(month, 'yyyy-MM')] < 0);
    const strongestMonth = tableMonths.reduce((best, month) => {
      const monthKey = format(month, 'yyyy-MM');
      const amount = netByMonth[monthKey];
      if (!best || amount > best.amount) {
        return { label: format(month, 'MMM', { locale: ptBR }), amount };
      }
      return best;
    }, null as { label: string; amount: number } | null);

    const currentTotalBalance = accounts
      .filter((account) => selectedAccountId === 'all' || account.id === selectedAccountId)
      .reduce((sum, account) => sum + Number(account.balance || 0), 0);
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const projectedYearEndBalance = period === 'year' && viewDate.getFullYear() === currentYear
      ? currentTotalBalance + yearMonths.reduce((sum, month) => {
          if (month.getMonth() <= currentMonth) return sum;
          return sum + netByMonth[format(month, 'yyyy-MM')];
        }, 0)
      : null;

    return {
      tableMonths,
      rows,
      incomeRows,
      expenseRows,
      incomeByMonth,
      expenseByMonth,
      netByMonth,
      annualIncome,
      annualExpenses,
      annualNet,
      negativeMonths,
      strongestMonth,
      currentTotalBalance,
      projectedYearEndBalance,
    };
  }, [accounts, categories, creditCards, period, periodMonths, reportMode, selectedAccountId, transactions, viewDate, yearMonths]);

  return (
    <div className="space-y-8 animate-fade-in max-w-[1600px] mx-auto pb-10 px-4 xl:px-6">
      <PageHeader title="Relatórios Analíticos" icon={PieIcon}>
        {isMobile ? (
          <div className="w-full space-y-3 no-print">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex bg-gray-50 dark:bg-zinc-800/50 p-1 rounded-2xl border-2 border-gray-100 dark:border-zinc-800">
                {(['projected', 'realized'] as ReportMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setReportMode(mode)}
                    className={cn(
                      "flex-1 px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                      reportMode === mode ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {mode === 'projected' ? 'Projetado' : 'Realizado'}
                  </button>
                ))}
              </div>

              <div className="flex bg-gray-50 dark:bg-zinc-800/50 p-1 rounded-2xl border-2 border-gray-100 dark:border-zinc-800">
                {(['month', 'semester', 'year'] as Period[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={cn(
                      "flex-1 px-2 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                      period === p ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-lg" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {p === 'month' ? 'Mês' : p === 'semester' ? 'Semestre' : 'Ano'}
                  </button>
                ))}
	      </div>

      {isMobile && selectedAccountId === 'all' && (
        <BudgetOverview
          categories={categories}
          transactions={transactions}
          viewDate={viewDate}
          period={period}
          reportMode={reportMode}
          periodIncome={metrics.income}
        />
      )}
	    </div>

            <div className="rounded-[1.75rem] border border-gray-100 bg-white/90 p-2 dark:border-zinc-800 dark:bg-zinc-900/90">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevPeriod}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 transition-colors hover:bg-gray-100 dark:border-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                  aria-label="Período anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="min-w-0 flex-1 rounded-2xl bg-gray-50/70 px-3 py-2 text-center dark:bg-zinc-800/60">
                  <p className="truncate text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">
                    {period === 'month' ? 'Mês' : period === 'semester' ? 'Semestre' : 'Ano'}
                  </p>
                  <p className="truncate text-sm font-black text-foreground">{currentPeriodLabel}</p>
                </div>

                <button
                  onClick={handleNextPeriod}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 transition-colors hover:bg-gray-100 dark:border-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                  aria-label="Próximo período"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Select
                  value={String(viewDate.getFullYear())}
                  onValueChange={(val) => setViewDate(new Date(Number(val), period === 'semester' ? (viewDate.getMonth() < 6 ? 0 : 6) : 0, 1))}
                >
                  <SelectTrigger className="h-10 rounded-2xl border-0 bg-gray-50 font-black text-xs uppercase tracking-widest dark:bg-zinc-800/80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-2">
                    {yearOptions.map((year) => (
                      <SelectItem key={year} value={String(year)} className="font-bold">{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {period === 'semester' ? (
                  <Select
                    value={viewDate.getMonth() < 6 ? '1' : '2'}
                    onValueChange={(val) => setViewDate(new Date(viewDate.getFullYear(), val === '1' ? 0 : 6, 1))}
                  >
                    <SelectTrigger className="h-10 rounded-2xl border-0 bg-gray-50 font-black text-xs uppercase tracking-widest dark:bg-zinc-800/80">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-2">
                      <SelectItem value="1" className="font-bold">1º Semestre</SelectItem>
                      <SelectItem value="2" className="font-bold">2º Semestre</SelectItem>
                    </SelectContent>
                  </Select>
                ) : period === 'month' ? (
                  <Select
                    value={String(viewDate.getMonth())}
                    onValueChange={(val) => setViewDate(new Date(viewDate.getFullYear(), Number(val), 1))}
                  >
                    <SelectTrigger className="h-10 rounded-2xl border-0 bg-gray-50 font-black text-xs uppercase tracking-widest dark:bg-zinc-800/80">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-2">
                      {Array.from({ length: 12 }).map((_, monthIndex) => (
                        <SelectItem key={monthIndex} value={String(monthIndex)} className="font-bold">
                          {format(new Date(2026, monthIndex, 1), 'MMMM', { locale: ptBR })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}
              </div>
            </div>

            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger className="h-11 w-full rounded-2xl bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 font-bold text-gray-900 dark:text-zinc-50 outline-none">
                <Wallet className="w-4 h-4 mr-2 text-primary" />
                <SelectValue placeholder="Conta" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-2">
                <SelectItem value="all" className="font-bold">Todas as Contas</SelectItem>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id} className="font-bold">{acc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3 no-print">
            <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl p-1">
              {period === 'month' ? (
                <>
                  <button onClick={handlePrevPeriod} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="px-2 min-w-[120px] text-center">
                    <span className="text-xs font-black uppercase tracking-widest truncate">
                      {format(viewDate, 'MMMM yyyy', { locale: ptBR })}
                    </span>
                  </div>
                  <button onClick={handleNextPeriod} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              ) : period === 'semester' ? (
                <div className="flex items-center">
                  <Select
                    value={String(viewDate.getFullYear())}
                    onValueChange={(val) => setViewDate(new Date(Number(val), viewDate.getMonth() < 6 ? 0 : 6, 1))}
                  >
                    <SelectTrigger className="h-9 border-none bg-transparent font-black uppercase tracking-widest text-xs min-w-[90px] outline-none shadow-none focus:ring-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-2">
                      {yearOptions.map(year => (
                        <SelectItem key={year} value={String(year)} className="font-bold">{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={viewDate.getMonth() < 6 ? '1' : '2'}
                    onValueChange={(val) => setViewDate(new Date(viewDate.getFullYear(), val === '1' ? 0 : 6, 1))}
                  >
                    <SelectTrigger className="h-9 border-none bg-transparent font-black uppercase tracking-widest text-xs min-w-[150px] outline-none shadow-none focus:ring-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-2">
                      <SelectItem value="1" className="font-bold">1º Semestre</SelectItem>
                      <SelectItem value="2" className="font-bold">2º Semestre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <Select
                  value={String(viewDate.getFullYear())}
                  onValueChange={(val) => setViewDate(new Date(Number(val), 0, 1))}
                >
                  <SelectTrigger className="h-9 border-none bg-transparent font-black uppercase tracking-widest text-xs min-w-[100px] outline-none shadow-none focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-2">
                    {yearOptions.map(year => (
                      <SelectItem key={year} value={String(year)} className="font-bold">{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger className="h-11 w-[180px] rounded-2xl bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 font-bold text-gray-900 dark:text-zinc-50 outline-none">
                <Wallet className="w-4 h-4 mr-2 text-primary" />
                <SelectValue placeholder="Conta" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-2">
                <SelectItem value="all" className="font-bold">Todas as Contas</SelectItem>
                {accounts.map(acc => (
                  <SelectItem key={acc.id} value={acc.id} className="font-bold">{acc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex bg-gray-50 dark:bg-zinc-800/50 p-1 rounded-2xl border-2 border-gray-100 dark:border-zinc-800">
              {(['projected', 'realized'] as ReportMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setReportMode(mode)}
                  className={cn(
                    "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                    reportMode === mode ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {mode === 'projected' ? 'Projetado' : 'Realizado'}
                </button>
              ))}
            </div>

            <div className="flex bg-gray-50 dark:bg-zinc-800/50 p-1 rounded-2xl border-2 border-gray-100 dark:border-zinc-800">
              {(['month', 'semester', 'year'] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                    period === p ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-lg" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p === 'month' ? 'Mês' : p === 'semester' ? 'Semestre' : 'Ano'}
                </button>
              ))}
            </div>
          </div>
        )}
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6">
        <StatCard
          label={reportMode === 'projected' ? 'Receitas previstas' : 'Receitas efetivas'}
          value={metrics.income}
          icon={<ArrowUpCircle className="text-emerald-500" />}
          comparison={metrics.comparisons.income}
          periodLabel={periodLabel}
          compact={isMobile}
        />
        <StatCard
          label={reportMode === 'projected' ? 'Despesas previstas' : 'Despesas efetivas'}
          value={metrics.totalExpenses}
          icon={<ArrowDownCircle className="text-rose-500" />}
          comparison={metrics.comparisons.expenses}
          periodLabel={periodLabel}
          forceRed
          invertColors
          compact={isMobile}
        />
        <StatCard
          label={reportMode === 'projected' ? 'Saldo previsto' : 'Saldo efetivo do período'}
          value={metrics.balance}
          icon={<TrendingUp className={metrics.balance >= 0 ? "text-primary" : "text-rose-500"} />}
          comparison={metrics.comparisons.balance}
          periodLabel={periodLabel}
          isNeutral
          compact={isMobile}
        />
        {isMobile && (
          <StatCard
            label="Consumo vs receita"
            value={metrics.consumption.percent ?? 0}
            icon={<TrendingUp className="text-primary" />}
            comparison={metrics.comparisons.consumption}
            periodLabel={periodLabel}
            invertColors
            compact
            isPercentValue
          />
        )}
      </div>

      {!isMobile && selectedAccountId === 'all' && (
        <BudgetOverview
          categories={categories}
          transactions={transactions}
          viewDate={viewDate}
          period={period}
          reportMode={reportMode}
          periodIncome={metrics.income}
        />
      )}

      {canUseAdvancedReports ? (
        <>
          <div className="hidden lg:block bg-white dark:bg-zinc-900 rounded-[2.5rem] p-10 xl:p-12 border border-gray-100 dark:border-zinc-800 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-8">
          <div>
            <h3 className="text-2xl font-black tracking-tight">Mapa por categoria</h3>
          </div>

          <div className="grid grid-cols-3 gap-3 min-w-[660px]">
            <div className="rounded-[1.75rem] border border-emerald-100 dark:border-emerald-500/10 bg-emerald-50/70 dark:bg-emerald-500/5 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">Saldo atual</p>
              <p className="text-xl font-black mt-2 text-emerald-700 dark:text-emerald-200">{formatCurrency(annualVision.currentTotalBalance)}</p>
            </div>
            <div className="rounded-[1.75rem] border border-rose-100 dark:border-rose-500/10 bg-rose-50/70 dark:bg-rose-500/5 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-700 dark:text-rose-300">Meses no vermelho</p>
              <p className="text-xl font-black mt-2 text-rose-700 dark:text-rose-200">{annualVision.negativeMonths.length}</p>
            </div>
            <div className="rounded-[1.75rem] border border-primary/10 bg-primary/[0.06] p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">Fechamento do período</p>
              <p className="text-xl font-black mt-2 text-foreground">
                {annualVision.projectedYearEndBalance !== null ? formatCurrency(annualVision.projectedYearEndBalance) : formatCurrency(annualVision.annualNet)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="rounded-[1.75rem] border border-gray-100 dark:border-zinc-800 bg-gray-50/60 dark:bg-zinc-950/40 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Melhor mês</p>
            <p className="text-sm font-black mt-2">
              {annualVision.strongestMonth ? `${annualVision.strongestMonth.label} · ${formatCurrency(annualVision.strongestMonth.amount)}` : 'Sem dados'}
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-gray-100 dark:border-zinc-800 bg-gray-50/60 dark:bg-zinc-950/40 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Receita x despesa no período</p>
            <p className={cn(
              "text-sm font-black mt-2",
              annualVision.annualNet >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300"
            )}>
              {formatCurrency(annualVision.annualIncome)} / {formatCurrency(annualVision.annualExpenses)}
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-gray-100 dark:border-zinc-800 bg-gray-50/60 dark:bg-zinc-950/40 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Leitura</p>
            <p className="text-sm font-bold mt-2 text-foreground/80">
              {annualVision.negativeMonths.length === 0
                ? 'O período está sem meses deficitários nessa visão.'
                : `Há ${annualVision.negativeMonths.length} mês(es) pedindo ajuste de rota.`}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-[2rem] border border-gray-100 dark:border-zinc-800">
          <table className="min-w-[1480px] w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-950/70">
              <tr>
                <th className="sticky left-0 z-10 bg-zinc-50 dark:bg-zinc-950/70 px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground min-w-[240px]">Categoria</th>
                {annualVision.tableMonths.map((month) => (
                  <th key={month.toISOString()} className="px-4 py-4 text-right text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground min-w-[96px]">
                    {format(month, 'MMM', { locale: ptBR })}
                  </th>
                ))}
                <th className="px-5 py-4 text-right text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground min-w-[120px]">Total</th>
              </tr>
            </thead>
            <tbody>
              {annualVision.incomeRows.length > 0 && (
                <tr className="border-t border-gray-200 dark:border-zinc-700 bg-emerald-50/60 dark:bg-emerald-500/5">
                  <td className="sticky left-0 z-10 bg-emerald-50/60 dark:bg-emerald-500/5 px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
                    Receitas
                  </td>
                  <td colSpan={annualVision.tableMonths.length + 1} />
                </tr>
              )}

              {annualVision.incomeRows.map((row) => (
                <tr key={row.id} className="border-t border-gray-100 dark:border-zinc-800">
                  <td className="sticky left-0 z-10 bg-white dark:bg-zinc-900 px-5 py-4">
                    <span className="text-sm font-black text-foreground">{row.name}</span>
                  </td>
                  {annualVision.tableMonths.map((month) => {
                    const monthKey = format(month, 'yyyy-MM');
                    const value = row.monthValues[monthKey];

                    return (
                      <td key={`${row.id}-${monthKey}`} className="px-4 py-4 text-right text-xs font-black tabular-nums text-emerald-600 dark:text-emerald-300">
                        {formatCurrency(value)}
                      </td>
                    );
                  })}
                  <td className="px-5 py-4 text-right text-sm font-black tabular-nums border-l border-gray-100 dark:border-zinc-800 text-emerald-600 dark:text-emerald-300">
                    {formatCurrency(row.annualTotal)}
                  </td>
                </tr>
              ))}

              {annualVision.expenseRows.length > 0 && (
                <tr className="border-t border-gray-200 dark:border-zinc-700 bg-rose-50/60 dark:bg-rose-500/5">
                  <td className="sticky left-0 z-10 bg-rose-50/60 dark:bg-rose-500/5 px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-rose-700 dark:text-rose-300">
                    Despesas
                  </td>
                  <td colSpan={annualVision.tableMonths.length + 1} />
                </tr>
              )}

              {annualVision.expenseRows.map((row) => (
                <tr key={row.id} className="border-t border-gray-100 dark:border-zinc-800">
                  <td className="sticky left-0 z-10 bg-white dark:bg-zinc-900 px-5 py-4">
                    <span className="text-sm font-black text-foreground">{row.name}</span>
                  </td>
                  {annualVision.tableMonths.map((month) => {
                    const monthKey = format(month, 'yyyy-MM');
                    const value = row.monthValues[monthKey];

                    return (
                      <td key={`${row.id}-${monthKey}`} className="px-4 py-4 text-right text-xs font-black tabular-nums text-rose-600 dark:text-rose-300">
                        {formatCurrency(value)}
                      </td>
                    );
                  })}
                  <td className="px-5 py-4 text-right text-sm font-black tabular-nums border-l border-gray-100 dark:border-zinc-800 text-rose-600 dark:text-rose-300">
                    {formatCurrency(row.annualTotal)}
                  </td>
                </tr>
              ))}

              <tr className="border-t border-gray-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950">
                <td className="sticky left-0 z-10 bg-zinc-50 dark:bg-zinc-950 px-5 py-4 text-sm font-black uppercase tracking-[0.15em]">
                  Resultado líquido
                </td>
                {annualVision.tableMonths.map((month) => {
                  const monthKey = format(month, 'yyyy-MM');
                  const value = annualVision.netByMonth[monthKey];

                  return (
                    <td
                      key={`total-${monthKey}`}
                      className={cn(
                        "px-4 py-4 text-right text-xs font-black tabular-nums",
                        value >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300"
                      )}
                    >
                      {formatCurrency(value)}
                    </td>
                  );
                })}
                <td className={cn(
                  "px-5 py-4 text-right text-sm font-black tabular-nums border-l border-gray-200 dark:border-zinc-700",
                  annualVision.annualNet >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300"
                )}>
                  {formatCurrency(annualVision.annualNet)}
                </td>
              </tr>

              <tr className="border-t border-gray-100 dark:border-zinc-800 bg-emerald-50 dark:bg-emerald-950">
                <td className="sticky left-0 z-10 bg-emerald-50 dark:bg-emerald-950 px-5 py-4 text-sm font-black uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-300">
                  Total receitas
                </td>
                {annualVision.tableMonths.map((month) => {
                  const monthKey = format(month, 'yyyy-MM');
                  return (
                    <td key={`income-${monthKey}`} className="px-4 py-4 text-right text-xs font-black tabular-nums text-emerald-600 dark:text-emerald-300">
                      {formatCurrency(annualVision.incomeByMonth[monthKey])}
                    </td>
                  );
                })}
                <td className="px-5 py-4 text-right text-sm font-black tabular-nums border-l border-gray-200 dark:border-zinc-700 text-emerald-600 dark:text-emerald-300">
                  {formatCurrency(annualVision.annualIncome)}
                </td>
              </tr>

              <tr className="border-t border-gray-100 dark:border-zinc-800 bg-rose-50 dark:bg-rose-950">
                <td className="sticky left-0 z-10 bg-rose-50 dark:bg-rose-950 px-5 py-4 text-sm font-black uppercase tracking-[0.15em] text-rose-700 dark:text-rose-300">
                  Total despesas
                </td>
                {annualVision.tableMonths.map((month) => {
                  const monthKey = format(month, 'yyyy-MM');
                  return (
                    <td key={`expense-${monthKey}`} className="px-4 py-4 text-right text-xs font-black tabular-nums text-rose-600 dark:text-rose-300">
                      {formatCurrency(annualVision.expenseByMonth[monthKey])}
                    </td>
                  );
                })}
                <td className="px-5 py-4 text-right text-sm font-black tabular-nums border-l border-gray-200 dark:border-zinc-700 text-rose-600 dark:text-rose-300">
                  {formatCurrency(annualVision.annualExpenses)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  ) : null}

  <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 lg:gap-8">
        <div className="order-1 lg:col-span-3 space-y-5 lg:space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-[1.75rem] lg:rounded-[2rem] p-4 lg:p-6 border border-gray-100 dark:border-zinc-800 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-black tracking-tight">Total de Consumo vs Receita</h3>
              <p className="text-sm text-muted-foreground mt-1 tabular-nums">
                {formatCurrency(metrics.totalExpenses)} de {formatCurrency(metrics.income)}
              </p>
            </div>
            <div className="text-left md:text-right">
              <p className="text-4xl font-black tracking-tighter tabular-nums">
                {metrics.consumption.percent !== null ? `${metrics.consumption.percent.toFixed(1)}%` : 'Sem receita'}
              </p>
              <ComparisonBadge comparison={metrics.comparisons.consumption} periodLabel={periodLabel} isPercentPoints compact={isMobile} />
            </div>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-3 text-[10px] lg:text-[11px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-white ring-1 ring-white/30" />
              <span>Receitas</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500 ring-1 ring-rose-300/30" />
              <span>Despesas</span>
            </div>
          </div>

          <div className="h-[220px] lg:h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%" minHeight={isMobile ? 200 : 240}>
              <LineChart data={consumptionTrendData} margin={{ top: 12, right: 12, left: -18, bottom: 6 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 'bold', fill: '#A1A1AA' }} dy={10} />
                <YAxis hide domain={[0, 'auto']} />
                <Tooltip
                  cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '4 4' }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const point = payload[0]?.payload as ConsumptionTrendPoint | undefined;
                    if (!point) return null;
                    return (
                      <div className="min-w-[210px] rounded-2xl border border-white/10 bg-zinc-900 p-3 text-[10px] text-white shadow-xl">
                        <p className="mb-2 font-black uppercase tracking-widest opacity-70">{label}</p>
                        <div className="flex items-center justify-between gap-4">
                          <span className="font-bold uppercase tracking-widest text-white">Receitas</span>
                          <span className="font-black whitespace-nowrap">{formatCurrency(point.receita)}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-4">
                          <span className="font-bold uppercase tracking-widest text-rose-300">Despesas</span>
                          <span className="font-black whitespace-nowrap text-rose-300">{formatCurrency(point.despesa)}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-4">
                          <span className="font-bold uppercase tracking-widest opacity-70">Consumo</span>
                          <span className="font-black">{Number(point.consumo).toFixed(1)}%</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-4">
                          <span className="font-bold uppercase tracking-widest opacity-70">Saldo</span>
                          <span className={cn(
                            "font-black whitespace-nowrap",
                            point.receita - point.despesa >= 0 ? "text-emerald-300" : "text-rose-300"
                          )}>
                            {formatCurrency(point.receita - point.despesa)}
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Line
                  type="monotone"
                  name="Receitas"
                  dataKey="receita"
                  stroke="#FFFFFF"
                  strokeWidth={3}
                  dot={{ r: 3.5, strokeWidth: 2, fill: '#FFFFFF' }}
                  activeDot={{ r: 5, strokeWidth: 0, fill: '#FFFFFF' }}
                />
                <Line
                  type="monotone"
                  name="Despesas"
                  dataKey="despesa"
                  stroke="#F43F5E"
                  strokeWidth={3}
                  dot={{ r: 3.5, strokeWidth: 2, fill: '#F43F5E' }}
                  activeDot={{ r: 5, strokeWidth: 0, fill: '#F43F5E' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div ref={analysisSectionRef} className="bg-white dark:bg-zinc-900 rounded-[1.75rem] lg:rounded-[2rem] p-4 lg:p-6 border border-gray-100 dark:border-zinc-800 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
            <h3 className="text-lg font-black tracking-tight">Análise de Categoria</h3>
            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
              <SelectTrigger className="h-11 w-full md:w-[240px] rounded-2xl border-2 border-gray-100 dark:border-zinc-800 font-bold">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-2">
                <SelectItem value="all" className="font-bold">Selecionar categoria</SelectItem>
                {categoryAnalysisOptions.map((category) => (
                  <SelectItem key={category.id} value={category.id} className="font-bold">{category.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCategory && selectedCategoryAnalysis ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
                <div className="rounded-2xl border border-gray-100 dark:border-zinc-800 bg-gray-50/70 dark:bg-zinc-950/40 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Atual</p>
                  <p className="mt-2 text-2xl font-black tabular-nums">{formatCurrency(selectedCategoryAnalysis.current)}</p>
                  <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Anterior</p>
                  <p className="mt-2 text-lg font-black tabular-nums text-muted-foreground">{formatCurrency(selectedCategoryAnalysis.previous)}</p>
                  <ComparisonBadge comparison={selectedCategoryAnalysis.comparison} periodLabel={periodLabel} invertColors compact={isMobile} className="mt-4" />
                </div>
                <div className="h-[200px] lg:h-[220px] min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minHeight={180}>
                    <LineChart data={selectedCategoryAnalysis.trend} margin={{ top: 12, right: 12, left: -18, bottom: 6 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 'bold', fill: '#A1A1AA' }} dy={10} />
                      <YAxis hide domain={[0, 'auto']} />
                      <Tooltip cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '4 4' }} formatter={(value) => formatCurrency(Number(value))} />
                      <Line type="monotone" name={selectedCategory.name} dataKey="valor" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 dark:border-zinc-800 bg-gray-50/60 dark:bg-zinc-950/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Itens do período</h4>
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                    {selectedCategoryAnalysis.items.length}
                  </span>
                </div>

                {selectedCategoryAnalysis.items.length > 0 ? (
                  <div className="mt-4 space-y-2 max-h-[280px] overflow-y-auto pr-1" data-testid="category-analysis-items">
                    {selectedCategoryAnalysis.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 rounded-2xl bg-background/90 px-3 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-foreground">{item.description}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            <span>{format(parseLocalDate(item.date), 'dd/MM/yyyy')}</span>
                            <span>{item.isPaid ? 'Pago' : 'Pendente'}</span>
                          </div>
                        </div>
                        <span className="shrink-0 whitespace-nowrap tabular-nums text-sm font-black">
                          {formatCurrency(item.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-border/70 px-4 py-6 text-center text-sm font-bold text-muted-foreground">
                    Nenhum item no período
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm font-bold text-muted-foreground">
              Sem categoria selecionada
            </div>
          )}
        </div>
      </div>

        <div className="order-2 lg:col-span-2 bg-white dark:bg-zinc-900 rounded-[1.75rem] lg:rounded-[2.5rem] p-4 lg:p-8 border border-gray-100 dark:border-zinc-800 shadow-sm">
          <h3 className="text-lg font-black tracking-tight mb-4 lg:mb-6">Ranking de Despesas</h3>
          <div
            className="space-y-4 lg:space-y-6 overflow-y-auto pr-1 max-h-[320px] md:max-h-[420px] lg:max-h-[480px]"
            data-testid="category-ranking-scroll"
          >
            {topCategories.map((cat, idx) => {
              // Lógica de cor baseada no limite
              const hasLimit = cat.budgetLimit !== null && cat.budgetLimit > 0;
              const limitPercentage = hasLimit ? (cat.value / (cat.budgetLimit as number)) * 100 : 0;

              const barColor = !hasLimit ? "bg-primary" :
                limitPercentage > 100 ? "bg-rose-500" :
                  limitPercentage > 80 ? "bg-amber-500" : "bg-emerald-500";

              const isSelected = selectedCategoryId === cat.id;

              return (
                <button 
                  key={idx} 
                  className={cn(
                    "w-full text-left space-y-2 p-2 -m-2 rounded-2xl transition-all",
                    isSelected ? "bg-primary/5 ring-1 ring-primary/20" : "hover:bg-gray-50 dark:hover:bg-zinc-800/50"
                  )}
                  onClick={() => toggleSelectedCategory(cat.id)}
                >
                  <div className="flex justify-between text-sm">
                    <div className="flex flex-col">
                      <span className="font-bold text-zinc-600 dark:text-zinc-400 leading-tight">{cat.name}</span>
                      {hasLimit && (
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
                          Meta: {formatCurrency(cat.budgetLimit as number)} ({limitPercentage.toFixed(0)}%)
                        </span>
                      )}
                    </div>
                    <span className="font-black tabular-nums">{formatCurrency(cat.value)}</span>
                  </div>
                  <div className="h-2 w-full overflow-visible" data-testid={`category-ranking-track-${idx}`}>
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(var(--primary),0.3)]",
                        barColor
                      )}
                      data-testid={`category-ranking-bar-${idx}`}
                      data-category-name={cat.name}
                      style={{ width: `${Math.min(cat.barWidth, 100)}%` }}
                    />
                  </div>
                </button>
              );
            })}
            {topCategories.length === 0 && (
              <div className="text-center py-12 text-muted-foreground italic text-sm">Sem dados de custos.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ComparisonBadge({ 
  comparison, 
  periodLabel, 
  invertColors = false, 
  isPercentPoints = false,
  compact = false,
  className 
}: { 
  comparison: PeriodComparison, 
  periodLabel: string, 
  invertColors?: boolean, 
  isPercentPoints?: boolean,
  compact?: boolean,
  className?: string
}) {
  if (!comparison.hasBase) {
    return (
      <div className={cn("text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1", className)}>
        <span>{compact ? '→ 0%' : `sem base no ${periodLabel}`}</span>
      </div>
    );
  }
  
  const isPositive = comparison.direction === 'up';
  const isNeutral = comparison.direction === 'flat';
  
  // For expenses, UP is BAD (red), DOWN is GOOD (green)
  // For revenue/balance, UP is GOOD (green), DOWN is BAD (red)
  // invertColors=true means UP is BAD.
  const colorClass = isNeutral 
    ? "text-muted-foreground" 
    : (isPositive !== invertColors ? "text-emerald-500" : "text-rose-500");
    
  const arrow = isNeutral ? "→" : (isPositive ? "↑" : "↓");
  const compactPercent = isPercentPoints
    ? Math.abs(comparison.diff)
    : Math.abs(comparison.percent ?? 0);
  const value = isPercentPoints 
    ? `${Math.abs(comparison.diff).toFixed(1)} p.p.` 
    : formatCurrency(Math.abs(comparison.diff));
  
  const percentText = !isPercentPoints && comparison.percent !== null 
    ? ` (${Math.abs(comparison.percent).toFixed(1)}%)` 
    : "";

  if (compact) {
    return (
      <div className={cn("text-[10px] font-black uppercase tracking-widest flex items-center gap-1", colorClass, className)}>
        <span>{arrow} {compactPercent.toFixed(1)}%</span>
      </div>
    );
  }

  return (
    <div className={cn("text-[10px] font-black uppercase tracking-widest flex items-center gap-1", colorClass, className)}>
      <span>{arrow} {value}{percentText}</span>
      <span className="opacity-60">vs {periodLabel}</span>
    </div>
  );
}

function StatCard({ 
  label, 
  value, 
  icon, 
  comparison, 
  periodLabel, 
  isNeutral, 
  forceRed, 
  invertColors,
  compact = false,
  isPercentValue = false,
}: { 
  label: string, 
  value: number, 
  icon: React.ReactNode, 
  comparison?: PeriodComparison, 
  periodLabel?: string, 
  isNeutral?: boolean, 
  forceRed?: boolean,
  invertColors?: boolean,
  compact?: boolean,
  isPercentValue?: boolean,
}) {
  return (
    <div className={cn(
      "bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-sm group transition-all",
      compact ? "rounded-[1.5rem] p-4" : "rounded-[2rem] p-6 hover:scale-[1.02]"
    )}>
      <div className={cn("flex justify-between items-start", compact ? "mb-3" : "mb-4")}>
        <div className={cn("rounded-2xl bg-zinc-50 dark:bg-zinc-800 group-hover:bg-primary/10 transition-colors", compact ? "p-2.5" : "p-3")}>
          {icon}
        </div>
        {comparison && periodLabel && (
          <ComparisonBadge 
            comparison={comparison} 
            periodLabel={periodLabel} 
            invertColors={invertColors} 
            compact={compact}
            className="bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-lg"
          />
        )}
      </div>
      <p className={cn("font-bold text-muted-foreground uppercase tracking-widest", compact ? "text-[10px]" : "text-xs")}>{label}</p>
      <p className={cn(
        "mt-1 whitespace-nowrap font-black tracking-tighter tabular-nums leading-none",
        compact ? "text-lg" : "text-2xl",
        forceRed ? "text-rose-500" : (!isNeutral && (value >= 0 ? "text-emerald-500" : "text-rose-500")),
        isNeutral && "text-gray-900 dark:text-zinc-50"
      )}>
        {isPercentValue ? `${value.toFixed(1)}%` : formatCurrency(value)}
      </p>
    </div>
  );
}

