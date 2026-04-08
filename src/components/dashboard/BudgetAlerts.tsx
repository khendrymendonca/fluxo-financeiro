import { useCategories } from '@/hooks/useFinanceQueries';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { formatCurrency } from '@/utils/formatters';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BudgetAlerts() {
  const { data: categories = [] } = useCategories();
  const { viewDate, transactions } = useFinanceStore();
  const { categoryExpenses } = useDashboardMetrics(viewDate, transactions);

  const alerts = categories
    .filter(cat => cat.type === 'expense' && cat.budgetLimit && cat.budgetLimit > 0)
    .map(cat => {
      const spent = categoryExpenses.find(e => e.name === cat.name)?.value ?? 0;
      const pct = (spent / cat.budgetLimit!) * 100;
      return { cat, spent, pct };
    })
    .filter(a => a.pct >= 70) // só mostra se >= 70% do limite
    .sort((a, b) => b.pct - a.pct);

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {alerts.map(({ cat, spent, pct }) => {
        const isOver = pct >= 100;
        const isWarning = pct >= 90;
        return (
          <div
            key={cat.id}
            className={cn(
              'flex items-center justify-between px-4 py-3 rounded-2xl border text-sm font-bold',
              isOver
                ? 'bg-danger/5 border-danger/20 text-danger'
                : isWarning
                ? 'bg-warning/5 border-warning/20 text-warning'
                : 'bg-primary/5 border-primary/20 text-primary'
            )}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                {isOver ? 'Limite excedido' : 'Atenção'}: <strong>{cat.name}</strong>
                {' — '}{formatCurrency(spent)} de {formatCurrency(cat.budgetLimit!)}
              </span>
            </div>
            <span className="text-xs font-black tabular-nums">
              {pct.toFixed(0)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}