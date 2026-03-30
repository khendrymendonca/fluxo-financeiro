import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface ExpenseChartProps {
  data: Record<string, number>;
}

const COLORS = [
  '#0d9488', // teal-600
  '#7c3aed', // violet-600
  '#ea580c', // orange-600
  '#db2777', // pink-600
  '#2563eb', // blue-600
  '#059669', // emerald-600
  '#d97706', // amber-600
  '#4f46e5', // indigo-600
  '#dc2626', // red-600
  '#475569', // slate-600
];

export function ExpenseChart({ data }: ExpenseChartProps) {
  // ... (rest of logic)
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
    return null;
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
    <div className="bg-card rounded-[2rem] p-4 md:p-5 border border-border/50 animate-fade-in h-full flex flex-col w-full transition-all hover:shadow-md hover:border-border">
      <h3 className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
        <div className="w-1.5 h-4 bg-primary rounded-full shadow-sm shadow-primary/20" />
        Distribuição
      </h3>

      <div className="flex flex-col lg:flex-row items-center gap-6 flex-1 min-h-0">
        {/* Mini Pie */}
        <div className="w-full lg:w-48 h-48 md:h-[240px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={finalChartData}
                cx="50%"
                cy="50%"
                innerRadius="65%"
                outerRadius="90%"
                paddingAngle={4}
                dataKey="value"
                stroke="none"
                animationDuration={1200}
              >
                {finalChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} className="hover:opacity-80 transition-opacity cursor-pointer" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex-1 w-full space-y-1.5 min-w-0">
          {finalChartData.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 text-[10px] md:text-xs">
              <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: item.color }} />
              <span className="truncate text-muted-foreground font-semibold flex-1 tracking-tight">{item.name}</span>
              <span className="font-black text-foreground tabular-nums opacity-90">
                {((item.value / totalValue) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


