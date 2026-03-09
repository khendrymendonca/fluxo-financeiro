import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';

interface BalanceEvolutionChartProps {
  transactions: Array<{
    date: string;
    amount: number;
    type: 'income' | 'expense';
  }>;
}

export function BalanceEvolutionChart({ transactions }: BalanceEvolutionChartProps) {
  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const dailyBalances: Record<string, number> = {};
  let runningBalance = 0;

  sortedTransactions.forEach((t) => {
    const date = new Date(t.date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short'
    });
    runningBalance += t.type === 'income' ? t.amount : -t.amount;
    dailyBalances[date] = runningBalance;
  });

  const chartData = Object.entries(dailyBalances).map(([date, balance]) => ({
    date,
    balance,
  }));

  if (chartData.length === 0) {
    return (
      <div className="card-elevated p-4 flex items-center justify-center h-full min-h-[100px]">
        <p className="text-xs text-muted-foreground">Nenhum dado de evolução disponível</p>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card shadow-lg rounded-xl p-2 border border-border text-xs">
          <p className="text-muted-foreground">{label}</p>
          <p className="text-primary font-bold">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  const lastBalance = chartData[chartData.length - 1]?.balance || 0;

  return (
    <div className="card-elevated p-4 animate-fade-in h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <div className="w-1.5 h-4 bg-primary rounded-full" />
          Evolução do Saldo
        </h3>
        <span className="text-sm font-black text-primary">{formatCurrency(lastBalance)}</span>
      </div>
      <div className="flex-1 min-h-[140px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(174, 60%, 45%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(174, 60%, 45%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 90%)" vertical={false} />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'hsl(220, 10%, 55%)' }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'hsl(220, 10%, 55%)' }}
              tickFormatter={formatCurrency}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="balance"
              stroke="hsl(174, 60%, 45%)"
              strokeWidth={2}
              fill="url(#balanceGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
