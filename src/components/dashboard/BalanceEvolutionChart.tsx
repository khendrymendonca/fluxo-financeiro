import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';

interface BalanceEvolutionChartProps {
  transactions: Array<{
    date: string;
    amount: number;
    type: 'income' | 'expense';
  }>;
}

export function BalanceEvolutionChart({ transactions }: BalanceEvolutionChartProps) {
  // Group transactions by date and calculate cumulative balance
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
      <div className="card-elevated p-6 h-80 flex items-center justify-center">
        <p className="text-muted-foreground">Nenhum dado disponível</p>
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
        <div className="bg-card shadow-lg rounded-xl p-3 border border-border">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-primary font-semibold">
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

  return (
    <div className="card-elevated p-6 animate-fade-in">
      <h3 className="text-lg font-semibold mb-4">Evolução do Saldo</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(174, 60%, 45%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(174, 60%, 45%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 90%)" />
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'hsl(220, 10%, 45%)' }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'hsl(220, 10%, 45%)' }}
              tickFormatter={formatCurrency}
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
