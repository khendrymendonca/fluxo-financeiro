import { useFinanceStore } from '@/hooks/useFinanceStore';
import { formatCurrency } from '@/utils/formatters';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine
} from 'recharts';
import { TrendingUp, Target, ChevronRight, AlertTriangle } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

import { parseLocalDate } from '@/utils/dateUtils';

export function ExpenseEvolution() {
    const { transactions, categories, viewDate } = useFinanceStore();


    // Prepare data for the last 6 months
    const data = Array.from({ length: 6 }).map((_, i) => {
        const monthDate = subMonths(startOfMonth(viewDate), 5 - i);
        const monthLabel = format(monthDate, 'MMM', { locale: ptBR });

        const monthExpenses = transactions
            .filter(t => {
                if (t.type !== 'expense') return false;
                // ? S� exclu�mos se for PAGAMENTO real (despesa), n�o estorno/abatimento (income)
                if (t.isInvoicePayment && t.type === 'expense') return false;
                const d = parseLocalDate(t.date);
                return d >= startOfMonth(monthDate) && d <= endOfMonth(monthDate);
            })
            .reduce((sum, t) => sum + Number(t.amount), 0);

        return {
            name: monthLabel,
            valor: monthExpenses,
            date: monthDate
        };
    });

    // Simple target (for demo, could be dynamic later)
    // M�dia de gastos (ignora o m�s atual incompleto para n�o enviesar)
    const completedMonths = data.slice(0, 5);
    const averageExpense = completedMonths.length > 0
        ? completedMonths.reduce((sum, d) => sum + d.valor, 0) / completedMonths.length
        : 0;
    const target = averageExpense * 0.9;

    const latestMonth = data[data.length - 1];
    const previousMonth = data[data.length - 2];
    const trend = latestMonth.valor > previousMonth.valor ? 'up' : 'down';
    const percentChange = previousMonth.valor > 0 ? ((latestMonth.valor - previousMonth.valor) / previousMonth.valor) * 100 : 0;

    return (
        <div className="flex flex-col gap-6 w-full">
            {/* Gr�fico Principal em Destaque */}
            <div className="card-elevated p-4 sm:p-6 space-y-4 h-full flex flex-col">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary shadow-sm">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-base sm:text-lg">Evolu��o de Despesas</h3>
                            <p className="text-xs sm:text-xs text-muted-foreground">Comparativo dos �ltimos 6 meses</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 min-h-[35dvh] sm:min-h-[300px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: '#888' }}
                                dy={10}
                            />
                            <YAxis
                                hide
                                domain={[0, 'auto']}
                            />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: '16px',
                                    border: 'none',
                                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)'
                                }}
                                formatter={(value: number) => [
                                    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value),
                                    'Gastos'
                                ]}
                            />
                            <Line
                                type="monotone"
                                dataKey="valor"
                                stroke="hsl(var(--primary))"
                                strokeWidth={4}
                                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4, stroke: '#fff' }}
                                activeDot={{ r: 6, strokeWidth: 0 }}
                                animationDuration={1500}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Insight Card logo abaixo */}
            <div className={cn(
                "card-elevated p-6 border-l-4",
                trend === 'up' ? "border-danger" : "border-success"
            )}>
                <div className="flex justify-between items-start mb-4">
                    <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Tend�ncia</h4>
                    <span className={cn(
                        "px-2 py-1 rounded-lg text-xs font-black uppercase",
                        trend === 'up' ? "bg-danger/10 text-danger" : "bg-success/10 text-success"
                    )}>
                        {trend === 'up' ? 'Aumento' : 'Redu��o'}
                    </span>
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black">
                        {Math.abs(percentChange).toFixed(1)}%
                    </span>
                    <span className="text-xs text-muted-foreground">em rela��o ao m�s anterior</span>
                </div>
                <p className="text-xs mt-4 text-muted-foreground leading-relaxed">
                    {trend === 'up'
                        ? "Seus gastos subiram. Tente revisar as categorias de 'Desejos' para economizar."
                        : "Parab�ns! Voc� est� gastando menos que no m�s passado. Continue assim!"}
                </p>
            </div>
        </div>
    );
}


