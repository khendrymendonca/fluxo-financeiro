import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

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
  const chartData = Object.entries(data)
    .filter(([_, value]) => value > 0)
    .map(([categoryName, value], index) => ({
      name: categoryName,
      value,
      color: COLORS[index % COLORS.length],
    }))
    .sort((a, b) => b.value - a.value);

  if (chartData.length === 0) {
    return (
      <div className="card-elevated p-6 h-80 flex items-center justify-center">
        <p className="text-muted-foreground">Nenhuma despesa registrada este mês</p>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card shadow-lg rounded-xl p-3 border border-border">
          <p className="font-medium">{payload[0].name}</p>
          <p className="text-primary font-semibold">{formatCurrency(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  const totalValue = chartData.reduce((sum, item) => sum + item.value, 0);
  const topCategory = chartData[0];
  const top3Value = chartData.slice(0, 3).reduce((sum, item) => sum + item.value, 0);
  const top3Percent = (top3Value / totalValue) * 100;

  return (
    <div className="card-elevated p-6 animate-fade-in flex flex-col h-full">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <div className="w-2 h-6 bg-primary rounded-full" />
        Distribuição de Gastos
      </h3>

      <div className="flex-1 min-h-[280px]">
        <ResponsiveContainer width="100%" height="85%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={100}
              paddingAngle={4}
              dataKey="value"
              stroke="none"
              animationBegin={0}
              animationDuration={1500}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Legend / Diagnostics */}
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {chartData.slice(0, 4).map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-[10px] font-bold uppercase text-muted-foreground whitespace-nowrap overflow-hidden">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="truncate">{item.name}</span>
                <span className="ml-auto text-foreground">{((item.value / totalValue) * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-dashed">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Diagnóstico Visual</h4>
            <div className="bg-muted/30 rounded-xl p-3 space-y-2">
              <p className="text-xs leading-relaxed">
                <span className="font-bold text-foreground">Concentração:</span>{' '}
                {top3Percent > 70
                  ? 'Seus gastos estão muito concentrados em poucas categorias. Tente diversificar ou revisar estes custos fixos.'
                  : 'Sua distribuição de gastos está equilibrada entre diversas categorias.'}
              </p>
              {topCategory && (
                <div className="flex items-center gap-2 text-[10px] bg-primary/10 text-primary p-2 rounded-lg font-black uppercase">
                  <span>Maior Gasto: {topCategory.name} ({((topCategory.value / totalValue) * 100).toFixed(0)}%)</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

