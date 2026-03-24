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
                if (t.isInvoicePayment) return false; // â† exclui pagamentos de fatura para não dobrar
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
    // Média de gastos (ignora o mês atual incompleto para não enviesar)
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 card-elevated p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold">Evolução de Despesas</h3>
                            <p className="text-xs text-muted-foreground">Comparativo dos Ãºltimos 6 meses</p>
                        </div>
                    </div>
                </div>

                <div className="h-[280px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
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
                            <ReferenceLine
                                y={target}
                                stroke="#f59e0b"
                                strokeDasharray="5 5"
                                label={{
                                    position: 'right',
                                    value: 'Meta',
                                    fill: '#f59e0b',
                                    fontSize: 10,
                                    fontWeight: 'bold'
                                }}
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

            <div className="space-y-6">
                {/* Insight Card */}
                <div className={cn(
                    "card-elevated p-6 border-l-4",
                    trend === 'up' ? "border-danger" : "border-success"
                )}>
                    <div className="flex justify-between items-start mb-4">
                        <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Tendência</h4>
                        <span className={cn(
                            "px-2 py-1 rounded-lg text-[10px] font-black uppercase",
                            trend === 'up' ? "bg-danger/10 text-danger" : "bg-success/10 text-success"
                        )}>
                            {trend === 'up' ? 'Aumento' : 'Redução'}
                        </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black">
                            {Math.abs(percentChange).toFixed(1)}%
                        </span>
                        <span className="text-xs text-muted-foreground">em relação ao mês anterior</span>
                    </div>
                    <p className="text-xs mt-4 text-muted-foreground leading-relaxed">
                        {trend === 'up'
                            ? "Seus gastos subiram. Tente revisar as categorias de 'Desejos' para economizar."
                            : "Parabéns! Você está gastando menos que no mês passado. Continue assim!"}
                    </p>
                </div>

                {/* Goals Card */}
                <div className="card-elevated p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-amber-100 text-amber-600">
                            <Target className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold">Minhas Metas</h4>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="font-medium">Meta Global de Gastos</span>
                                <span className="font-bold">{target > 0 ? Math.round((latestMonth.valor / target) * 100) : 0}%</span>
                            </div>
                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                <div
                                    className={cn(
                                        "h-full rounded-full transition-all duration-500",
                                        latestMonth.valor > target ? "bg-danger" : "bg-amber-500"
                                    )}
                                    style={{ width: `${target > 0 ? Math.min((latestMonth.valor / target) * 100, 100) : 0}%` }}
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <Button variant="outline" className="w-full text-xs gap-2 rounded-xl h-9 border-dashed">
                                Gerenciar Metas <ChevronRight className="w-3 h-3" />
                            </Button>
                        </div>
                    </div>

                    {target > 0 && latestMonth.valor > target && (
                        <div className="flex items-start gap-2 p-3 rounded-xl bg-danger/5 border border-danger/10 text-danger mt-2">
                            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                            <p className="text-[10px] font-medium leading-tight">
                                Você ultrapassou sua meta global de gastos este mês em {formatCurrency(latestMonth.valor - target)}.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}


