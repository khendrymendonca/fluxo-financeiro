import { useState, useMemo, useCallback } from 'react';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  TrendingUp,
  ArrowUpCircle,
  ArrowDownCircle,
  PieChart as PieIcon,
  Calendar,
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
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
import { formatCurrency } from '@/utils/formatters';
import { parseLocalDate } from '@/utils/dateUtils';
import { getTransactionCategoryLabel } from '@/utils/transactionCategory';

type Period = 'month' | 'semester' | 'year';

export default function ReportsDashboard() {
  const {
    transactions,
    categories,
    accounts,
    viewDate,
    setViewDate
  } = useFinanceStore();

  const [period, setPeriod] = useState<Period>('month');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');

  const handlePrevMonth = () => setViewDate(subMonths(viewDate, 1));
  const handleNextMonth = () => setViewDate(addMonths(viewDate, 1));

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

  const getPeriodData = useCallback((start: Date, end: Date) => {
    const months = eachMonthOfInterval({ start, end });
    let total = 0;
    let fixed = 0;
    let paid = 0;
    let income = 0;

    months.forEach(month => {
      const targetMonth = month.getMonth();
      const targetYear = month.getFullYear();

      const monthReal = transactions.filter(t => {
        if (t.isVirtual && !t.isRecurring) return false;
        if (selectedAccountId !== 'all' && t.accountId !== selectedAccountId) return false;

        const d = parseLocalDate(t.date);
        const matchesDate = d.getMonth() === targetMonth && d.getFullYear() === targetYear;

        if (t.isInvoicePayment && t.invoiceMonthYear) {
          const [y, m] = t.invoiceMonthYear.split('-').map(Number);
          return m - 1 === targetMonth && y === targetYear;
        }
        return matchesDate;
      });

      monthReal.forEach(t => {
        if (t.isTransfer) return;
        const val = Number(t.amount);
        if (t.type === 'expense' && !t.isInvoicePayment) {
          total += val;
          if (t.isPaid) paid += val;
          const cat = categories.find(c => c.id === t.categoryId);
          if (cat?.isFixed) fixed += val;
        } else if (t.type === 'income') {
          income += val;
        }
      });

      const recurringMothers = transactions.filter(t => t.isRecurring && !t.isVirtual);
      recurringMothers.forEach(mother => {
        if (selectedAccountId !== 'all' && mother.accountId !== selectedAccountId) return;
        if (mother.isTransfer) return;

        const motherDate = parseLocalDate(mother.date);
        if (isBefore(startOfMonth(motherDate), addMonths(startOfMonth(month), 1))) {
          const hasReal = monthReal.some(r => r.originalId === mother.id || (r.id === mother.id && isSameMonth(parseLocalDate(r.date), month)));

          if (!hasReal) {
            const val = Number(mother.amount);
            if (mother.type === 'expense') {
              total += val;
              const cat = categories.find(c => c.id === mother.categoryId);
              if (cat?.isFixed) fixed += val;
            } else if (mother.type === 'income') {
              income += val;
            }
          }
        }
      });
    });

    return { total, fixed, paid, income };
  }, [transactions, categories, selectedAccountId]);

  const metrics = useMemo(() => {
    const current = getPeriodData(intervals.start, intervals.end);
    const previous = getPeriodData(intervals.prevStart, intervals.prevEnd);
    const trend = previous.total > 0 ? ((current.total - previous.total) / previous.total) * 100 : 0;

    return {
      totalExpenses: current.total,
      paidExpenses: current.paid,
      fixedExpenses: current.fixed,
      income: current.income,
      trend,
      balance: current.income - current.total
    };
  }, [intervals, getPeriodData]);

  const chartData = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => {
      const monthDate = subMonths(startOfMonth(viewDate), 5 - i);
      const data = getPeriodData(startOfMonth(monthDate), endOfMonth(monthDate));
      return {
        name: format(monthDate, 'MMM', { locale: ptBR }),
        despesa: data.total,
        receita: data.income,
        isCurrent: i === 5
      };
    });
  }, [viewDate, getPeriodData]);

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
    const distMap = new Map<string, number>();
    const months = eachMonthOfInterval({ start: intervals.start, end: intervals.end });

    months.forEach(month => {
      const targetMonth = month.getMonth();
      const targetYear = month.getFullYear();
      const monthTransactions = transactions.filter(t => {
        if (selectedAccountId !== 'all' && t.accountId !== selectedAccountId) return false;
        const d = parseLocalDate(t.date);
        return d.getMonth() === targetMonth && d.getFullYear() === targetYear && t.type === 'expense' && !t.isInvoicePayment && !t.isTransfer;
      });

      monthTransactions.forEach(t => {
        const name = getTransactionCategoryLabel(t, categories, 'Outros');
        distMap.set(name, (distMap.get(name) || 0) + Number(t.amount));
      });
    });

    return Array.from(distMap.entries())
      .map(([name, value]) => {
        const cat = categories.find(c => c.name === name);
        return {
          name,
          value,
          budgetLimit: cat?.budgetLimit ?? null,
          color: cat?.color
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [transactions, categories, intervals, selectedAccountId]);

  const annualVision = useMemo(() => {
    const monthKeys = yearMonths.map((month) => format(month, 'yyyy-MM'));

    const getSyntheticMonthTransactions = (month: Date) => {
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

        return matchesDate;
      });

      const projectedRecurring = transactions.flatMap((transaction) => {
        if (!transaction.isRecurring || transaction.isVirtual) return [];
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

      return [...monthReal, ...projectedRecurring, ...projectedInstallments];
    };

    const monthlyTransactionsMap = yearMonths.reduce<Record<string, typeof transactions>>((accumulator, month) => {
      accumulator[format(month, 'yyyy-MM')] = getSyntheticMonthTransactions(month);
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
        if (transaction.isTransfer || transaction.isInvoicePayment) return;

        const rowName = getTransactionCategoryLabel(
          transaction,
          categories,
          transaction.type === 'income' ? 'Receitas sem categoria' : 'Outros'
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
    const negativeMonths = yearMonths.filter((month) => netByMonth[format(month, 'yyyy-MM')] < 0);
    const strongestMonth = yearMonths.reduce((best, month) => {
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
    const projectedYearEndBalance = viewDate.getFullYear() === currentYear
      ? currentTotalBalance + yearMonths.reduce((sum, month) => {
          if (month.getMonth() <= currentMonth) return sum;
          return sum + netByMonth[format(month, 'yyyy-MM')];
        }, 0)
      : null;

    return {
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
  }, [accounts, categories, selectedAccountId, transactions, viewDate, yearMonths]);

  return (
    <div className="space-y-8 animate-fade-in max-w-[1600px] mx-auto pb-10 px-4 xl:px-6">
      <PageHeader title="Relatórios Analíticos" icon={PieIcon}>
        <div className="flex flex-wrap items-center gap-3 no-print">
          <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl p-1">
            {period === 'month' ? (
              <>
                <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="px-2 min-w-[120px] text-center">
                  <span className="text-xs font-black uppercase tracking-widest truncate">
                    {format(viewDate, 'MMMM yyyy', { locale: ptBR })}
                  </span>
                </div>
                <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            ) : period === 'semester' ? (
              <Select
                value={viewDate.getMonth() < 6 ? '1' : '2'}
                onValueChange={(val) => setViewDate(new Date(viewDate.getFullYear(), val === '1' ? 0 : 6, 1))}
              >
                <SelectTrigger className="h-9 border-none bg-transparent font-black uppercase tracking-widest text-xs min-w-[160px] outline-none shadow-none focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-2">
                  <SelectItem value="1" className="font-bold">1º Semestre {viewDate.getFullYear()}</SelectItem>
                  <SelectItem value="2" className="font-bold">2º Semestre {viewDate.getFullYear()}</SelectItem>
                </SelectContent>
              </Select>
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
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label="Receitas"
          value={metrics.income}
          icon={<ArrowUpCircle className="text-emerald-500" />}
          trend={metrics.trend >= 0 ? `+${metrics.trend.toFixed(0)}%` : `${metrics.trend.toFixed(0)}%`}
        />
        <StatCard
          label="Despesas"
          value={metrics.totalExpenses}
          icon={<ArrowDownCircle className="text-rose-500" />}
          trend={metrics.trend >= 0 ? `+${metrics.trend.toFixed(0)}%` : `${metrics.trend.toFixed(0)}%`}
          forceRed
        />
        <StatCard
          label="Saldo do Período"
          value={metrics.balance}
          icon={<TrendingUp className={metrics.balance >= 0 ? "text-primary" : "text-rose-500"} />}
          isNeutral
        />
      </div>

      <div className="lg:hidden bg-white dark:bg-zinc-900 rounded-[2rem] p-5 border border-gray-100 dark:border-zinc-800 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-2">Desktop</p>
        <h3 className="text-base font-black tracking-tight">Mapa anual por categoria</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Esse relatório fica visível só em telas maiores para não poluir o mobile.
        </p>
      </div>

      <div className="hidden lg:block bg-white dark:bg-zinc-900 rounded-[2.5rem] p-10 xl:p-12 border border-gray-100 dark:border-zinc-800 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-8">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2">Pergunta do Milhão</p>
            <h3 className="text-2xl font-black tracking-tight">Mapa anual por categoria</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
              Uma linha por categoria de lançamento, um mês por coluna e o total do ano no fim. Assim você enxerga receita, moradia, transporte e onde o caixa desvia.
            </p>
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
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">Fechamento do ano</p>
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
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Receita x despesa no ano</p>
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
                ? 'O ano está sem meses deficitários nessa visão.'
                : `Há ${annualVision.negativeMonths.length} mês(es) pedindo ajuste de rota.`}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-[2rem] border border-gray-100 dark:border-zinc-800">
          <table className="min-w-[1480px] w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-950/70">
              <tr>
                <th className="sticky left-0 z-10 bg-zinc-50 dark:bg-zinc-950/70 px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground min-w-[240px]">Categoria</th>
                {yearMonths.map((month) => (
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
                  <td colSpan={yearMonths.length + 1} />
                </tr>
              )}

              {annualVision.incomeRows.map((row) => (
                <tr key={row.id} className="border-t border-gray-100 dark:border-zinc-800">
                  <td className="sticky left-0 z-10 bg-white dark:bg-zinc-900 px-5 py-4">
                    <span className="text-sm font-black text-foreground">{row.name}</span>
                  </td>
                  {yearMonths.map((month) => {
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
                  <td colSpan={yearMonths.length + 1} />
                </tr>
              )}

              {annualVision.expenseRows.map((row) => (
                <tr key={row.id} className="border-t border-gray-100 dark:border-zinc-800">
                  <td className="sticky left-0 z-10 bg-white dark:bg-zinc-900 px-5 py-4">
                    <span className="text-sm font-black text-foreground">{row.name}</span>
                  </td>
                  {yearMonths.map((month) => {
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
                {yearMonths.map((month) => {
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
                {yearMonths.map((month) => {
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
                {yearMonths.map((month) => {
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

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-black tracking-tight">Evolução Mensal</h3>
              <div className="flex items-center gap-4 mt-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Receitas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Despesas</span>
                </div>
              </div>
            </div>
            <Calendar className="text-muted-foreground w-5 h-5 opacity-20" />
          </div>

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%" minHeight={300}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.04)" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fontWeight: 'bold', fill: '#A1A1AA' }}
                  dy={10}
                />
                <YAxis hide domain={[0, 'auto']} />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-zinc-900 text-white p-3 rounded-2xl shadow-xl border border-white/10 text-[10px] space-y-1.5 min-w-[140px]">
                          {payload.map((p, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.fill }} />
                                <span className="font-bold uppercase tracking-widest opacity-70">{p.name}</span>
                              </div>
                              <span className="font-black">{formatCurrency(p.value as number)}</span>
                            </div>
                          ))}
                          <div className="pt-1.5 mt-1.5 border-t border-white/10 flex justify-between items-center">
                            <span className="font-bold uppercase tracking-widest opacity-70">Saldo</span>
                            <span className={cn("font-black", (payload[0].value as number - (payload[1]?.value as number || 0)) >= 0 ? "text-emerald-400" : "text-rose-400")}>
                              {formatCurrency((payload[0].value as number) - (payload[1]?.value as number || 0))}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar name="Receita" dataKey="receita" radius={[6, 6, 6, 6]} barSize={16}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-income-${index}`}
                      fill={entry.isCurrent ? '#10b981' : 'rgba(16, 185, 129, 0.2)'}
                    />
                  ))}
                </Bar>
                <Bar name="Despesa" dataKey="despesa" radius={[6, 6, 6, 6]} barSize={16}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-expense-${index}`}
                      fill={entry.isCurrent ? 'hsl(var(--primary))' : 'rgba(161, 161, 170, 0.2)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-zinc-800 shadow-sm">
          <h3 className="text-lg font-black tracking-tight mb-6">Por Categoria</h3>
          <div className="space-y-6">
            {topCategories.map((cat, idx) => {
              const percentage = metrics.totalExpenses > 0 ? (cat.value / metrics.totalExpenses) * 100 : 0;

              // Lógica de cor baseada no limite
              const hasLimit = cat.budgetLimit !== null && cat.budgetLimit > 0;
              const limitPercentage = hasLimit ? (cat.value / (cat.budgetLimit as number)) * 100 : 0;

              const barColor = !hasLimit ? "bg-primary" :
                limitPercentage > 100 ? "bg-rose-500" :
                  limitPercentage > 80 ? "bg-amber-500" : "bg-emerald-500";

              return (
                <div key={idx} className="space-y-2">
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
                  <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(var(--primary),0.3)]",
                        barColor
                      )}
                      style={{ width: `${hasLimit ? Math.min(limitPercentage, 100) : percentage}%` }}
                    />
                  </div>
                </div>
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

function StatCard({ label, value, icon, trend, isNeutral, forceRed }: { label: string, value: number, icon: React.ReactNode, trend?: string, isNeutral?: boolean, forceRed?: boolean }) {
  return (
    <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-gray-100 dark:border-zinc-800 shadow-sm group hover:scale-[1.02] transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800 group-hover:bg-primary/10 transition-colors">
          {icon}
        </div>
        {trend && (
          <span className="text-[10px] font-black bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-lg uppercase tracking-tighter opacity-60">
            {trend}
          </span>
        )}
      </div>
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{label}</p>
      <p className={cn(
        "text-2xl font-black tracking-tighter mt-1",
        forceRed ? "text-rose-500" : (!isNeutral && (value >= 0 ? "text-emerald-500" : "text-rose-500")),
        isNeutral && "text-gray-900 dark:text-zinc-50"
      )}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}
