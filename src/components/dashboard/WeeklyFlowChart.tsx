import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { parseLocalDate } from '@/utils/dateUtils';
import { Transaction } from '@/types/finance';
import { formatCurrency } from '@/utils/formatters';

interface WeeklyFlowChartProps {
  transactions: Transaction[];
  viewDate: Date;
}

export function WeeklyFlowChart({ transactions }: WeeklyFlowChartProps) {
  const data = useMemo(() => {
    const weeks = [
      { label: 'Sem 1', start: 1,  end: 7  },
      { label: 'Sem 2', start: 8,  end: 14 },
      { label: 'Sem 3', start: 15, end: 21 },
      { label: 'Sem 4', start: 22, end: 31 },
    ];

    return weeks.map(({ label, start, end }) => {
      const txs = transactions.filter(t => {
        if (t.isTransfer || t.isInvoicePayment) return false;
        const day = parseLocalDate(t.date).getDate();
        return day >= start && day <= end;
      });

      const receitas = txs
        .filter(t => t.type === 'income' && t.isPaid)
        .reduce((s, t) => s + Number(t.amount), 0);

      const despesas = txs
        .filter(t => t.type === 'expense' && t.isPaid)
        .reduce((s, t) => s + Number(t.amount), 0);

      return { label, receitas, despesas };
    });
  }, [transactions]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-xl p-3 shadow-xl text-xs space-y-1">
        <p className="font-black uppercase tracking-widest text-muted-foreground mb-2">{label}</p>
        <p className="text-success font-bold">↑ {formatCurrency(payload[0]?.value ?? 0)}</p>
        <p className="text-danger font-bold">↓ {formatCurrency(payload[1]?.value ?? 0)}</p>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Fluxo do Mês — Semanas
        </p>
        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-success" /> Receitas</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-danger" /> Despesas</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} barGap={4} barCategoryGap="30%">
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fontWeight: 700, fill: 'currentColor', opacity: 0.5 }}
            axisLine={false}
            tickLine={false}
            dy={10}
          />
          <YAxis hide />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.1 }} />
          <Bar dataKey="receitas" radius={[6, 6, 0, 0]} fill="hsl(var(--success))" opacity={0.85} />
          <Bar dataKey="despesas" radius={[6, 6, 0, 0]} fill="hsl(var(--danger))"  opacity={0.85} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
