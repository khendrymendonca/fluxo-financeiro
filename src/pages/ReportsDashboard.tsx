import { useState, useMemo, useCallback } from 'react';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  BarChart3,
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

  // Navegação de Período
  const handlePrevMonth = () => setViewDate(subMonths(viewDate, 1));
  const handleNextMonth = () => setViewDate(addMonths(viewDate, 1));

  // Intervalos de tempo robustos
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

  // 🛡️ MOTOR DE CÁLCULO ROBUSTO
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
        if (t.isVirtual) return false;
        if (selectedAccountId !== 'all' && t.accountId !== selectedAccountId) return false;
        const d = new Date(t.date);
        if (t.categoryId === 'card-payment' && t.invoiceMonthYear) {
          const [y, m] = t.invoiceMonthYear.split('-').map(Number);
          return m - 1 === targetMonth && y === targetYear;
        }
        return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
      });

      monthReal.forEach(t => {
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
        const motherDate = new Date(mother.date);
        if (isBefore(startOfMonth(motherDate), addMonths(startOfMonth(month), 1))) {
          const hasReal = monthReal.some(r => r.originalId === mother.id || (r.id === mother.id && isSameMonth(new Date(r.date), month)));
          if (!hasReal) {
            const val = Number(mother.amount);
            total += val;
            const cat = categories.find(c => c.id === mother.categoryId);
            if (cat?.isFixed) fixed += val;
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
        valor: data.total,
        isCurrent: i === 5
      };
    });
  }, [viewDate, getPeriodData]);

  const topCategories = useMemo(() => {
    const distMap = new Map<string, number>();
    const months = eachMonthOfInterval({ start: intervals.start, end: intervals.end });

    months.forEach(month => {
      const targetMonth = month.getMonth();
      const targetYear = month.getFullYear();
      const monthTransactions = transactions.filter(t => {
        if (selectedAccountId !== 'all' && t.accountId !== selectedAccountId) return false;
        const d = new Date(t.date);
        return d.getMonth() === targetMonth && d.getFullYear() === targetYear && t.type === 'expense' && !t.isInvoicePayment;
      });

      monthTransactions.forEach(t => {
        const cat = categories.find(c => c.id === t.categoryId);
        const name = cat?.name || 'Outros';
        distMap.set(name, (distMap.get(name) || 0) + Number(t.amount));
      });
    });

    return Array.from(distMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [transactions, categories, intervals, selectedAccountId]);

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto pb-10 px-4 md:px-0">
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
                  {[2024, 2025, 2026, 2027].map(year => (
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
        />
        <StatCard 
          label="Saldo do Período" 
          value={metrics.balance} 
          icon={<TrendingUp className={metrics.balance >= 0 ? "text-primary" : "text-rose-500"} />}
          isNeutral
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-black tracking-tight">Evolução Mensal</h3>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Gastos Totais</p>
            </div>
            <Calendar className="text-muted-foreground w-5 h-5 opacity-20" />
          </div>

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
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
                        <div className="bg-zinc-900 text-white px-4 py-2 rounded-2xl shadow-xl border border-white/10 text-xs font-bold">
                          {formatCurrency(payload[0].value as number)}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="valor" radius={[10, 10, 10, 10]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.isCurrent ? 'hsl(var(--primary))' : 'rgba(161, 161, 170, 0.2)'} 
                      className="transition-all duration-500 hover:opacity-80"
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
              return (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-bold text-zinc-600 dark:text-zinc-400">{cat.name}</span>
                    <span className="font-black tabular-nums">{formatCurrency(cat.value)}</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(var(--primary),0.3)]"
                      style={{ width: `${percentage}%` }}
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

function StatCard({ label, value, icon, trend, isNeutral }: { label: string, value: number, icon: React.ReactNode, trend?: string, isNeutral?: boolean }) {
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
        !isNeutral && (value >= 0 ? "text-emerald-500" : "text-rose-500"),
        isNeutral && "text-gray-900 dark:text-zinc-50"
      )}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}
