import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface ExpenseChartProps {
  data: Record<string, number>;
}

const COLORS = [
  '#14B8A6', // teal
  '#8B5CF6', // purple
  '#F97316', // orange
  '#EC4899', // pink
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#6366F1', // indigo
  '#EF4444', // red
  '#64748B', // slate
];

export function ExpenseChart({ data }: ExpenseChartProps) {
  const initialChartData = Object.entries(data)
    .filter(([_, value]) => value > 0)
    .map(([categoryName, value]) => ({
      name: categoryName,
      value,
    }))
    .sort((a, b) => b.value - a.value);

  const top4 = initialChartData.slice(0, 4);
  const rest = initialChartData.slice(4);
  const othersValue = rest.reduce((sum, item) => sum + item.value, 0);

  const chartData = [...top4];
  if (othersValue > 0) {
    chartData.push({ name: 'Outros', value: othersValue });
  }

  const finalChartData = chartData.map((item, index) => ({
    ...item,
    color: COLORS[index % COLORS.length],
  }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (chartData.length === 0) {
    return (
      <div className="card-elevated p-4 flex items-center justify-center h-full min-h-[120px]">
        <p className="text-xs text-muted-foreground">Nenhuma despesa registrada</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card shadow-lg rounded-xl p-2 border border-border text-xs">
          <p className="font-medium">{payload[0].name}</p>
          <p className="text-primary font-bold">{formatCurrency(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  const totalValue = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="card-elevated p-4 sm:p-6 animate-fade-in h-full flex flex-col w-full">
      <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
        <div className="w-1.5 h-4 bg-primary rounded-full shadow-sm shadow-primary/20" />
        Distribuição
      </h3>

      <div className="flex flex-col sm:flex-row items-center gap-6 flex-1 min-h-0">
        {/* Mini Pie */}
        <div className="w-full sm:w-48 h-[35vh] sm:h-48 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={finalChartData}
                cx="50%"
                cy="50%"
                innerRadius="60%"
                outerRadius="90%"
                paddingAngle={4}
                dataKey="value"
                stroke="none"
                animationDuration={1200}
              >
                {finalChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} className="hover:opacity-80 transition-opacity" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex-1 w-full space-y-2 min-w-0">
          {finalChartData.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: item.color }} />
              <span className="truncate text-muted-foreground font-medium flex-1">{item.name}</span>
              <span className="font-black text-foreground tabular-nums">
                {((item.value / totalValue) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


