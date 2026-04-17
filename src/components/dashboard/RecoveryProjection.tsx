import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import { useRecoveryProjection } from '@/hooks/useRecoveryProjection';
import { formatCurrency } from '@/utils/formatters';
import { cn } from '@/lib/utils';

export function RecoveryProjection() {
  const { 
    projection, 
    monthlyNet, 
    monthlyIncome, 
    monthlyFixed, 
    monthlyDebt, 
    recoveryMonth 
  } = useRecoveryProjection();

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-xl p-3 shadow-xl text-xs space-y-1">
        <p className="font-black uppercase tracking-widest text-muted-foreground mb-1">
          {payload[0].payload.month}
        </p>
        <p className={cn("font-bold", payload[0].value >= 0 ? "text-success" : "text-danger")}>
          Saldo: {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between px-1">
        <div className="space-y-1">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            Projeção de Recuperação
          </p>
          <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-tight">
            Estimativa baseada em fluxos fixos
          </p>
        </div>
        {recoveryMonth ? (
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black uppercase text-muted-foreground/50 tracking-widest mb-0.5">Saldo Positivo em:</span>
            <span className="text-xs font-black text-success bg-success/10 px-3 py-1.5 rounded-xl border border-success/20 flex items-center gap-2">
              ☀️ {recoveryMonth}
            </span>
          </div>
        ) : (
          <span className="text-xs font-black text-danger bg-danger/10 px-3 py-1.5 rounded-xl border border-danger/20">
            Rever Gastos
          </span>
        )}
      </div>

      {/* Resumo Mensal */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-muted/30 rounded-2xl p-3.5 border border-border/20">
          <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mb-1">Entrada Fixa</p>
          <p className="text-sm font-black text-success tracking-tight">{formatCurrency(monthlyIncome)}</p>
        </div>
        <div className="bg-muted/30 rounded-2xl p-3.5 border border-border/20">
          <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mb-1">Saída Fixa</p>
          <p className="text-sm font-black text-danger tracking-tight">{formatCurrency(monthlyFixed + monthlyDebt)}</p>
        </div>
        <div className={cn("rounded-2xl p-3.5 border", monthlyNet >= 0 ? "bg-primary/5 border-primary/20" : "bg-warning/5 border-warning/20")}>
          <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mb-1">Sobra/Mês</p>
          <p className={cn("text-sm font-black tracking-tight", monthlyNet >= 0 ? "text-primary" : "text-warning")}>
            {formatCurrency(monthlyNet)}
          </p>
        </div>
      </div>

      {/* Gráfico de Linha */}
      <div className="h-[180px] w-full pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={projection}>
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 9, fontWeight: 700, opacity: 0.4 }} 
              axisLine={false} 
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={20}
            />
            <YAxis hide domain={['auto', 'auto']} />
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" opacity={0.2} />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="balance"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 0, fill: 'hsl(var(--primary))' }}
              animationDuration={1500}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Mensagem Motivacional */}
      <div className="bg-muted/10 rounded-xl p-4 border border-border/10">
        <p className="text-[11px] text-muted-foreground text-center leading-relaxed font-medium">
          {recoveryMonth
            ? `Com disciplina nos gastos fixos, seu saldo volta ao positivo em ${recoveryMonth}. 💪`
            : 'Suas saídas fixas superam a renda. Revise dívidas ou reduza gastos recorrentes para ver a recuperação.'}
        </p>
      </div>
    </div>
  );
}
