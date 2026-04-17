import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface ExpenseChartProps {
  data: Record<string, number>;
  categoryColors?: Record<string, string>; // 🎨 Suporte opcional a cores reais
}

const DEFAULT_COLORS = [
  '#0d9488', // emerald-600
  '#7c3aed', // violet-600
  '#ea580c', // orange-600
  '#db2777', // pink-600
  '#2563eb', // blue-600
];

export function ExpenseChart({ data, categoryColors = {} }: ExpenseChartProps) {
  const initialChartData = Object.entries(data)
    .filter(([_, value]) => value > 0)
    .map(([categoryName, value]) => ({
      name: categoryName,
      value,
      color: categoryColors[categoryName] || DEFAULT_COLORS[0] // Tenta usar a cor real da categoria
    }))
    .sort((a, b) => b.value - a.value);

  let finalChartData: any[] = [];
  
  if (initialChartData.length > 3) {
    const top3 = initialChartData.slice(0, 3);
    const othersValue = initialChartData.slice(3).reduce((sum, item) => sum + item.value, 0);
    finalChartData = [
      ...top3.map((item, index) => ({
        ...item,
        color: item.color !== DEFAULT_COLORS[0] ? item.color : DEFAULT_COLORS[index % DEFAULT_COLORS.length]
      })),
      { name: 'Outros', value: othersValue, color: '#a1a1aa' } // zinc-400
    ];
  } else {
    finalChartData = initialChartData.map((item, index) => ({
      ...item,
      color: item.color !== DEFAULT_COLORS[0] ? item.color : DEFAULT_COLORS[index % DEFAULT_COLORS.length]
    }));
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (finalChartData.length === 0) {
    return null;
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card shadow-lg rounded-xl p-2 border border-border/40 text-xs">
          <p className="font-medium">{payload[0].name}</p>
          <p className="text-primary font-bold">{formatCurrency(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  const totalValue = finalChartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="bg-card rounded-[2rem] p-4 border border-border/40 animate-fade-in h-full flex flex-col w-full shadow-sm dark:shadow-none">
      
      {/* Título */}
      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
        <div className="w-1.5 h-4 bg-primary rounded-full" />
        Distribuição
      </h3>

      {/* Donut + Legenda lado a lado */}
      <div className="flex flex-row items-center gap-4 flex-1 min-h-0">

        {/* Donut — tamanho fixo, não cresce */}
        <div className="w-[140px] h-[140px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={finalChartData}
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={62}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
                animationDuration={1000}
              >
                {finalChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} className="hover:opacity-80 transition-opacity cursor-pointer" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legenda — ocupa o espaço restante, sem transbordar */}
        <div className="flex flex-col justify-center gap-2.5 flex-1 min-w-0">
          {finalChartData.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs min-w-0">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate text-muted-foreground font-semibold flex-1">
                {item.name}
              </span>
              <span className="font-black text-foreground tabular-nums shrink-0 opacity-80">
                {((item.value / totalValue) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
