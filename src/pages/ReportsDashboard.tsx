import { useState, useMemo } from 'react';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  CheckCircle2,
  PieChart as PieChartIcon,
  Filter,
  ArrowRight,
  Download,
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
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import {
  startOfMonth,
  endOfMonth,
  startOfYear,
  subMonths,
  format,
  isSameMonth,
  isWithinInterval,
  eachMonthOfInterval
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
    viewDate
  } = useFinanceStore();

  const [period, setPeriod] = useState<Period>('month');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');

  const handleExportPDF = () => {
    window.print();
  };

  // Intervalos de tempo
  const intervals = useMemo(() => {
    const end = endOfMonth(viewDate);
    let start = startOfMonth(viewDate);
    let prevStart = subMonths(start, 1);
    let prevEnd = subMonths(end, 1);

    if (period === 'semester') {
      start = subMonths(start, 5);
      prevStart = subMonths(start, 6);
      prevEnd = subMonths(end, 6);
    } else if (period === 'year') {
      start = startOfYear(viewDate);
      prevStart = startOfYear(subMonths(start, 1));
      prevEnd = subMonths(start, 1);
    }

    return { start, end, prevStart, prevEnd };
  }, [viewDate, period]);

  // Filtragem inicial por conta
  const accountFilteredTransactions = useMemo(() => {
    if (selectedAccountId === 'all') return transactions;
    return transactions.filter(t => t.accountId === selectedAccountId);
  }, [transactions, selectedAccountId]);

  // Filtragem de transações do período
  const periodTransactions = useMemo(() => {
    return accountFilteredTransactions.filter(t => {
      const d = new Date(t.date);
      return t.isPaid && isWithinInterval(d, { start: intervals.start, end: intervals.end });
    });
  }, [accountFilteredTransactions, intervals]);

  const prevPeriodTransactions = useMemo(() => {
    return accountFilteredTransactions.filter(t => {
      const d = new Date(t.date);
      return t.isPaid && isWithinInterval(d, { start: intervals.prevStart, end: intervals.prevEnd });
    });
  }, [accountFilteredTransactions, intervals]);

  // Métricas principais
  const metrics = useMemo(() => {
    const totalExpenses = periodTransactions
      .filter(t => t.type === 'expense' && !t.isInvoicePayment)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const prevExpenses = prevPeriodTransactions
      .filter(t => t.type === 'expense' && !t.isInvoicePayment)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const fixedExpenses = periodTransactions
      .filter(t => {
        const cat = categories.find(c => c.id === t.categoryId);
        return t.type === 'expense' && !t.isInvoicePayment && cat?.isFixed;
      })
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const trend = prevExpenses > 0 ? ((totalExpenses - prevExpenses) / prevExpenses) * 100 : 0;

    return { totalExpenses, fixedExpenses, trend, prevExpenses };
  }, [periodTransactions, prevPeriodTransactions, categories]);

  // Top 3 Categorias
  const topCategories = useMemo(() => {
    const group = new Map<string, number>();
    periodTransactions
      .filter(t => t.type === 'expense' && !t.isInvoicePayment)
      .forEach(t => {
        const cat = categories.find(c => c.id === t.categoryId);
        const name = cat?.name || 'Outros';
        group.set(name, (group.get(name) || 0) + Number(t.amount));
      });

    return Array.from(group.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);
  }, [periodTransactions, categories]);

  // Dados para Evolução de Contas Fixas (últimos 6 meses independente do filtro)
  const fixedEvolutionData = useMemo(() => {
    const sixMonthsAgo = subMonths(startOfMonth(viewDate), 5);
    const months = eachMonthOfInterval({ start: sixMonthsAgo, end: endOfMonth(viewDate) });

    return months.map(m => {
      const mStr = format(m, 'MMM', { locale: ptBR });
      const total = accountFilteredTransactions
        .filter(t => {
          const d = new Date(t.date);
          const cat = categories.find(c => c.id === t.categoryId);
          return t.isPaid &&
            t.type === 'expense' &&
            !t.isInvoicePayment &&
            cat?.isFixed &&
            isSameMonth(d, m);
        })
        .reduce((sum, t) => sum + Number(t.amount), 0);

      return { month: mStr, total };
    });
  }, [accountFilteredTransactions, categories, viewDate]);

  // Insights Preditivos Reais (Run Rate)
  const insightData = useMemo(() => {
    const today = new Date();
    const daysInMonth = endOfMonth(viewDate).getDate();
    const isCurrentMonth = isSameMonth(viewDate, today);
    const dayForCalculation = isCurrentMonth ? today.getDate() : daysInMonth;

    const totalIncome = periodTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const dailyAverage = metrics.totalExpenses / (dayForCalculation || 1);
    const projection = dailyAverage * daysInMonth;

    const isOverBudget = projection > totalIncome && totalIncome > 0;
    const variation = metrics.prevExpenses > 0 ? ((metrics.totalExpenses - metrics.prevExpenses) / metrics.prevExpenses) * 100 : 0;

    return { projection, isOverBudget, totalIncome, variation, isCurrentMonth };
  }, [metrics, periodTransactions, viewDate]);

  // Distribuição por Grupo de Orçamento (Pie Chart)
  const groupDistribution = useMemo(() => {
    const data = [
      { name: 'Essencial', value: 0, color: '#0ea5e9' },
      { name: 'Estilo de Vida', value: 0, color: '#f59e0b' },
      { name: 'Metas', value: 0, color: '#10b981' }
    ];

    periodTransactions.filter(t => t.type === 'expense' && !t.isInvoicePayment).forEach(t => {
      const cat = categories.find(c => c.id === t.categoryId);
      if (!cat || !cat.groupId) return;
      if (cat.groupId.includes('essent') || cat.groupId === '1') data[0].value += Number(t.amount);
      else if (cat.groupId.includes('life') || cat.groupId === '2') data[1].value += Number(t.amount);
      else data[2].value += Number(t.amount);
    });

    return data.filter(d => d.value > 0);
  }, [periodTransactions, categories]);

  return (
    <div className="space-y-6 animate-fade-in pb-24 max-w-5xl mx-auto px-4 md:px-0">
      <PageHeader title="Relatórios" icon={BarChart3}>
        <div className="flex flex-wrap items-center gap-3 no-print">
          <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
            <SelectTrigger className="h-10 w-[180px] rounded-xl bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 font-bold text-gray-900 dark:text-zinc-50">
              <Wallet className="w-4 h-4 mr-2 text-primary" />
              <SelectValue placeholder="Filtrar Conta" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all" className="font-bold">Todas as Contas</SelectItem>
              {accounts.map(acc => (
                <SelectItem key={acc.id} value={acc.id} className="font-bold">
                  {acc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex bg-gray-50 dark:bg-zinc-800/50 p-1 rounded-xl border border-gray-100 dark:border-zinc-800">
            {(['month', 'semester', 'year'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                  period === p
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {p === 'month' ? 'Mês' : p === 'semester' ? 'Semestre' : 'Ano'}
              </button>
            ))}
          </div>
        </div>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm dark:shadow-none border border-gray-100 dark:border-zinc-800 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
            <TrendingDown className="w-16 h-16" />
          </div>
          <p className="text-[10px] font-black text-gray-500 dark:text-zinc-500 uppercase tracking-widest mb-1">Total Despesas</p>
          <h3 className="text-3xl font-black tracking-tight text-gray-900 dark:text-zinc-50">{formatCurrency(metrics.totalExpenses)}</h3>
          <div className="flex items-center gap-1 mt-2">
            {metrics.trend > 0 ? (
              <span className="text-xs font-bold text-danger flex items-center">
                <ArrowUpRight className="w-3 h-3 mr-0.5" /> {metrics.trend.toFixed(1)}%
              </span>
            ) : (
              <span className="text-xs font-bold text-success flex items-center">
                <ArrowDownRight className="w-3 h-3 mr-0.5" /> {Math.abs(metrics.trend).toFixed(1)}%
              </span>
            )}
            <span className="text-[10px] text-muted-foreground font-medium">vs. período anterior</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm dark:shadow-none border border-gray-100 dark:border-zinc-800 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
            <Zap className="w-16 h-16" />
          </div>
          <p className="text-[10px] font-black text-gray-500 dark:text-zinc-500 uppercase tracking-widest mb-1">Contas Fixas</p>
          <h3 className="text-3xl font-black tracking-tight text-amber-600 dark:text-amber-500">{formatCurrency(metrics.fixedExpenses)}</h3>
          <p className="text-[10px] text-gray-500 dark:text-zinc-500 mt-2 font-medium">
            Representa <span className="font-bold">{(metrics.totalExpenses > 0 ? (metrics.fixedExpenses / metrics.totalExpenses) * 100 : 0).toFixed(0)}%</span> dos gastos totais.
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 md:p-6 shadow-sm dark:shadow-none border border-gray-100 dark:border-zinc-800 bg-primary/5 dark:bg-primary/5 border-primary/20 dark:border-primary/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Zap className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-zinc-50">Contas Fixas (6 Meses)</h4>
          </div>
          <div className="h-[80px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={fixedEvolutionData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="total" stroke="var(--primary)" fillOpacity={1} fill="url(#colorTotal)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm dark:shadow-none border border-gray-100 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-4 bg-danger rounded-full" />
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-zinc-50">Maiores Despesas</h3>
            </div>
            <p className="text-[10px] font-bold text-muted-foreground">Por Categoria</p>
          </div>

          <div className="space-y-4">
            {topCategories.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground italic text-sm">Nenhuma despesa registrada.</div>
            ) : (
              topCategories.map((item, idx) => (
                <div key={item.name} className="relative">
                  <div className="flex justify-between items-end mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-muted-foreground/30">#{idx + 1}</span>
                      <span className="text-xs font-bold">{item.name}</span>
                    </div>
                    <span className="text-xs font-black">{formatCurrency(item.value)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-danger transition-all duration-1000"
                      style={{ width: `${(item.value / topCategories[0].value) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          {topCategories.length > 0 && (
            <div className="mt-8 pt-4 border-t border-border/50">
              <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase opacity-70">
                <span>Concentração do Top 3</span>
                <span>{((topCategories.reduce((s, v) => s + v.value, 0) / metrics.totalExpenses) * 100).toFixed(0)}% do total</span>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm dark:shadow-none border border-gray-100 dark:border-zinc-800 flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <PieChartIcon className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-zinc-50">Perfil de Consumo</h3>
          </div>
          <div className="flex-1 flex flex-col md:flex-row items-center gap-4">
            <div className="h-[180px] w-full md:w-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={groupDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {groupDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(val: number) => formatCurrency(val)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-3 w-full">
              {groupDistribution.map(item => (
                <div key={item.name} className="flex items-center justify-between border-b border-border/30 pb-2 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs font-bold">{item.name}</span>
                  </div>
                  <span className="text-xs font-black">{((item.value / metrics.totalExpenses) * 100).toFixed(0)}%</span>
                </div>
              ))}
              {groupDistribution.length === 0 && (
                <p className="text-xs text-muted-foreground italic text-center">Sem dados de grupo.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm dark:shadow-none border border-gray-100 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-zinc-50">Evolução Histórica</h3>
          </div>
        </div>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={fixedEvolutionData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} dy={10} />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: 'var(--primary)', opacity: 0.05 }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                formatter={(val: number) => formatCurrency(val)}
              />
              <Bar dataKey="total" fill="var(--primary)" radius={[6, 6, 6, 6]} barSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className={cn(
          "mt-6 p-4 rounded-2xl border flex items-start gap-3 transition-colors",
          insightData.isOverBudget ? "bg-danger/5 border-danger/20" : "bg-success/5 border-success/20"
        )}>
          <div className={cn(
            "p-2 rounded-xl",
            insightData.isOverBudget ? "bg-danger/20 text-danger" : "bg-success/20 text-success"
          )}>
            {insightData.isOverBudget ? <Zap className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          </div>
          <div>
            <p className="text-xs font-bold">Insight Preditivo: {insightData.isCurrentMonth ? "Projeção de Fechamento" : "Fechamento do Período"}</p>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {insightData.isOverBudget ? (
                <>
                  <span className="text-danger font-bold">Atenção:</span> No ritmo atual de gastos, você fechará o mês com uma despesa projetada de <span className="text-danger font-bold">{formatCurrency(insightData.projection)}</span>, o que supera sua receita atual de <span className="text-success font-bold">{formatCurrency(insightData.totalIncome)}</span>.
                </>
              ) : (
                <>
                  <span className="text-success font-bold">Parabéns!</span> Seu ritmo de gastos está saudável. Sua projeção de fechamento é de <span className="text-primary font-bold">{formatCurrency(insightData.projection)}</span>, mantendo um saldo positivo em relação às suas receitas.
                </>
              )}
              {insightData.variation !== 0 && (
                <span> Seus custos fixos variaram <span className="font-bold">{Math.abs(insightData.variation).toFixed(1)}%</span> em relação ao período anterior.</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 no-print">
        <button
          onClick={handleExportPDF}
          className="flex-1 bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-sm dark:shadow-none border border-gray-100 dark:border-zinc-800 flex items-center justify-between group hover:border-success/50 transition-all font-black uppercase tracking-widest text-xs text-gray-900 dark:text-zinc-50"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10 text-success">
              <Download className="w-4 h-4" />
            </div>
            Exportar Relatório PDF
          </div>
          <ArrowRight className="w-4 h-4 text-gray-400 dark:text-zinc-600 group-hover:text-success transition-colors" />
        </button>
      </div>
    </div>
  );
}
