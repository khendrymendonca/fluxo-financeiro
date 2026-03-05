import { useFinanceStore } from '@/hooks/useFinanceStore';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle2, TrendingUp, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BudgetCoach() {
    const {
        totalIncome,
        currentMonthTransactions,
        categories,
        categoryGroups,
        budgetRule
    } = useFinanceStore();

    // Se não houver regra de orçamento, usa o padrão 50-30-20
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
        {
            name: 'Essenciais',
            key: 'needs',
            percent: rule.needsPercent,
            spent: calculateGroupSpending('needs'),
            color: 'bg-primary'
        },
        {
            name: 'Estilo de Vida',
            key: 'wants',
            percent: rule.wantsPercent,
            spent: calculateGroupSpending('wants'),
            color: 'bg-amber-500'
        },
        {
            name: 'Metas/Dívidas',
            key: 'savings',
            percent: rule.savingsPercent,
            spent: calculateGroupSpending('savings'),
            color: 'bg-success'
        },
    ];

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    return (
        <div className="card-elevated p-6 space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Coach de Orçamento (50/30/20)
                </h3>
                <p className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                    Renda Base: {formatCurrency(totalIncome)}
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {groups.map((group) => {
                    const limit = (totalIncome * group.percent) / 100;
                    const usagePercent = limit > 0 ? (group.spent / limit) * 100 : 0;
                    const isOverLimit = group.spent > limit;
                    const isNearLimit = usagePercent >= 80 && usagePercent <= 100;

                    return (
                        <div key={group.key} className="space-y-3">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-sm font-semibold">{group.name} ({group.percent}%)</p>
                                    <p className="text-xs text-muted-foreground">Limite: {formatCurrency(limit)}</p>
                                </div>
                                <div className="text-right">
                                    <p className={cn(
                                        "font-bold",
                                        isOverLimit ? "text-danger" : isNearLimit ? "text-amber-500" : "text-foreground"
                                    )}>
                                        {formatCurrency(group.spent)}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                        {usagePercent.toFixed(1)}% utilizado
                                    </p>
                                </div>
                            </div>

                            <div className="relative h-3 w-full bg-muted rounded-full overflow-hidden">
                                <div
                                    className={cn(
                                        "h-full transition-all duration-500",
                                        isOverLimit ? "bg-danger" : isNearLimit ? "bg-amber-500" : group.color
                                    )}
                                    style={{ width: `${Math.min(usagePercent, 100)}%` }}
                                />
                            </div>

                            {/* Insights contextuais */}
                            <div className="flex items-start gap-2 text-xs p-2 rounded-lg bg-muted/30">
                                {isOverLimit ? (
                                    <>
                                        <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                                        <p className="text-danger font-medium">Você ultrapassou o limite em {formatCurrency(group.spent - limit)}. Tente reduzir gastos de {group.name} na próxima semana.</p>
                                    </>
                                ) : isNearLimit ? (
                                    <>
                                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                        <p className="text-amber-700 font-medium">Atenção! Você já usou {usagePercent.toFixed(0)}% do orçamento de {group.name}.</p>
                                    </>
                                ) : usagePercent > 0 ? (
                                    <>
                                        <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                                        <p className="text-success-foreground font-medium">Bom trabalho! Você está dentro do planejado para {group.name}.</p>
                                    </>
                                ) : (
                                    <p className="text-muted-foreground italic">Nenhum gasto registrado neste grupo ainda.</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="pt-2 border-t border-border mt-2">
                <p className="text-[11px] text-center text-muted-foreground">
                    O Coach recomenda Priorizar o grupo <strong>Metas/Dívidas</strong> para sua saúde financeira a longo prazo.
                </p>
            </div>
        </div>
    );
}
