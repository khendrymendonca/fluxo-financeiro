import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, ReferenceLine, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Sun, CloudRain } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { PageHeader } from '@/components/ui/PageHeader';
import { useProjectionData, ProjectionMode } from '@/hooks/useProjectionData';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { formatCurrency } from '@/utils/formatters';
import { cn } from '@/lib/utils';

export default function ProjectionPage() {
  const { accounts } = useFinanceStore();
  const [mode, setMode] = useState<ProjectionMode>('fixed');
  const { items } = useProjectionData();
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});

  // Toggle individual de item
  const isEnabled = (id: string) => enabled[id] !== false; // default: ligado
  const toggleItem = (id: string) => setEnabled(prev => ({ ...prev, [id]: !isEnabled(id) }));

  // Saldo atual total das contas (exceto investimento/metas)
  const currentBalance = useMemo(
    () => accounts
      .filter(a => a.accountType !== 'investment' && a.accountType !== 'metas')
      .reduce((s, a) => s + Number(a.balance), 0),
    [accounts]
  );

  // Cálculo do fluxo mensal com base nos itens ativos
  const { monthlyIncome, monthlyExpense, monthlyNet } = useMemo(() => {
    const activeItems = items.filter(item => isEnabled(item.id));
    const value = (item: typeof items[0]) => mode === 'avg6' ? item.avgAmount : item.fixedAmount;
    const income  = activeItems.filter(i => i.type === 'income' ).reduce((s, i) => s + value(i), 0);
    const expense = activeItems.filter(i => i.type === 'expense').reduce((s, i) => s + value(i), 0);
    return { monthlyIncome: income, monthlyExpense: expense, monthlyNet: income - expense };
  }, [items, enabled, mode]);

  // Projeção mês a mês (máx 60 meses)
  const projection = useMemo(() => {
    const today = new Date();
    let balance = currentBalance;
    const result = [];
    let recoveryMonth = null;

    for (let i = 1; i <= 60; i++) {
      const prev = balance;
      balance += monthlyNet;
      const date = addMonths(today, i);
      const label = format(date, 'MMM/yy', { locale: ptBR });
      if (prev < 0 && balance >= 0 && !recoveryMonth) recoveryMonth = label;
      result.push({ label, balance, month: i });
      if (balance > 0 && i > 12 && recoveryMonth) break;
      if (i === 60) break;
    }
    return { data: result, recoveryMonth };
  }, [currentBalance, monthlyNet]);

  const incomeItems  = items.filter(i => i.type === 'income');
  const expenseItems = items.filter(i => i.type === 'expense');

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto pb-24 px-4 md:px-0">
      <PageHeader title="Projeção" icon={TrendingUp} />

      {/* Toggle de modo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border/40 rounded-[2rem] p-6 shadow-sm">
        <div className="space-y-1">
          <p className="text-sm font-black uppercase tracking-tight text-foreground">Configuração da Simulação</p>
          <p className="text-xs text-muted-foreground font-medium">Escolha como calcular os valores das transações recorrentes.</p>
        </div>
        <div className="flex items-center gap-3 bg-muted/20 p-2 rounded-2xl border border-border/20">
          <button 
            onClick={() => setMode('fixed')}
            className={cn(
              "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              mode === 'fixed' ? "bg-background shadow-md text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Valor Fixo
          </button>
          <button 
            onClick={() => setMode('avg6')}
            className={cn(
              "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              mode === 'avg6' ? "bg-background shadow-md text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Média (6 meses)
          </button>
        </div>
      </div>

      {/* Resumo do fluxo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-success/5 rounded-[2rem] p-6 text-center border border-success/20">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">Entradas/mês</p>
          <p className="text-2xl font-black text-success tracking-tighter">{formatCurrency(monthlyIncome)}</p>
        </div>
        <div className="bg-danger/5 rounded-[2rem] p-6 text-center border border-danger/20">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">Saídas/mês</p>
          <p className="text-2xl font-black text-danger tracking-tighter">{formatCurrency(monthlyExpense)}</p>
        </div>
        <div className={cn("rounded-[2rem] p-6 text-center border", monthlyNet >= 0 ? "bg-primary/5 border-primary/20" : "bg-warning/5 border-warning/20")}>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">Sobra Mensal</p>
          <p className={cn("text-2xl font-black tracking-tighter", monthlyNet >= 0 ? "text-primary" : "text-warning")}>{formatCurrency(monthlyNet)}</p>
        </div>
      </div>

      {/* Gráfico de projeção */}
      <div className="bg-card rounded-[2rem] p-8 border border-border/40 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-1">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Curva de Recuperação</p>
            <p className="text-[10px] text-muted-foreground/60 font-medium">Previsão de saldo acumulado ao longo do tempo</p>
          </div>
          {projection.recoveryMonth ? (
            <div className="bg-success/10 px-4 py-2 rounded-2xl border border-success/20 flex items-center gap-3">
              <Sun className="w-5 h-5 text-success animate-pulse" />
              <div>
                <p className="text-[9px] font-black text-success uppercase tracking-widest leading-none">Saldo Positivo em</p>
                <p className="text-sm font-black text-success">{projection.recoveryMonth}</p>
              </div>
            </div>
          ) : monthlyNet <= 0 ? (
            <div className="bg-danger/10 px-4 py-2 rounded-2xl border border-danger/20 flex items-center gap-3">
              <CloudRain className="w-5 h-5 text-danger" />
              <div>
                <p className="text-[9px] font-black text-danger uppercase tracking-widest leading-none">Atenção</p>
                <p className="text-sm font-black text-danger">Rever gastos fixos</p>
              </div>
            </div>
          ) : (
            <div className="bg-success/10 px-4 py-2 rounded-2xl border border-success/20">
              <p className="text-sm font-black text-success">✓ Saldo Estável</p>
            </div>
          )}
        </div>

        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={projection.data}>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.2} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fontWeight: 700, opacity: 0.4 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="6 3" strokeWidth={1.5} />
              <Tooltip
                formatter={(v: number) => [formatCurrency(v), 'Saldo projetado']}
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '16px', fontSize: '11px', fontWeight: 'bold', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Line type="monotone" dataKey="balance" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0, fill: 'hsl(var(--primary))' }} animationDuration={2000} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Listas de lançamentos fixos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Receitas fixas */}
        <div className="bg-card rounded-[2rem] border border-border/40 p-6 space-y-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-success" /> Receitas Recorrentes
          </p>
          <div className="space-y-2">
            {incomeItems.length === 0 && (
              <p className="text-xs text-muted-foreground italic py-8 text-center opacity-50 font-medium tracking-tight border-2 border-dashed border-border/20 rounded-2xl">
                Nenhuma receita recorrente cadastrada
              </p>
            )}
            {incomeItems.map(item => (
              <div key={item.id} className={cn(
                "flex items-center justify-between p-4 rounded-2xl border transition-all",
                isEnabled(item.id) ? "bg-muted/5 border-border/30" : "bg-muted/10 border-transparent opacity-50"
              )}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: item.categoryColor }} />
                  <div className="min-w-0">
                    <p className="text-xs font-black truncate">{item.description}</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">{item.categoryName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <p className={cn("text-xs font-black tabular-nums tracking-tighter", isEnabled(item.id) ? "text-success" : "text-muted-foreground")}>
                    {formatCurrency(mode === 'avg6' ? item.avgAmount : item.fixedAmount)}
                    {mode === 'avg6' && !item.hasAvg && <span className="text-[9px] ml-1 opacity-50">(fixo)</span>}
                  </p>
                  <Switch checked={isEnabled(item.id)} onCheckedChange={() => toggleItem(item.id)} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Saídas fixas */}
        <div className="bg-card rounded-[2rem] border border-border/40 p-6 space-y-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-danger" /> Saídas Fixas & Dívidas
          </p>
          <div className="space-y-2">
            {expenseItems.length === 0 && (
              <p className="text-xs text-muted-foreground italic py-8 text-center opacity-50 font-medium tracking-tight border-2 border-dashed border-border/20 rounded-2xl">
                Nenhuma despesa recorrente cadastrada
              </p>
            )}
            {expenseItems.map(item => (
              <div key={item.id} className={cn(
                "flex items-center justify-between p-4 rounded-2xl border transition-all",
                isEnabled(item.id) ? "bg-muted/5 border-border/30" : "bg-muted/10 border-transparent opacity-50"
              )}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: item.categoryColor }} />
                  <div className="min-w-0">
                    <p className="text-xs font-black truncate">{item.description}</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">{item.categoryName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <p className={cn("text-xs font-black tabular-nums tracking-tighter", isEnabled(item.id) ? "text-danger" : "text-muted-foreground")}>
                    {formatCurrency(mode === 'avg6' ? item.avgAmount : item.fixedAmount)}
                    {mode === 'avg6' && !item.hasAvg && <span className="text-[9px] ml-1 opacity-50">(fixo)</span>}
                  </p>
                  <Switch checked={isEnabled(item.id)} onCheckedChange={() => toggleItem(item.id)} />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
