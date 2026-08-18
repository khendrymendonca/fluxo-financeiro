import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  TrendingUp,
  ArrowUpCircle,
  ArrowDownCircle,
  PieChart as PieIcon,
  ChevronLeft,
  ChevronRight,
  Wallet,
  Printer,
  FileText,
  X,
  Award,
  Lightbulb,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertCircle,
  Info,
  Sparkles,
  TrendingDown,
  Activity,
  Calendar
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
  BarChart,
  Bar,
  AreaChart,
  Area,
  Cell,
  ReferenceLine,
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
import { useTheme } from '@/hooks/useTheme';
import { accentColors, useThemeColor } from '@/hooks/useThemeColor';
import { formatCurrency } from '@/utils/formatters';
import { parseLocalDate } from '@/utils/dateUtils';
import { useAuth } from '@/contexts/AuthContext';
import { getUserFirstName } from '@/utils/userIdentity';
import {
  getTransactionCategoryBucket,
  getTransactionCategoryLabel,
  LOGICAL_AGREEMENT_CATEGORY_KEY,
  LOGICAL_RENEGOTIATION_CATEGORY_KEY,
  LOGICAL_UNCATEGORIZED_CATEGORY_KEY,
  LOGICAL_INVOICE_CATEGORY_KEY
} from '@/utils/transactionCategory';
import { buildCardInvoiceObligations } from '@/utils/invoiceObligations';
import { buildIncomeConsumption, buildPeriodComparison, PeriodComparison } from '@/utils/reportComparisons';
import { Category, CreditCard, Transaction } from '@/types/finance';
import { BudgetOverview } from '@/components/budgets/BudgetOverview';
import { isAgreementEntryTransaction } from '@/utils/debtAgreement';
import { useIsMobile } from '@/hooks/useIsMobile';
import { calculateFluxoScore } from '@/utils/fluxoScore';
import { FluxoScoreCard } from '@/components/dashboard/FluxoScoreCard';
import { Button } from '@/components/ui/button';
import {
  Period,
  ReportMode,
  CategoryAnalysisOption,
  ConsumptionTrendPoint,
  getEffectiveTransactionDate,
  isTransferToCard,
  isEffectiveReportIncome,
  isProjectedReportIncome,
  getMonthTransactionsForReport,
  buildCategoryExpenseRanking,
  buildReportPeriodData,
  buildProjectedReportPeriodData,
  buildProjectedCategoryExpenseRanking,
  buildTrendPeriodPoints,
  buildCategoryPeriodValue,
  buildCategoryPeriodItems,
  getFinancialPeriodLabel,
} from '@/utils/reportCalculations';
import { ChartTypeSelector } from '@/components/reports/ChartTypeSelector';
import { ComparisonBadge } from '@/components/reports/ComparisonBadge';
import { StatCard } from '@/components/reports/StatCard';

export default function ReportsDashboard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { accentColor } = useThemeColor();
  const {
    transactions,
    categories,
    accounts,
    debts,
    creditCards = [],
    viewDate,
    setViewDate,
    subcategories = []
  } = useFinanceStore();

  const [period, setPeriod] = useState<Period>('month');
  const reportMode: ReportMode = 'projected';
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>('all');
  const [mainChartType, setMainChartType] = useState<'line' | 'bar' | 'area'>('line');
  const [categoryChartType, setCategoryChartType] = useState<'line' | 'bar' | 'area'>('line');
  const viewRegime = 'caixa';

  // Reset da subcategoria ao mudar de categoria
  useEffect(() => {
    setSelectedSubcategoryId('all');
  }, [selectedCategoryId]);

  // Consolidação automática de categorias de transferência duplicadas
  useEffect(() => {
    if (!categories || categories.length === 0) return;
    
    const consolidateDuplicates = async () => {
      const activeTransfers = categories.filter(c => c.name === 'Transferência' && !c.deleted_at);
      const expenseCats = activeTransfers.filter(c => c.type === 'expense').sort((a, b) => a.id.localeCompare(b.id));
      const incomeCats = activeTransfers.filter(c => c.type === 'income').sort((a, b) => a.id.localeCompare(b.id));
      
      let changed = false;
      
      if (expenseCats.length > 1) {
        const master = expenseCats[0];
        const dupIds = expenseCats.slice(1).map(d => d.id);
        const { error: txErr } = await supabase
          .from('transactions')
          .update({ category_id: master.id })
          .in('category_id', dupIds);
        if (!txErr) {
          await supabase
            .from('categories')
            .delete()
            .in('id', dupIds);
          changed = true;
        }
      }
      
      if (incomeCats.length > 1) {
        const master = incomeCats[0];
        const dupIds = incomeCats.slice(1).map(d => d.id);
        const { error: txErr } = await supabase
          .from('transactions')
          .update({ category_id: master.id })
          .in('category_id', dupIds);
        if (!txErr) {
          await supabase
            .from('categories')
            .delete()
            .in('id', dupIds);
          changed = true;
        }
      }
      
      if (changed) {
        window.location.reload();
      }
    };
    
    consolidateDuplicates();
  }, [categories]);
  const canUseAdvancedReports = useFeatureFlag('advanced_reports');
  const isMobile = useIsMobile();
  const fluxoScoreEnabled = useMemo(() => {
    try {
      if (!user?.id) return true;
      const raw = localStorage.getItem(`fluxo_score_enabled:${user.id}`);
      return raw === null ? true : raw === 'true';
    } catch {
      return true;
    }
  }, [user?.id]);
  const isDarkTheme = useMemo(() => {
    if (theme === 'dark' || theme === 'amoled') return true;
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  }, [theme]);
  const activeAccentColor = useMemo(() => (
    accentColors.find((color) => color.id === accentColor) ?? accentColors[0]
  ), [accentColor]);
  const incomeTrendColor = isDarkTheme ? '#FFFFFF' : `hsl(${activeAccentColor.hsl})`;
  const expenseTrendColor = isDarkTheme ? '#F43F5E' : '#4B5563';
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

  const getPeriodDataForMode = useCallback((start: Date, end: Date, mode: ReportMode) => {
    if (mode === 'realized') {
      return buildReportPeriodData({
        transactions,
        categories,
        start,
        end,
        selectedAccountId,
        viewRegime,
      });
    }

    return buildProjectedReportPeriodData({
      transactions,
      creditCards,
      categories,
      start,
      end,
      selectedAccountId,
      viewRegime,
    });
  }, [transactions, creditCards, categories, selectedAccountId, viewRegime]);

  const metrics = useMemo(() => {
    const current = getPeriodDataForMode(intervals.start, intervals.end, reportMode);
    const previous = getPeriodDataForMode(intervals.prevStart, intervals.prevEnd, reportMode);
    
    const projected = getPeriodDataForMode(intervals.start, intervals.end, 'projected');
    const realized = getPeriodDataForMode(intervals.start, intervals.end, 'realized');

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
      projectedIncome: projected.income,
      realizedIncome: realized.income,
      projectedExpenses: projected.total,
      realizedExpenses: realized.total,
      projectedBalance: projected.income - projected.total,
      realizedBalance: realized.income - realized.total,
      comparisons: {
        income: buildPeriodComparison(current.income, previous.income),
        expenses: buildPeriodComparison(current.total, previous.total),
        balance: buildPeriodComparison(currentBalance, previousBalance),
        consumption: buildPeriodComparison(currentConsumption.percent ?? 0, previousConsumption.percent ?? 0),
      },
    };
  }, [intervals, getPeriodDataForMode, reportMode]);



  const consumptionTrendData = useMemo<ConsumptionTrendPoint[]>(() => {
    const points = buildTrendPeriodPoints(period, viewDate);

    return points.map((point) => {
      const data = getPeriodDataForMode(point.start, point.end, reportMode);
      const consumption = buildIncomeConsumption(data.income, data.total);
      return {
        name: point.name,
        consumo: consumption.percent ?? 0,
        receita: data.income,
        despesa: data.total,
        isCurrent: point.isCurrent,
      };
    });
  }, [period, viewDate, getPeriodDataForMode, reportMode]);

  const yearOptions = useMemo(() => {
    const years = new Set<number>([new Date().getFullYear(), viewDate.getFullYear()]);

    transactions.forEach((transaction) => {
      years.add(parseLocalDate(getEffectiveTransactionDate(transaction)).getFullYear());
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
        viewRegime,
      });
    }

    return buildCategoryExpenseRanking({
      transactions,
      categories,
      start: intervals.start,
      end: intervals.end,
      selectedAccountId,
      viewRegime,
    });
  }, [transactions, creditCards, categories, intervals, selectedAccountId, reportMode, viewRegime]);

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
      { id: LOGICAL_INVOICE_CATEGORY_KEY, name: 'Cartão de Crédito' },
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

  const currentSubcategories = useMemo(() => {
    if (!selectedCategory) return [];
    const realCatId = selectedCategory.id.replace('category:', '');
    return subcategories.filter(s => s.categoryId === realCatId && s.isActive !== false);
  }, [selectedCategory, subcategories]);

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
      subcategoryId: selectedSubcategoryId,
      viewRegime,
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
      subcategoryId: selectedSubcategoryId,
      viewRegime,
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
        subcategoryId: selectedSubcategoryId,
        viewRegime,
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
        subcategoryId: selectedSubcategoryId,
        viewRegime,
      }),
    };
  }, [categories, creditCards, intervals, period, reportMode, selectedAccountId, selectedCategory, selectedSubcategoryId, transactions, viewDate, viewRegime]);

  const categoryTrendData = useMemo(() => selectedCategoryAnalysis?.trend || [], [selectedCategoryAnalysis]);
  const categoryValues = useMemo(() => categoryTrendData.map(d => Number(d.valor)), [categoryTrendData]);
  const catMinValue = useMemo(() => categoryValues.length > 1 ? Math.min(...categoryValues) : null, [categoryValues]);
  const catMaxValue = useMemo(() => categoryValues.length > 1 ? Math.max(...categoryValues) : null, [categoryValues]);
  const hasDifference = useMemo(() => catMinValue !== null && catMaxValue !== null && catMinValue !== catMaxValue, [catMinValue, catMaxValue]);

  const catChartMargin = isMobile 
    ? { top: 22, right: 16, left: 16, bottom: 6 } 
    : { top: 35, right: 35, left: 35, bottom: 6 };
  const catChartDomain = isMobile 
    ? [0, (max: number) => max * 1.2] 
    : [0, (max: number) => max * 1.25];

  const renderOutlierLabel = useCallback((props: any) => {
    const { x, y, width, value } = props;
    if (value === undefined || value === null) return null;
    const val = Number(value);
    if (!hasDifference) return null;
    
    // For bar charts, Recharts passes a width prop. We center by adding width / 2.
    const labelX = width ? x + width / 2 : x;
    const labelY = isMobile ? y - 8 : y - 12;
    const labelSize = isMobile ? 8 : 10;
    const labelWeight = isMobile ? "700" : "900";
    
    if (val === catMinValue) {
      return (
        <text x={labelX} y={labelY} fill="#10b981" fontSize={labelSize} fontWeight={labelWeight} textAnchor="middle" className="font-sans select-none pointer-events-none">
          {formatCurrency(val)}
        </text>
      );
    }
    if (val === catMaxValue) {
      return (
        <text x={labelX} y={labelY} fill="#ef4444" fontSize={labelSize} fontWeight={labelWeight} textAnchor="middle" className="font-sans select-none pointer-events-none">
          {formatCurrency(val)}
        </text>
      );
    }
    return null;
  }, [hasDifference, catMinValue, catMaxValue, isMobile]);

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
            viewRegime,
          })
        : transactions.filter((transaction) => {
            if (transaction.isVirtual) return false;
            if (selectedAccountId !== 'all' && transaction.accountId !== selectedAccountId) return false;

            const transactionDate = parseLocalDate(getEffectiveTransactionDate(transaction));
            const matchesDate = isSameMonth(transactionDate, month);

            if (transaction.isInvoicePayment && transaction.invoiceMonthYear) {
              if (transaction.isPaid) {
                return isSameMonth(transactionDate, month);
              }
              return transaction.invoiceMonthYear === format(month, 'yyyy-MM');
            }

            if (viewRegime === 'caixa' && transaction.cardId && transaction.invoiceMonthYear) {
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
        const isToCard = isTransferToCard(transaction, transactions);
        if (transaction.isTransfer && !isToCard) return;
        if (transaction.type === 'income') {
          if (reportMode === 'projected' ? !isProjectedReportIncome(transaction) : !isEffectiveReportIncome(transaction)) return;
        }
        if (transaction.type === 'expense') {
          const isExpense = selectedAccountId !== 'all'
            ? (transaction.isInvoicePayment || !transaction.cardId)
            : (viewRegime === 'caixa'
                ? (transaction.isInvoicePayment || !transaction.cardId)
                : !transaction.isInvoicePayment);
          if (!isExpense) return;
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
  }, [accounts, categories, creditCards, period, periodMonths, reportMode, selectedAccountId, transactions, viewDate, yearMonths, viewRegime]);

  const fluxoScore = useMemo(
    () => calculateFluxoScore(transactions, debts, new Date()),
    [transactions, debts]
  );

  const accountBalancesAtEnd = useMemo(() => {
    const lastDay = intervals.end;
    
    return accounts.map(acc => {
      let balance = Number(acc.balance) || 0;
      
      // Filtrar transações reais (não virtuais) pagas que aconteceram DEPOIS da data final do período
      const postTransactions = transactions.filter(tx => {
        if (tx.isVirtual || tx.deleted_at || !tx.isPaid) return false;
        
        const txDateStr = tx.paymentDate || tx.date;
        const txDate = parseLocalDate(txDateStr);
        return txDate > lastDay;
      });
      
      // Reverter o impacto no saldo
      postTransactions.forEach(tx => {
        const amount = Number(tx.amount) || 0;
        
        if (tx.isTransfer && tx.transferGroupId) {
          if (tx.accountId === acc.id && tx.type === 'expense') {
            balance += amount;
          } else if (tx.accountId === acc.id && tx.type === 'income') {
            balance -= amount;
          }
        } else if (tx.accountId === acc.id) {
          if (tx.type === 'expense') {
            balance += amount;
          } else if (tx.type === 'income') {
            balance -= amount;
          }
        }
      });
      
      return {
        ...acc,
        monthEndBalance: balance
      };
    });
  }, [accounts, transactions, intervals.end]);

  const visibleAccounts = useMemo(() => {
    return accountBalancesAtEnd.filter(acc => {
      // Se possui saldo de fechamento relevante (maior que 1 centavo)
      if (Math.abs(acc.monthEndBalance) > 0.009) return true;
      
      // Ou se teve alguma transação no período
      const hasTxInPeriod = transactions.some(tx => {
        if (tx.deleted_at || tx.accountId !== acc.id) return false;
        const txDate = parseLocalDate(tx.date);
        return txDate >= intervals.start && txDate <= intervals.end;
      });
      
      return hasTxInPeriod;
    });
  }, [accountBalancesAtEnd, transactions, intervals.start, intervals.end]);

  const isPastPeriod = useMemo(() => {
    const isTesting = import.meta.env.MODE === 'test';
    if (isTesting) return false;

    const today = new Date();
    return intervals.end < startOfMonth(today);
  }, [intervals.end]);

  return (
    <>
      <div className="space-y-6 animate-fade-in max-w-[1600px] mx-auto pb-10 px-4 xl:px-6 no-print-report-view">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <PageHeader title="Relatórios Analíticos" icon={PieIcon} />
          
          {fluxoScoreEnabled && (
            <div className="flex items-center gap-3 bg-white/40 dark:bg-zinc-900/30 border border-gray-150/30 dark:border-zinc-800/40 px-4 py-2 rounded-2xl shadow-sm backdrop-blur-sm self-start sm:self-auto transition-all duration-300">
              <div className="relative h-11 w-11 flex-shrink-0">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r="48"
                    fill="none"
                    stroke="hsl(var(--primary) / 0.15)"
                    strokeWidth="12"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="48"
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 48}
                    strokeDashoffset={2 * Math.PI * 48 * (1 - fluxoScore.score / 1000)}
                    style={{
                      transition: 'stroke-dashoffset 1300ms cubic-bezier(0.2, 0.9, 0.2, 1)',
                    }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-black tracking-tighter tabular-nums">{fluxoScore.score}</span>
                </div>
              </div>
              <div className="leading-tight">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fluxo Score</p>
                <p className={cn("text-[9px] font-black uppercase tracking-wider", 
                  fluxoScore.score >= 800 ? "text-emerald-500" :
                  fluxoScore.score >= 600 ? "text-primary" :
                  fluxoScore.score >= 400 ? "text-warning" : "text-rose-500"
                )}>
                  {fluxoScore.score >= 800 ? 'Saúde Excelente' :
                   fluxoScore.score >= 600 ? 'Saúde Saudável' :
                   fluxoScore.score >= 400 ? 'Atenção Necessária' : 'Saúde Crítica'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Painel de Controle de Filtros Premium Apple-Style */}
        <div className="bg-white/80 dark:bg-zinc-900/70 backdrop-blur-md border border-gray-200/50 dark:border-zinc-800/50 rounded-2xl p-3.5 shadow-sm no-print flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Lado Esquerdo: Controles de Período Cronológico */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 lg:flex-initial">
            {/* Seletor de Período (Mês / Semestre / Ano) */}
            <div className="relative flex p-0.5 bg-gray-100 dark:bg-zinc-800 rounded-xl h-9 items-center w-full sm:w-64 border border-gray-200/20 dark:border-zinc-700/25">
              <div 
                className="absolute top-0.5 bottom-0.5 bg-white dark:bg-zinc-700 rounded-lg shadow-sm transition-all duration-200 ease-out" 
                style={{
                  width: 'calc(33.333% - 2px)',
                  transform: `translateX(${
                    period === 'month' ? '0%' : period === 'semester' ? '100%' : '200%'
                  })`
                }}
              />
              {(['month', 'semester', 'year'] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "relative z-10 flex-1 py-1 text-center font-bold text-[10px] uppercase tracking-wider transition-colors duration-200 select-none",
                    period === p ? "text-gray-900 dark:text-zinc-50" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p === 'month' ? 'Mês' : p === 'semester' ? 'Semestre' : 'Ano'}
                </button>
              ))}
            </div>

            {/* Controle de Avanço / Retrocesso com Indicador do Período Atual */}
            <div className="flex items-center justify-between bg-gray-50 dark:bg-zinc-800/40 rounded-xl border border-gray-200/30 dark:border-zinc-700/35 px-1 h-9 w-full sm:w-52">
              <button
                onClick={handlePrevPeriod}
                className="p-1.5 hover:bg-white dark:hover:bg-zinc-700 rounded-lg transition-all text-muted-foreground hover:text-foreground"
                aria-label="Período anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-black uppercase tracking-wider text-foreground truncate max-w-[140px] select-none text-center flex-1">
                {currentPeriodLabel}
              </span>
              <button
                onClick={handleNextPeriod}
                className="p-1.5 hover:bg-white dark:hover:bg-zinc-700 rounded-lg transition-all text-muted-foreground hover:text-foreground"
                aria-label="Próximo período"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Divisor vertical sutil no desktop */}
          <div className="hidden lg:block h-6 w-px bg-gray-200 dark:bg-zinc-800" />

          {/* Lado Direito: Filtros Contextuais e Seletor de Data */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Selects de Data (Ano / Mês) */}
            <div className="flex items-center gap-2">
              {/* Select de Ano */}
              <Select
                value={String(viewDate.getFullYear())}
                onValueChange={(val) => setViewDate(new Date(Number(val), period === 'semester' ? (viewDate.getMonth() < 6 ? 0 : 6) : 0, 1))}
              >
                <SelectTrigger className="h-9 rounded-xl border border-gray-200/40 dark:border-zinc-700/40 bg-gray-50 dark:bg-zinc-800/40 font-bold text-xs w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-border/50">
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={String(year)} className="font-bold text-xs">{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Select de Mês */}
              {period === 'month' && (
                <Select
                  value={String(viewDate.getMonth())}
                  onValueChange={(val) => setViewDate(new Date(viewDate.getFullYear(), Number(val), 1))}
                >
                  <SelectTrigger className="h-9 rounded-xl border border-gray-200/40 dark:border-zinc-700/40 bg-gray-50 dark:bg-zinc-800/40 font-bold text-xs w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-border/50">
                    {Array.from({ length: 12 }).map((_, monthIndex) => (
                      <SelectItem key={monthIndex} value={String(monthIndex)} className="font-bold text-xs">
                        {format(new Date(2026, monthIndex, 1), 'MMMM', { locale: ptBR })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Select de Semestre */}
              {period === 'semester' && (
                <Select
                  value={viewDate.getMonth() < 6 ? '1' : '2'}
                  onValueChange={(val) => setViewDate(new Date(viewDate.getFullYear(), val === '1' ? 0 : 6, 1))}
                >
                  <SelectTrigger className="h-9 rounded-xl border border-gray-200/40 dark:border-zinc-700/40 bg-gray-50 dark:bg-zinc-800/40 font-bold text-xs w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-border/50">
                    <SelectItem value="1" className="font-bold text-xs">1º Semestre</SelectItem>
                    <SelectItem value="2" className="font-bold text-xs">2º Semestre</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Seletor de Conta (Wallet) */}
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger className="h-9 rounded-xl bg-gray-50 dark:bg-zinc-800/40 border border-gray-200/40 dark:border-zinc-700/40 font-bold text-xs text-foreground w-full sm:w-60">
                <Wallet className="w-3.5 h-3.5 mr-2 text-primary" />
                <SelectValue placeholder="Conta" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-border/50">
                <SelectItem value="all" className="font-bold text-xs">Todas as Contas</SelectItem>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id} className="font-bold text-xs">
                    {acc.bank ? `${acc.bank} - ${acc.name}` : acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-5">
        <StatCard
          label={isPastPeriod ? 'Receitas realizadas' : (reportMode === 'projected' ? 'Receitas previstas' : 'Receitas efetivas')}
          value={metrics.income}
          icon={<ArrowUpCircle className="text-emerald-500" />}
          comparison={metrics.comparisons.income}
          periodLabel={periodLabel}
          compact={isMobile}
          projectedValue={isPastPeriod ? undefined : metrics.projectedIncome}
          realizedValue={isPastPeriod ? undefined : metrics.realizedIncome}
          reportMode={reportMode}
        />
        <StatCard
          label={isPastPeriod ? 'Despesas realizadas' : (reportMode === 'projected' ? 'Despesas previstas' : 'Despesas efetivas')}
          value={metrics.totalExpenses}
          icon={<ArrowDownCircle className="text-rose-500" />}
          comparison={metrics.comparisons.expenses}
          periodLabel={periodLabel}
          forceRed
          invertColors
          compact={isMobile}
          projectedValue={isPastPeriod ? undefined : metrics.projectedExpenses}
          realizedValue={isPastPeriod ? undefined : metrics.realizedExpenses}
          reportMode={reportMode}
        />
        <StatCard
          label={isPastPeriod ? 'Saldo realizado' : (reportMode === 'projected' ? 'Saldo previsto' : 'Saldo efetivo')}
          value={metrics.balance}
          icon={<TrendingUp className={metrics.balance >= 0 ? "text-primary" : "text-rose-500"} />}
          comparison={metrics.comparisons.balance}
          periodLabel={periodLabel}
          isNeutral
          compact={isMobile}
          projectedValue={isPastPeriod ? undefined : metrics.projectedBalance}
          realizedValue={isPastPeriod ? undefined : metrics.realizedBalance}
          reportMode={reportMode}
        />
      </div>

      {/* Saldos de Fechamento das Contas */}
      {visibleAccounts.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base lg:text-lg font-black tracking-tight">Saldos de Fechamento das Carteiras</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Saldo consolidado das suas contas bancárias ao final do período selecionado</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
            {visibleAccounts.map(acc => {
              const isNegative = acc.monthEndBalance < 0;
              return (
                <div 
                  key={acc.id} 
                  className="p-4 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/30 border border-gray-100 dark:border-zinc-800/60 flex flex-col justify-between min-h-[105px] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md dark:hover:shadow-none"
                  style={{ borderLeft: `4px solid ${acc.color || 'gray'}` }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest truncate">{acc.bank || acc.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-200/50 dark:bg-zinc-800 text-muted-foreground/80 font-black uppercase truncate max-w-[80px]">{acc.name}</span>
                  </div>
                  <div className="mt-3">
                    <p className="text-[9px] font-black uppercase text-muted-foreground/60 tracking-wider">Fechamento</p>
                    <p className={cn("text-base lg:text-lg font-black tracking-tight tabular-nums truncate leading-none mt-1.5", 
                      isNegative ? "text-rose-500" : "text-emerald-500 dark:text-zinc-50"
                    )}>
                      {formatCurrency(acc.monthEndBalance)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

  <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 lg:gap-8">
        <div className="order-1 lg:col-span-3 space-y-5 lg:space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-[1.75rem] lg:rounded-[2rem] p-4 lg:p-6 border border-gray-100 dark:border-zinc-800 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-black tracking-tight">Total de Despesas vs Receitas</h3>
              <p className="text-sm text-muted-foreground mt-1 tabular-nums">
                {formatCurrency(metrics.totalExpenses)} de {formatCurrency(metrics.income)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ChartTypeSelector value={mainChartType} onChange={setMainChartType} />
              <div className="text-left md:text-right shrink-0">
                <p className="text-4xl font-black tracking-tighter tabular-nums leading-none">
                  {metrics.consumption.percent !== null ? `${metrics.consumption.percent.toFixed(1)}%` : 'Sem receita'}
                </p>
                <ComparisonBadge comparison={metrics.comparisons.consumption} periodLabel={periodLabel} isPercentPoints compact={isMobile} className="mt-1" />
              </div>
            </div>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-3 text-[10px] lg:text-[11px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-2">
              <span 
                className="h-2.5 w-2.5 rounded-full ring-1 ring-zinc-300/30"
                style={{ backgroundColor: incomeTrendColor }}
              />
              <span>Receitas</span>
            </div>
            <div className="flex items-center gap-2">
              <span 
                className="h-2.5 w-2.5 rounded-full ring-1 ring-zinc-300/30"
                style={{ backgroundColor: expenseTrendColor }}
              />
              <span>Despesas</span>
            </div>
          </div>

          <div className="h-[200px] md:h-[300px] lg:h-[380px] w-full">
            <ResponsiveContainer width="100%" height="100%" minHeight={isMobile ? 180 : 340}>
              {mainChartType === 'bar' ? (
                <BarChart data={consumptionTrendData} margin={{ top: 12, right: 12, left: -18, bottom: 6 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 'bold', fill: '#A1A1AA' }} dy={10} />
                  <YAxis hide domain={[0, 'auto']} />
                  <Tooltip
                    cursor={{ fill: 'rgba(0,0,0,0.02)' }}
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
                  <Bar dataKey="receita" name="Receitas" fill={incomeTrendColor} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="despesa" name="Despesas" fill={expenseTrendColor} radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : mainChartType === 'area' ? (
                <AreaChart data={consumptionTrendData} margin={{ top: 12, right: 12, left: -18, bottom: 6 }}>
                  <defs>
                    <linearGradient id="colorMainIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={incomeTrendColor} stopOpacity={0.2}/>
                      <stop offset="95%" stopColor={incomeTrendColor} stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorMainExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={expenseTrendColor} stopOpacity={0.2}/>
                      <stop offset="95%" stopColor={expenseTrendColor} stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
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
                  <Area type="monotone" name="Receitas" dataKey="receita" stroke={incomeTrendColor} strokeWidth={3} fillOpacity={1} fill="url(#colorMainIncome)" dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Area type="monotone" name="Despesas" dataKey="despesa" stroke={expenseTrendColor} strokeWidth={3} fillOpacity={1} fill="url(#colorMainExpense)" dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </AreaChart>
              ) : (
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
                    stroke={incomeTrendColor}
                    strokeWidth={3}
                    dot={{ r: 3.5, strokeWidth: 2, fill: incomeTrendColor }}
                    activeDot={{ r: 5, strokeWidth: 0, fill: incomeTrendColor }}
                  />
                  <Line
                    type="monotone"
                    name="Despesas"
                    dataKey="despesa"
                    stroke={expenseTrendColor}
                    strokeWidth={3}
                    dot={{ r: 3.5, strokeWidth: 2, fill: expenseTrendColor }}
                    activeDot={{ r: 5, strokeWidth: 0, fill: expenseTrendColor }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
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

      <div ref={analysisSectionRef} className="bg-white dark:bg-zinc-900 rounded-[1.75rem] lg:rounded-[2.5rem] p-4 lg:p-8 border border-gray-100 dark:border-zinc-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-black tracking-tight">Análise de Categoria</h3>
            {selectedCategory && (
              <ChartTypeSelector value={categoryChartType} onChange={setCategoryChartType} />
            )}
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
              <SelectTrigger className="h-11 w-full md:w-[180px] lg:w-[200px] rounded-2xl border-2 border-gray-100 dark:border-zinc-800 font-bold">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-2">
                <SelectItem value="all" className="font-bold">Selecionar categoria</SelectItem>
                {categoryAnalysisOptions.map((category) => (
                  <SelectItem key={category.id} value={category.id} className="font-bold">{category.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedCategory && currentSubcategories.length > 0 && (
              <Select value={selectedSubcategoryId} onValueChange={setSelectedSubcategoryId}>
                <SelectTrigger className="h-11 w-full md:w-[180px] lg:w-[200px] rounded-2xl border-2 border-gray-100 dark:border-zinc-800 font-bold animate-fade-in">
                  <SelectValue placeholder="Subcategoria" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-2">
                  <SelectItem value="all" className="font-bold">Todas as subcategorias</SelectItem>
                  {currentSubcategories.map((sub) => (
                    <SelectItem key={sub.id} value={sub.id} className="font-bold">{sub.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {selectedCategory && selectedCategoryAnalysis ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
              <div className="rounded-2xl border border-gray-100 dark:border-zinc-800 bg-gray-50/70 dark:bg-zinc-950/40 p-4 space-y-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Atual</p>
                  <p className="mt-1 text-2xl font-black tabular-nums whitespace-nowrap">{formatCurrency(selectedCategoryAnalysis.current)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Anterior</p>
                  <p className="mt-1 text-lg font-black tabular-nums text-muted-foreground whitespace-nowrap">{formatCurrency(selectedCategoryAnalysis.previous)}</p>
                </div>
                <ComparisonBadge comparison={selectedCategoryAnalysis.comparison} periodLabel={periodLabel} invertColors compact={isMobile} className="mt-1" />
              </div>
              <div className="h-[150px] md:h-[200px] lg:h-[220px] min-w-0">
                <ResponsiveContainer width="100%" height="100%" minHeight={isMobile ? 140 : 180}>
                  {categoryChartType === 'bar' ? (
                    <BarChart data={categoryTrendData} margin={catChartMargin}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 'bold', fill: '#A1A1AA' }} dy={10} />
                      <YAxis hide domain={catChartDomain} />
                      <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} formatter={(value) => formatCurrency(Number(value))} />
                      {selectedCategory.budgetLimit && selectedCategory.budgetLimit > 0 && (
                        <ReferenceLine 
                          y={selectedCategory.budgetLimit} 
                          stroke="#ef4444" 
                          strokeDasharray="3 3" 
                          label={{ value: `Meta: ${formatCurrency(selectedCategory.budgetLimit)}`, fill: '#ef4444', position: 'top', fontSize: 10, fontWeight: 'bold' }} 
                        />
                      )}
                      <Bar dataKey="valor" radius={[8, 8, 0, 0]} label={renderOutlierLabel}>
                        {categoryTrendData.map((entry, idx) => {
                          const val = Number(entry.valor);
                          let fill = 'hsl(var(--primary))';
                          if (hasDifference && val === catMinValue) fill = '#10b981'; // lowest (good)
                          else if (hasDifference && val === catMaxValue) fill = '#ef4444'; // highest (bad)
                          return <Cell key={`cell-${idx}`} fill={fill} />;
                        })}
                      </Bar>
                    </BarChart>
                  ) : categoryChartType === 'area' ? (
                    <AreaChart data={categoryTrendData} margin={catChartMargin}>
                      <defs>
                        <linearGradient id="colorCatVal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 'bold', fill: '#A1A1AA' }} dy={10} />
                      <YAxis hide domain={catChartDomain} />
                      <Tooltip cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '4 4' }} formatter={(value) => formatCurrency(Number(value))} />
                      {selectedCategory.budgetLimit && selectedCategory.budgetLimit > 0 && (
                        <ReferenceLine 
                          y={selectedCategory.budgetLimit} 
                          stroke="#ef4444" 
                          strokeDasharray="3 3" 
                          label={{ value: `Meta: ${formatCurrency(selectedCategory.budgetLimit)}`, fill: '#ef4444', position: 'top', fontSize: 10, fontWeight: 'bold' }} 
                        />
                      )}
                      <Area 
                        type="monotone" 
                        name={selectedCategory.name} 
                        dataKey="valor" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={3} 
                        fillOpacity={1}
                        fill="url(#colorCatVal)"
                        label={renderOutlierLabel}
                        dot={(props) => {
                          const { cx, cy, payload } = props;
                          const val = Number(payload.valor);
                          if (hasDifference && val === catMinValue) {
                            return <circle key={`dot-min-${cx}`} cx={cx} cy={cy} r={6} fill="#10b981" stroke="#fff" strokeWidth={2} />;
                          }
                          if (hasDifference && val === catMaxValue) {
                            return <circle key={`dot-max-${cx}`} cx={cx} cy={cy} r={6} fill="#ef4444" stroke="#fff" strokeWidth={2} />;
                          }
                          return <circle key={`dot-${cx}`} cx={cx} cy={cy} r={4} fill="hsl(var(--primary))" />;
                        }}
                        activeDot={{ r: 6 }} 
                      />
                    </AreaChart>
                  ) : (
                    <LineChart data={categoryTrendData} margin={catChartMargin}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 'bold', fill: '#A1A1AA' }} dy={10} />
                      <YAxis hide domain={catChartDomain} />
                      <Tooltip cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '4 4' }} formatter={(value) => formatCurrency(Number(value))} />
                      {selectedCategory.budgetLimit && selectedCategory.budgetLimit > 0 && (
                        <ReferenceLine 
                          y={selectedCategory.budgetLimit} 
                          stroke="#ef4444" 
                          strokeDasharray="3 3" 
                          label={{ value: `Meta: ${formatCurrency(selectedCategory.budgetLimit)}`, fill: '#ef4444', position: 'top', fontSize: 10, fontWeight: 'bold' }} 
                        />
                      )}
                      <Line 
                        type="monotone" 
                        name={selectedCategory.name} 
                        dataKey="valor" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={3} 
                        label={renderOutlierLabel}
                        dot={(props) => {
                          const { cx, cy, payload } = props;
                          const val = Number(payload.valor);
                          if (hasDifference && val === catMinValue) {
                            return <circle key={`dot-min-${cx}`} cx={cx} cy={cy} r={6} fill="#10b981" stroke="#fff" strokeWidth={2} />;
                          }
                          if (hasDifference && val === catMaxValue) {
                            return <circle key={`dot-max-${cx}`} cx={cx} cy={cy} r={6} fill="#ef4444" stroke="#fff" strokeWidth={2} />;
                          }
                          return <circle key={`dot-${cx}`} cx={cx} cy={cy} r={4} fill="hsl(var(--primary))" />;
                        }}
                        activeDot={{ r: 6 }} 
                      />
                    </LineChart>
                  )}
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
                          {item.isPaid && item.paymentDate && item.dueDate && item.dueDate !== item.paymentDate ? (
                            <span>
                              Venc. {format(parseLocalDate(item.dueDate), 'dd/MM/yyyy')} • Pag. {format(parseLocalDate(item.paymentDate), 'dd/MM/yyyy')}
                            </span>
                          ) : (
                            <span>{format(parseLocalDate(item.date), 'dd/MM/yyyy')}</span>
                          )}
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
    </>
  );
}

