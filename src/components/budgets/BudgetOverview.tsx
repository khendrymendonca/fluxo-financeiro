import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, CheckCircle2, CircleDashed, PieChart, Target } from 'lucide-react';
import { Category, Transaction } from '@/types/finance';
import { buildMonthlyCategoryBudgets, BudgetStatus } from '@/utils/budgetPlanning';
import { formatCurrency } from '@/utils/formatters';
import { cn } from '@/lib/utils';

const STATUS_LABEL: Record<BudgetStatus, string> = {
  within: 'Dentro do orçamento',
  warning: 'Atenção',
  over: 'Estourado',
  unplanned: 'Sem orçamento definido',
};

const STATUS_STYLE: Record<BudgetStatus, string> = {
  within: 'text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20',
  warning: 'text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20',
  over: 'text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20',
  unplanned: 'text-muted-foreground bg-muted/40 border-border',
};

function StatusIcon({ status }: { status: BudgetStatus }) {
  if (status === 'over') return <AlertTriangle className="h-4 w-4" />;
  if (status === 'warning') return <AlertTriangle className="h-4 w-4" />;
  if (status === 'unplanned') return <CircleDashed className="h-4 w-4" />;
  return <CheckCircle2 className="h-4 w-4" />;
}

interface BudgetOverviewProps {
  categories: Category[];
  transactions: Transaction[];
  month: Date;
}

export function BudgetOverview({ categories, transactions, month }: BudgetOverviewProps) {
  const budget = buildMonthlyCategoryBudgets({ categories, transactions, month });
  const monthLabel = format(month, 'MMMM yyyy', { locale: ptBR });

  return (
    <section className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-zinc-800 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-8">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2">Planejamento</p>
          <h3 className="text-2xl font-black tracking-tight">Orçamentos por categoria</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
            Comparativo planejado x realizado em {monthLabel}. Compras no cartão entram na categoria da compra; pagamento de fatura fica fora deste orçamento para evitar duplicidade.
          </p>
        </div>
        <div className="rounded-2xl border border-primary/10 bg-primary/[0.06] px-4 py-3 text-primary">
          <div className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Competência da compra</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <BudgetStat label="Planejado" value={budget.totalPlanned} />
        <BudgetStat label="Realizado" value={budget.totalRealized} forceRed />
        <BudgetStat label={budget.remaining >= 0 ? 'Disponível' : 'Excedente'} value={Math.abs(budget.remaining)} forceRed={budget.remaining < 0} />
        <BudgetStat label="Uso" value={`${budget.usagePercent.toFixed(1)}%`} />
      </div>

      <div className="space-y-3">
        {budget.rows.map((row) => {
          const isOver = row.difference < 0;
          return (
            <div
              key={row.categoryId}
              className="rounded-2xl border border-gray-100 dark:border-zinc-800 bg-gray-50/60 dark:bg-zinc-950/30 p-4"
            >
              <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_repeat(4,minmax(110px,1fr))_160px] gap-4 lg:items-center">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="h-9 w-9 rounded-xl border border-white/40 shadow-sm shrink-0"
                    style={{ backgroundColor: row.categoryColor || 'hsl(var(--primary))' }}
                  />
                  <div className="min-w-0">
                    <p className="font-black text-sm truncate">{row.categoryName}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {row.planned > 0 ? `${row.usagePercent.toFixed(1)}% utilizado` : 'Defina um limite em Categorias'}
                    </p>
                  </div>
                </div>

                <BudgetCell label="Planejado" value={formatCurrency(row.planned)} />
                <BudgetCell label="Realizado" value={formatCurrency(row.realized)} />
                <BudgetCell
                  label={isOver ? 'Excedente' : 'Disponível'}
                  value={formatCurrency(Math.abs(row.difference))}
                  danger={isOver}
                />
                <BudgetCell label="Uso" value={`${row.usagePercent.toFixed(0)}%`} />

                <div className={cn('inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-black', STATUS_STYLE[row.status])}>
                  <StatusIcon status={row.status} />
                  <span>{STATUS_LABEL[row.status]}</span>
                </div>
              </div>

              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-zinc-200/80 dark:bg-zinc-800">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-700',
                    row.status === 'over' ? 'bg-rose-500' : row.status === 'warning' ? 'bg-amber-500' : row.status === 'unplanned' ? 'bg-zinc-400' : 'bg-emerald-500'
                  )}
                  style={{ width: `${Math.min(row.usagePercent, 100)}%` }}
                />
              </div>
            </div>
          );
        })}

        {budget.rows.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <Target className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm font-bold text-muted-foreground">Nenhum orçamento ou movimento de despesa para este mês.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function BudgetStat({ label, value, forceRed }: { label: string; value: number | string; forceRed?: boolean }) {
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-zinc-800 bg-gray-50/60 dark:bg-zinc-950/30 p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={cn('mt-2 text-xl font-black tabular-nums', forceRed ? 'text-rose-600 dark:text-rose-300' : 'text-foreground')}>
        {typeof value === 'number' ? formatCurrency(value) : value}
      </p>
    </div>
  );
}

function BudgetCell({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={cn('mt-1 text-sm font-black tabular-nums', danger && 'text-rose-600 dark:text-rose-300')}>{value}</p>
    </div>
  );
}
