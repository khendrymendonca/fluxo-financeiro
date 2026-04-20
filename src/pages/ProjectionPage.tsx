import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, ReferenceLine, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from 'recharts'
import { addMonths, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  TrendingUp, TrendingDown, Calendar, Target,
  AlertTriangle, CheckCircle2, Info
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { PageHeader } from '@/components/ui/PageHeader'
import { useProjectionData, ProjectionMode } from '@/hooks/useProjectionData'
import { useFinanceStore } from '@/hooks/useFinanceStore'
import { formatCurrency } from '@/utils/formatters'
import { cn } from '@/lib/utils'

// ─── Tooltip customizado com fundo opaco ──────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-2xl min-w-[160px]">
      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="text-xs font-bold" style={{ color: p.color }}>{p.name}</span>
          <span className="text-sm font-black tabular-nums" style={{ color: p.color }}>
            {formatCurrency(p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Label do eixo Y formatado em K / M ───────────────────────────────────────
function formatAxisY(value: number) {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}k`
  return `${value}`
}

export default function ProjectionPage() {
  const { accounts } = useFinanceStore()
  const [mode, setMode] = useState<ProjectionMode>('fixed')
  const items = useProjectionData()
  const [enabled, setEnabled] = useState<Record<string, boolean>>({})

  const isEnabled = (id: string) => enabled[id] !== false
  const toggleItem = (id: string) =>
    setEnabled(prev => ({ ...prev, [id]: !isEnabled(id) }))

  // Saldo atual — contas operacionais
  const currentBalance = useMemo(
    () =>
      accounts
        .filter(a => a.accountType !== 'investment' && a.accountType !== 'metas')
        .reduce((s, a) => s + Number(a.balance), 0),
    [accounts]
  )

  // Fluxo mensal líquido com base nos itens ativos
  const { monthlyIncome, monthlyExpense, monthlyNet } = useMemo(() => {
    const activeItems = items.filter(item => isEnabled(item.id))
    const getValue = (item: (typeof items)[0]) =>
      mode === 'avg6' ? item.avgAmount : item.fixedAmount
    const income = activeItems
      .filter(i => i.type === 'income')
      .reduce((s, i) => s + getValue(i), 0)
    const expense = activeItems
      .filter(i => i.type === 'expense')
      .reduce((s, i) => s + getValue(i), 0)
    return { monthlyIncome: income, monthlyExpense: expense, monthlyNet: income - expense }
  }, [items, enabled, mode])

  // Projeção mês a mês — até 60 meses ou saldo positivo consolidado
  const { data: projection, recoveryMonth, breakEvenIndex } = useMemo(() => {
    const today = new Date()
    let balance = currentBalance
    const result: { label: string; saldo: number; receita: number; despesa: number }[] = []
    let recoveryMonth: string | null = null
    let breakEvenIndex: number | null = null

    for (let i = 1; i <= 60; i++) {
      const prevBalance = balance
      balance += monthlyNet
      const date = addMonths(today, i)
      const label = format(date, 'MMM/yy', { locale: ptBR })

      result.push({
        label,
        saldo: Math.round(balance),
        receita: Math.round(monthlyIncome),
        despesa: Math.round(monthlyExpense),
      })

      // Primeiro mês que o saldo cruza de negativo para positivo
      if (prevBalance < 0 && balance >= 0 && !recoveryMonth) {
        recoveryMonth = label
        breakEvenIndex = i
      }

      // Para de projetar se ficou positivo há 12 meses (estabilizado) ou após 36 meses se já positivo
      if (balance > 0 && i >= 12 && recoveryMonth) break
      if (i >= 36 && balance > 0) break
    }

    return { data: result, recoveryMonth, breakEvenIndex }
  }, [currentBalance, monthlyNet, monthlyIncome, monthlyExpense])

  // Pior mês (menor saldo)
  const worstMonth = useMemo(() => {
    if (!projection.length) return null
    return projection.reduce((min, p) => (p.saldo < min.saldo ? p : min), projection[0])
  }, [projection])

  const incomeItems = items.filter(i => i.type === 'income')
  const expenseItems = items.filter(i => i.type === 'expense')

  // Cores dos eixos — usa var CSS do tema para garantir visibilidade
  const axisColor = 'hsl(var(--muted-foreground))'
  const gridColor = 'hsl(var(--border))'

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto pb-24 px-4 md:px-0">
      <PageHeader title="Projeção Financeira" icon={TrendingUp} />

      {/* ── KPIs ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Saldo Atual',
            value: formatCurrency(currentBalance),
            icon: Target,
            color: currentBalance >= 0 ? 'text-emerald-500' : 'text-rose-500',
            bg: currentBalance >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10',
          },
          {
            label: 'Entrada/Mês',
            value: formatCurrency(monthlyIncome),
            icon: TrendingUp,
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10',
          },
          {
            label: 'Saída/Mês',
            value: formatCurrency(monthlyExpense),
            icon: TrendingDown,
            color: 'text-rose-500',
            bg: 'bg-rose-500/10',
          },
          {
            label: 'Sobra/Mês',
            value: formatCurrency(monthlyNet),
            icon: monthlyNet >= 0 ? CheckCircle2 : AlertTriangle,
            color: monthlyNet >= 0 ? 'text-primary' : 'text-amber-500',
            bg: monthlyNet >= 0 ? 'bg-primary/10' : 'bg-amber-500/10',
          },
        ].map(kpi => (
          <div
            key={kpi.label}
            className="bg-card border border-border/40 rounded-[2rem] p-5 flex items-center gap-4 shadow-sm"
          >
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', kpi.bg)}>
              <kpi.icon className={cn('w-5 h-5', kpi.color)} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground truncate">
                {kpi.label}
              </p>
              <p className={cn('text-lg font-black tabular-nums truncate', kpi.color)}>
                {kpi.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Insights automáticos ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border/40 rounded-[2rem] p-6 flex items-start gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
              Recuperação do Saldo
            </p>
            <p className="font-black text-foreground mt-1 text-base">
              {recoveryMonth
                ? `☀️ ${recoveryMonth}`
                : currentBalance >= 0
                ? '✅ Já positivo'
                : '⚠️ Fora do horizonte'}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1 font-medium leading-tight">
              {recoveryMonth
                ? `Saldo cruza zero em ${breakEvenIndex} meses`
                : currentBalance >= 0
                ? 'Seu saldo operacional atual já é positivo'
                : 'As despesas fixas superam as entradas nos próximos 5 anos'}
            </p>
          </div>
        </div>

        <div className="bg-card border border-border/40 rounded-[2rem] p-6 flex items-start gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
              Pior Momento
            </p>
            <p className="font-black text-rose-500 mt-1 text-base">
              {worstMonth ? worstMonth.label : '—'}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1 font-medium leading-tight">
              {worstMonth ? `Saldo mínimo projetado de ${formatCurrency(worstMonth.saldo)}` : 'Sem dados de projeção'}
            </p>
          </div>
        </div>

        <div className="bg-card border border-border/40 rounded-[2rem] p-6 flex items-start gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
            <Info className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
              Modo de Cálculo
            </p>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => setMode('fixed')}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border',
                  mode === 'fixed'
                    ? 'bg-primary border-primary text-white shadow-md'
                    : 'bg-muted/50 border-border/40 text-muted-foreground hover:text-foreground'
                )}
              >
                Fixo
              </button>
              <button
                onClick={() => setMode('avg6')}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border',
                  mode === 'avg6'
                    ? 'bg-primary border-primary text-white shadow-md'
                    : 'bg-muted/50 border-border/40 text-muted-foreground hover:text-foreground'
                )}
              >
                Média 6M
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Gráfico principal ────────────────────────────────────────────── */}
      <div className="bg-card border border-border/40 rounded-[2rem] p-8 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">
              Evolução do Saldo Projetado
            </p>
            <p className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-tight">Cenário acumulado com base em fluxos recorrentes</p>
          </div>
        </div>
        <div style={{ height: 350 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={projection} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={gridColor}
                vertical={false}
                opacity={0.3}
              />
              <XAxis
                dataKey="label"
                tick={{ fill: axisColor, fontSize: 10, fontWeight: 700 }}
                axisLine={{ stroke: gridColor, opacity: 0.5 }}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={30}
              />
              <YAxis
                tick={{ fill: axisColor, fontSize: 10, fontWeight: 700 }}
                axisLine={{ stroke: gridColor, opacity: 0.5 }}
                tickLine={false}
                tickFormatter={formatAxisY}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: axisColor, strokeWidth: 1, opacity: 0.2 }} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', paddingBottom: 24 }}
                formatter={(value) =>
                  value === 'saldo'
                    ? 'Saldo Acumulado'
                    : value === 'receita'
                    ? 'Entrada Mensal'
                    : 'Saída Mensal'
                }
              />
              <ReferenceLine
                y={0}
                stroke="hsl(var(--danger))"
                strokeDasharray="6 3"
                strokeWidth={1.5}
                opacity={0.5}
              />
              {recoveryMonth && (
                <ReferenceLine
                  x={recoveryMonth}
                  stroke="hsl(var(--primary))"
                  strokeDasharray="6 3"
                  strokeWidth={1.5}
                  label={{
                    value: 'VIRADA',
                    fill: 'hsl(var(--primary))',
                    fontSize: 9,
                    fontWeight: 900,
                    position: 'insideTopLeft',
                    dy: -10
                  }}
                />
              )}
              <Line
                type="monotone"
                dataKey="saldo"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, fill: 'hsl(var(--primary))', strokeWidth: 0 }}
                name="saldo"
                animationDuration={2000}
              />
              <Line
                type="monotone"
                dataKey="receita"
                stroke="#10b981"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                activeDot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
                name="receita"
                opacity={0.4}
              />
              <Line
                type="monotone"
                dataKey="despesa"
                stroke="#f43f5e"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                activeDot={{ r: 4, fill: '#f43f5e', strokeWidth: 0 }}
                name="despesa"
                opacity={0.4}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Tabela de itens fixos ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Entradas */}
        <div className="bg-card border border-border/40 rounded-[2rem] p-8 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-500 mb-6 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Entradas Recorrentes Ativas
          </p>
          <div className="space-y-2">
            {incomeItems.length === 0 && (
              <p className="text-xs text-muted-foreground italic py-8 text-center opacity-50 font-medium tracking-tight border-2 border-dashed border-border/20 rounded-2xl">
                Nenhuma entrada fixa cadastrada.
              </p>
            )}
            {incomeItems.map(item => (
              <div
                key={item.id}
                className={cn(
                  'flex items-center justify-between p-4 rounded-2xl transition-all border',
                  isEnabled(item.id)
                    ? 'bg-emerald-500/5 border-emerald-500/20'
                    : 'opacity-40 bg-muted/30 border-transparent grayscale'
                )}
              >
                <div className="flex items-center gap-4">
                  <Switch
                    checked={isEnabled(item.id)}
                    onCheckedChange={() => toggleItem(item.id)}
                  />
                  <span className="text-xs font-black text-foreground uppercase tracking-tight truncate max-w-[150px]">{item.label}</span>
                </div>
                <span className="text-xs font-black text-emerald-500 tabular-nums tracking-tighter">
                  +{formatCurrency(mode === 'avg6' ? item.avgAmount : item.fixedAmount)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-6 border-t border-border/40 flex justify-between items-center px-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              Total de Entradas
            </span>
            <span className="text-lg font-black text-emerald-500 tabular-nums tracking-tighter">
              +{formatCurrency(monthlyIncome)}
            </span>
          </div>
        </div>

        {/* Saídas */}
        <div className="bg-card border border-border/40 rounded-[2rem] p-8 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-rose-500 mb-6 flex items-center gap-2">
            <TrendingDown className="w-4 h-4" /> Saídas & Dívidas Ativas
          </p>
          <div className="space-y-2">
            {expenseItems.length === 0 && (
              <p className="text-xs text-muted-foreground italic py-8 text-center opacity-50 font-medium tracking-tight border-2 border-dashed border-border/20 rounded-2xl">
                Nenhuma saída fixa cadastrada.
              </p>
            )}
            {expenseItems.map(item => (
              <div
                key={item.id}
                className={cn(
                  'flex items-center justify-between p-4 rounded-2xl transition-all border',
                  isEnabled(item.id)
                    ? 'bg-rose-500/5 border-rose-500/20'
                    : 'opacity-40 bg-muted/30 border-transparent grayscale'
                )}
              >
                <div className="flex items-center gap-4">
                  <Switch
                    checked={isEnabled(item.id)}
                    onCheckedChange={() => toggleItem(item.id)}
                  />
                  <span className="text-xs font-black text-foreground uppercase tracking-tight truncate max-w-[150px]">{item.label}</span>
                </div>
                <span className="text-xs font-black text-rose-500 tabular-nums tracking-tighter">
                  -{formatCurrency(mode === 'avg6' ? item.avgAmount : item.fixedAmount)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-6 border-t border-border/40 flex justify-between items-center px-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              Total de Saídas
            </span>
            <span className="text-lg font-black text-rose-500 tabular-nums tracking-tighter">
              -{formatCurrency(monthlyExpense)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
