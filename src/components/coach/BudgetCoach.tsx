import { useFinanceStore } from '@/hooks/useFinanceStore';
import { TrendingUp, AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BudgetCoach() {
    const {
        totalIncome,
        currentMonthTransactions,
        categories,
        categoryGroups,
        budgetRule
    } = useFinanceStore();

    const rule = budgetRule || {
        needsPercent: 50,
        wantsPercent: 30,
        savingsPercent: 20,
    };

    const calculateGroupSpending = (groupName: string) => {
        const group = categoryGroups.find(g => g.name === groupName);
        if (!group) return 0;

        const groupCategoryIds = categories
            .filter(c => c.groupId === group.id)
            .map(c => c.id);

        return currentMonthTransactions
            .filter(t => t.type === 'expense' && (t.categoryId && groupCategoryIds.includes(t.categoryId)))
            .reduce((sum, t) => sum + t.amount, 0);
    };

    const groups = [
        { name: 'Essenciais', key: 'needs', percent: rule.needsPercent, spent: calculateGroupSpending('needs'), color: 'bg-primary' },
        { name: 'Estilo de Vida', key: 'wants', percent: rule.wantsPercent, spent: calculateGroupSpending('wants'), color: 'bg-amber-500' },
        { name: 'Metas/Dívidas', key: 'savings', percent: rule.savingsPercent, spent: calculateGroupSpending('savings'), color: 'bg-success' },
    ];

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    const formatCompact = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(val);
    };

    return (
        <div className="card-elevated p-4 animate-fade-in h-full flex flex-col">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-primary rounded-full" />
                    Coach 50/30/20
                </h3>
                <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-bold">
                    Base: {formatCompact(totalIncome)}
                </span>
            </div>

            <div className="space-y-3 flex-1">
                {groups.map((group) => {
                    const limit = (totalIncome * group.percent) / 100;
                    const usagePercent = limit > 0 ? (group.spent / limit) * 100 : 0;
                    const isOverLimit = group.spent > limit;
                    const isNearLimit = usagePercent >= 80 && usagePercent <= 100;

                    return (
                        <div key={group.key} className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-1.5">
                                    {isOverLimit ? (
                                        <AlertCircle className="w-3.5 h-3.5 text-danger" />
                                    ) : isNearLimit ? (
                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                    ) : usagePercent > 0 ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                                    ) : (
                                        <div className={cn("w-2 h-2 rounded-full", group.color)} />
                                    )}
                                    <span className="text-xs font-bold">{group.name}</span>
                                    <span className="text-[10px] text-muted-foreground">({group.percent}%)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={cn(
                                        "text-xs font-black",
                                        isOverLimit ? "text-danger" : isNearLimit ? "text-amber-500" : "text-foreground"
                                    )}>
                                        {formatCompact(group.spent)}
                                    </span>
                                    <span className="text-[9px] text-muted-foreground">
                                        / {formatCompact(limit)}
                                    </span>
                                </div>
                            </div>

                            <div className="relative h-2 w-full bg-muted rounded-full overflow-hidden">
                                <div
                                    className={cn(
                                        "h-full transition-all duration-500 rounded-full",
                                        isOverLimit ? "bg-danger" : isNearLimit ? "bg-amber-500" : group.color
                                    )}
                                    style={{ width: `${Math.min(usagePercent, 100)}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Compact tip */}
            <div className="pt-2 mt-2 border-t border-border/50">
                <p className="text-[10px] text-muted-foreground text-center">
                    Priorize <strong className="text-foreground">Metas/Dívidas</strong> para sua saúde financeira
                </p>
            </div>
        </div>
    );
}
