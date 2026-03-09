import { useState, useEffect, useMemo } from 'react';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import {
    Sparkles,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    CheckCircle2,
    Info,
    Lightbulb,
    ArrowRight,
    X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Insight {
    id: string;
    type: 'success' | 'warning' | 'info' | 'tip';
    title: string;
    description: string;
    icon: any;
    actionLabel?: string;
    onAction?: () => void;
}

interface SmartInsightsProps {
    onNavigate?: (view: string) => void;
}

export function SmartInsights({ onNavigate }: SmartInsightsProps) {
    const { transactions, categories, totalIncome, totalExpenses, budgetRule } = useFinanceStore();
    const [dismissedInsights, setDismissedInsights] = useState<string[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem('finance_dismissed_insights');
        if (saved) {
            setDismissedInsights(JSON.parse(saved));
        }
    }, []);

    const dismissInsight = (id: string) => {
        const updated = [...dismissedInsights, id];
        setDismissedInsights(updated);
        localStorage.setItem('finance_dismissed_insights', JSON.stringify(updated));
    };

    const insights = useMemo(() => {
        const list: Insight[] = [];
        const now = new Date();
        const currentMonth = startOfMonth(now);
        const lastMonth = startOfMonth(subMonths(now, 1));

        // 1. Check if total expenses > income (Warning)
        if (totalExpenses > totalIncome && totalIncome > 0) {
            list.push({
                id: 'over-budget',
                type: 'warning',
                title: 'Atenção aos Gastos!',
                description: `Este mês você já gastou ${((totalExpenses / totalIncome) * 100).toFixed(0)}% da sua renda total.`,
                icon: AlertTriangle
            });
        }

        // 2. Category Growth (Tip)
        // Find category with highest growth vs last month
        const categoryTotalsCurrent = transactions
            .filter(t => isWithinInterval(parseISO(t.date), { start: currentMonth, end: endOfMonth(now) }))
            .reduce((acc, t) => {
                if (t.categoryId) acc[t.categoryId] = (acc[t.categoryId] || 0) + t.amount;
                return acc;
            }, {} as Record<string, number>);

        const categoryTotalsLast = transactions
            .filter(t => isWithinInterval(parseISO(t.date), { start: lastMonth, end: endOfMonth(subMonths(now, 1)) }))
            .reduce((acc, t) => {
                if (t.categoryId) acc[t.categoryId] = (acc[t.categoryId] || 0) + t.amount;
                return acc;
            }, {} as Record<string, number>);

        Object.keys(categoryTotalsCurrent).forEach(catId => {
            const current = categoryTotalsCurrent[catId];
            const last = categoryTotalsLast[catId] || 0;
            const catName = categories.find(c => c.id === catId)?.name || 'Categoria';

            if (last > 0 && current > last * 1.3) { // 30% increase
                list.push({
                    id: `growth-${catId}`,
                    type: 'info',
                    title: `Aumento em ${catName}`,
                    description: `Seus gastos em ${catName} subiram ${(((current / last) - 1) * 100).toFixed(0)}% em relação ao mês passado.`,
                    icon: TrendingUp
                });
            }
        });

        // 3. Positive Balance (Success)
        if (totalIncome > totalExpenses && totalExpenses > 0) {
            const surplus = totalIncome - totalExpenses;
            list.push({
                id: 'positive-balance',
                type: 'success',
                title: 'Parabéns, você está no azul!',
                description: `Você tem uma sobra de R$ ${surplus.toFixed(2)} este mês. Que tal aportar parte disso em uma meta?`,
                icon: CheckCircle2,
                actionLabel: 'Ver Metas',
                onAction: () => onNavigate && onNavigate('goals')
            });
        }

        // 4. Budget Rule Alignment (Tip)
        if (budgetRule && totalExpenses > 0) {
            // Very simple check for wants vs needs
            // (This could be much more complex if we map all categories to groups here)
            list.push({
                id: 'rule-tip',
                type: 'tip',
                title: 'Dica do Coach: 50-30-20',
                description: 'Lembre-se de manter Desejos abaixo de 30% para acelerar sua independência financeira.',
                icon: Lightbulb
            });
        }

        // 5. Uncategorized (Warning)
        const uncategorizedCount = transactions.filter(t => !t.categoryId && t.type === 'expense').length;
        if (uncategorizedCount > 5) {
            list.push({
                id: 'uncategorized',
                type: 'warning',
                title: 'Transações sem Categoria',
                description: `Você tem ${uncategorizedCount} gastos sem categoria. Organize-os para ter relatórios melhores.`,
                icon: Info
            });
        }

        // Cap at 3 insights for UI simplicity
        return list.slice(0, 3);
    }, [transactions, categories, totalIncome, totalExpenses, budgetRule, onNavigate]);

    const visibleInsights = insights.filter(i => !dismissedInsights.includes(i.id));

    if (visibleInsights.length === 0) return null;

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Insights Inteligentes</h3>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {visibleInsights.map((insight) => (
                    <div
                        key={insight.id}
                        className={cn(
                            "card-elevated p-5 relative overflow-hidden group transition-all border-l-4",
                            insight.type === 'success' ? "border-success bg-success/5 hover:border-success/60" :
                                insight.type === 'warning' ? "border-danger bg-danger/5 hover:border-danger/60" :
                                    insight.type === 'info' ? "border-info bg-info/5 hover:border-info/60" :
                                        "border-primary bg-primary/5 hover:border-primary/60"
                        )}
                    >
                        {/* Dismiss button */}
                        <button
                            onClick={() => dismissInsight(insight.id)}
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-background/50 text-muted-foreground hover:text-foreground hover:bg-background transition-colors opacity-0 group-hover:opacity-100"
                            title="Ocultar este aviso"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                        <div className="flex items-start gap-4">
                            <div className={cn(
                                "p-2 rounded-xl",
                                insight.type === 'success' ? "bg-success/10 text-success" :
                                    insight.type === 'warning' ? "bg-danger/10 text-danger" :
                                        insight.type === 'info' ? "bg-info/10 text-info" :
                                            "bg-primary/10 text-primary"
                            )}>
                                <insight.icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 space-y-1">
                                <h4 className="font-bold text-sm">{insight.title}</h4>
                                <p className="text-xs text-muted-foreground leading-relaxed">{insight.description}</p>
                                {insight.actionLabel && (
                                    <button
                                        onClick={insight.onAction}
                                        className="text-[10px] font-black uppercase text-primary mt-2 flex w-max items-center gap-1 hover:gap-2 transition-all border-2 border-primary px-2 py-1 rounded-lg hover:bg-primary/10"
                                    >
                                        {insight.actionLabel} <ArrowRight className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
