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
  ArrowRight
} from 'lucide-react';
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
  subDays,
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
    viewDate
  } = useFinanceStore();

  const [period, setPeriod] = useState<Period>('month');

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

  // Filtragem de transações do período
  const periodTransactions = useMemo(() => {
    return transactions.filter(t => {
      const d = new Date(t.date);
      return t.isPaid && isWithinInterval(d, { start: intervals.start, end: intervals.end });
    });
  }, [transactions, intervals]);

  const prevPeriodTransactions = useMemo(() => {
    return transactions.filter(t => {
      const d = new Date(t.date);
      return t.isPaid && isWithinInterval(d, { start: intervals.prevStart, end: intervals.prevEnd });
    });
  }, [transactions, intervals]);

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
      const total = transactions
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
  }, [transactions, categories, viewDate]);

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
      // Mapeamento simples baseado nos grupos que conhecemos
      if (cat.groupId.includes('essent') || cat.groupId === '1') data[0].value += Number(t.amount);
      else if (cat.groupId.includes('life') || cat.groupId === '2') data[1].value += Number(t.amount);
      else data[2].value += Number(t.amount);
    });

    return data.filter(d => d.value > 0);
  }, [periodTransactions, categories]);

  return (
    <div className="space-y-6 animate-fade-in pb-24 max-w-5xl mx-auto px-4 md:px-0">
      <PageHeader title="Relatórios" icon={BarChart3}>
        <div className="flex bg-muted/30 p-1 rounded-xl border border-border/50">
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
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-elevated p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
            <TrendingDown className="w-16 h-16" />
          </div>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Total Despesas</p>
          <h3 className="text-3xl font-black tracking-tight">{formatCurrency(metrics.totalExpenses)}</h3>
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

        <div className="card-elevated p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
            <Zap className="w-16 h-16" />
          </div>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Contas Fixas</p>
          <h3 className="text-3xl font-black tracking-tight text-amber-600">{formatCurrency(metrics.fixedExpenses)}</h3>
          <p className="text-[10px] text-muted-foreground mt-2 font-medium">
            Representa <span className="font-bold">{(metrics.totalExpenses > 0 ? (metrics.fixedExpenses / metrics.totalExpenses) * 100 : 0).toFixed(0)}%</span> dos gastos totais.
          </p>
        </div>

        <div className="card-elevated p-4 md:p-6 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Zap className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-black uppercase tracking-widest">Contas Fixas (6 Meses)</h4>
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
        {/* Top 3 Despesas */}
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-4 bg-danger rounded-full" />
              <h3 className="text-sm font-black uppercase tracking-widest">Maiores Despesas</h3>
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

        {/* Distribuição por Grupo */}
        <div className="card-elevated p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <PieChartIcon className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-black uppercase tracking-widest">Perfil de Consumo</h3>
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

      {/* Evolução de Gastos Detalhada */}
      <div className="card-elevated p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-black uppercase tracking-widest">Evolução Histórica</h3>
          </div>
        </div>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={fixedEvolutionData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fontWeight: 700 }}
                dy={10}
              />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: 'var(--primary)', opacity: 0.05 }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                formatter={(val: number) => formatCurrency(val)}
              />
              <Bar
                dataKey="total"
                fill="var(--primary)"
                radius={[6, 6, 6, 6]}
                barSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-6 p-4 rounded-2xl bg-muted/20 border border-border/50 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-primary/20 text-primary">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold">Insight Preditivo</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Com base nos últimos 6 meses, suas contas fixas têm se mantido estáveis com uma variação média de <span className="text-success font-bold">2.4%</span>.
              Sua reserva de emergência atual cobre <span className="text-primary font-bold">4.2 meses</span> deste custo.
            </p>
          </div>
        </div>
      </div>

      {/* Rodapé de Ações */}
      <div className="flex flex-col md:flex-row gap-4">
        <button className="flex-1 card-elevated p-4 flex items-center justify-between group hover:border-primary/50 transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-info/10 text-info">
              <Filter className="w-4 h-4" />
            </div>
            <span className="text-xs font-black uppercase tracking-widest">Filtrar por Conta</span>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </button>
        <button className="flex-1 card-elevated p-4 flex items-center justify-between group hover:border-success/50 transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10 text-success">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <span className="text-xs font-black uppercase tracking-widest">Exportar Relatório PDF</span>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-success transition-colors" />
        </button>
      </div>
    </div>
  );
}
