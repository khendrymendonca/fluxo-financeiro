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
    <div className="card-elevated p-4 animate-fade-in h-full flex flex-col">
      <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
        <div className="w-1.5 h-4 bg-primary rounded-full" />
        Distribuição
      </h3>

      <div className="flex items-center gap-3 flex-1 min-h-0">
        {/* Mini Pie */}
        <div className="w-24 h-24 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={finalChartData}
                cx="50%"
                cy="50%"
                innerRadius={28}
                outerRadius={42}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
                animationDuration={800}
              >
                {finalChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-1 min-w-0">
          {finalChartData.map((item, idx) => (
            <div key={idx} className="flex items-center gap-1.5 text-[10px]">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="truncate text-muted-foreground font-medium">{item.name}</span>
              <span className="ml-auto font-black text-foreground whitespace-nowrap">
                {((item.value / totalValue) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


