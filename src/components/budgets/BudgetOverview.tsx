import { format, addMonths } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, CircleDashed, Settings2, Target } from 'lucide-react';
import { Category, Transaction } from '@/types/finance';
import { formatCurrency } from '@/utils/formatters';
import { parseLocalDate } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { IconRenderer } from '@/components/ui/IconSelector';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useBudgetGroups } from '@/hooks/useBudgetGroups';
import { useIsMobile } from '@/hooks/useIsMobile';
import {
  getBudgetTrackingUserKey,
  readTrackedBudgetData,
  writeTrackedBudgetData,
} from '@/utils/trackedBudgetCategories';

type BudgetStatus = 'within' | 'warning' | 'over' | 'unplanned';

const STATUS_LABEL: Record<BudgetStatus, string> = {
  within: 'Dentro',
  warning: 'Atenção',
  over: 'Estourado',
  unplanned: 'Sem teto definido',
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

function getBudgetStatus(planned: number, realized: number): BudgetStatus {
  if (planned <= 0) return 'unplanned';
  const usage = (realized / planned) * 100;
  if (usage > 100) return 'over';
  if (usage >= 80) return 'warning';
  return 'within';
}

interface BudgetOverviewProps {
  categories: Category[];
  transactions: Transaction[];
  viewDate: Date;
  period: 'month' | 'semester' | 'year';
  reportMode: 'projected' | 'realized';
  periodIncome: number;
}

export function BudgetOverview({ categories, transactions, viewDate, period, reportMode, periodIncome }: BudgetOverviewProps) {
  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'category' | 'group'>('category');
  const { budgetGroups, categoryAssignments } = useBudgetGroups();

  const expenseCategories = useMemo(
    () => categories.filter((category) => category.type === 'expense' && category.isActive !== false),
    [categories]
  );

  const userKey = useMemo(() => getBudgetTrackingUserKey(categories, transactions), [categories, transactions]);
  const [trackedCategoryIds, setTrackedCategoryIds] = useState<string[]>(() => {
    const data = readTrackedBudgetData(userKey);
    if (data?.initialized) return data.trackedCategoryIds;
    return categories
      .filter((category) => category.type === 'expense' && Number(category.budgetLimit || 0) > 0)
      .map((category) => category.id);
  });

  useEffect(() => {
    const data = readTrackedBudgetData(userKey);
    if (data?.initialized) {
      setTrackedCategoryIds(data.trackedCategoryIds);
    } else {
      const initialIds = expenseCategories
        .filter((category) => Number(category.budgetLimit || 0) > 0)
        .map((category) => category.id);
      setTrackedCategoryIds(initialIds);
      writeTrackedBudgetData(userKey, { initialized: true, trackedCategoryIds: initialIds });
    }
  }, [expenseCategories, userKey]);

  const toggleTrackedCategory = (categoryId: string, checked: boolean) => {
    setTrackedCategoryIds((current) => {
      const next = checked
        ? Array.from(new Set([...current, categoryId]))
        : current.filter((id) => id !== categoryId);
      writeTrackedBudgetData(userKey, { initialized: true, trackedCategoryIds: next });
      return next;
    });
  };

  const periodMonths = useMemo(() => {
    if (period === 'month') return [viewDate];
    if (period === 'semester') {
      const start = new Date(viewDate.getFullYear(), viewDate.getMonth() < 6 ? 0 : 6, 1);
      return Array.from({ length: 6 }).map((_, index) => addMonths(start, index));
    }

    const start = new Date(viewDate.getFullYear(), 0, 1);
    return Array.from({ length: 12 }).map((_, index) => addMonths(start, index));
  }, [period, viewDate]);

  const monthKeys = useMemo(() => new Set(periodMonths.map((month) => format(month, 'yyyy-MM'))), [periodMonths]);

  const expensesByCategory = useMemo(() => {
    const map = new Map<string, number>();

    transactions.forEach((transaction) => {
      if (transaction.type !== 'expense' || transaction.isTransfer || transaction.deleted_at || transaction.isInvoicePayment) return;
      if (reportMode === 'realized' && !transaction.isPaid) return;
      if (reportMode === 'projected' && transaction.cardId) return;

      const dateKey = format(parseLocalDate(transaction.date), 'yyyy-MM');
      if (!monthKeys.has(dateKey)) return;

      if (transaction.categoryId) {
        map.set(transaction.categoryId, (map.get(transaction.categoryId) || 0) + Number(transaction.amount));
      }
    });

    return map;
  }, [transactions, reportMode, monthKeys]);

  const categoryRows = useMemo(() => {
    const rows = expenseCategories.map((category) => {
      const multiplier = period === 'month' ? 1 : period === 'semester' ? 6 : 12;
      const planned = Number(category.budgetLimit || 0) * multiplier;
      const realized = expensesByCategory.get(category.id) || 0;

      return {
        id: category.id,
        name: category.name,
        color: category.color,
        icon: category.icon,
        planned,
        realized,
        difference: planned - realized,
        usagePercent: planned > 0 ? (realized / planned) * 100 : realized > 0 ? 100 : 0,
        status: getBudgetStatus(planned, realized),
        isTracked: trackedCategoryIds.includes(category.id),
      };
    }).filter((row) => row.isTracked);

    rows.sort((a, b) => {
      if (a.isTracked && !b.isTracked) return -1;
      if (!a.isTracked && b.isTracked) return 1;
      return b.realized - a.realized;
    });

    return rows;
  }, [expenseCategories, expensesByCategory, trackedCategoryIds, period]);

  const groupRows = useMemo(() => {
    const rows = budgetGroups.map((group) => {
      const categoriesInGroup = expenseCategories.filter((category) => categoryAssignments[category.id] === group.id);
      const realized = categoriesInGroup.reduce((sum, category) => sum + (expensesByCategory.get(category.id) || 0), 0);
      const planned = group.budgetPercent ? (periodIncome * group.budgetPercent) / 100 : 0;

      return {
        id: group.id,
        name: group.name,
        color: group.color,
        planned,
        realized,
        difference: planned - realized,
        usagePercent: planned > 0 ? (realized / planned) * 100 : realized > 0 ? 100 : 0,
        status: getBudgetStatus(planned, realized),
        cats: categoriesInGroup,
      };
    });

    return rows.sort((a, b) => b.realized - a.realized);
  }, [budgetGroups, expenseCategories, categoryAssignments, expensesByCategory, periodIncome]);

  const activeRows = viewMode === 'category' ? categoryRows : groupRows;
  const totalPlanned = activeRows.reduce((sum, row) => sum + row.planned, 0);
  const totalRealized = activeRows.reduce((sum, row) => sum + row.realized, 0);
  const remaining = totalPlanned - totalRealized;
  const usagePercent = totalPlanned > 0 ? (totalRealized / totalPlanned) * 100 : 0;

  return (
    <section className="bg-white dark:bg-zinc-900 rounded-[2rem] md:rounded-[2.5rem] p-4 md:p-8 border border-gray-100 dark:border-zinc-800 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          className="inline-flex items-center gap-3 self-start rounded-2xl text-left transition-colors hover:text-foreground"
          aria-expanded={isExpanded}
          aria-controls="budget-overview-content"
        >
          <h3 className="text-2xl font-black tracking-tight">Orçamentos</h3>
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 text-muted-foreground dark:border-zinc-800 dark:bg-zinc-800/60">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
        </button>

        {isExpanded && (
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <div className="flex w-full bg-gray-50 dark:bg-zinc-800/50 p-1 rounded-2xl border-2 border-gray-100 dark:border-zinc-800 sm:w-auto">
              <button
                onClick={() => setViewMode('category')}
                className={cn(
                  "flex-1 px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all sm:flex-none",
                  viewMode === 'category' ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Por Categoria
              </button>
              <button
                onClick={() => setViewMode('group')}
                className={cn(
                  "flex-1 px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all sm:flex-none",
                  viewMode === 'group' ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Por Agrupamento
              </button>
            </div>

            {viewMode === 'category' && (
              <Button
                variant="outline"
                size="icon"
                className="rounded-2xl h-10 w-full shrink-0 sm:w-10"
                onClick={() => setIsManagerOpen(true)}
                aria-label="Gerenciar categorias acompanhadas"
                title="Gerenciar categorias acompanhadas"
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {isExpanded ? (
        <div id="budget-overview-content" className="mt-6 md:mt-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
            <BudgetStat label={viewMode === 'category' ? 'Planejado' : 'Teto somado'} value={totalPlanned} />
            <BudgetStat label="Consumo" value={totalRealized} forceRed />
            <BudgetStat label={remaining >= 0 ? 'Disponível' : 'Excedente'} value={Math.abs(remaining)} forceRed={remaining < 0} />
            <BudgetStat label="Uso" value={`${usagePercent.toFixed(1)}%`} />
          </div>

          <div className="space-y-3" data-testid="budget-rows-container">
            {activeRows.map((row) => {
              const isOver = row.difference < 0;

              return (
                <div
                  key={row.id}
                  className="rounded-2xl border border-gray-100 dark:border-zinc-800 bg-gray-50/60 dark:bg-zinc-950/30 p-4"
                >
                  <div className={cn(
                    "grid gap-4",
                    isMobile ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-[1.5fr_repeat(4,minmax(110px,1fr))_160px] lg:items-center"
                  )}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/40 shadow-sm shrink-0 text-white"
                        style={{ backgroundColor: row.color || 'hsl(var(--primary))' }}
                      >
                        {viewMode === 'category' && 'icon' in row ? (
                          <IconRenderer iconName={row.icon || 'Tag'} className="h-5 w-5" />
                        ) : (
                          <Target className="h-5 w-5" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="font-black text-sm leading-tight break-words">{row.name}</p>
                        {viewMode === 'group' && 'cats' in row ? (
                          <p
                            className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground truncate"
                            title={row.cats.map((category: Category) => category.name).join(', ')}
                          >
                            {row.cats.length > 0 ? row.cats.map((category: Category) => category.name).join(', ') : 'Vazio'}
                          </p>
                        ) : (
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            {`${row.usagePercent.toFixed(1)}% utilizado`}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className={cn("grid gap-3", isMobile ? "grid-cols-2" : "contents")}>
                      <BudgetCell label="Teto" value={formatCurrency(row.planned)} />
                      <BudgetCell label="Consumo" value={formatCurrency(row.realized)} />
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

            {activeRows.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center">
                <Target className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm font-bold text-muted-foreground">
                  {viewMode === 'category' ? 'Nenhuma categoria acompanhada. Configure pelo ícone acima.' : 'Nenhum agrupamento criado ou com dados.'}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div id="budget-overview-content" className="mt-1" />
      )}

      <Dialog open={isManagerOpen} onOpenChange={setIsManagerOpen}>
        <DialogContent className="max-w-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle>Gerenciar categorias acompanhadas</DialogTitle>
            <DialogDescription>
              Escolha quais categorias entram na lista principal de Orçamentos. Categorias acompanhadas sem limite aparecem como sem orçamento definido.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-2">
            {expenseCategories.map((category) => {
              const isTracked = trackedCategoryIds.includes(category.id);
              return (
                <div key={category.id} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-muted/30 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                      style={{ backgroundColor: category.color || 'hsl(var(--primary))' }}
                    >
                      <IconRenderer iconName={category.icon || 'Tag'} className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black">{category.name}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        {Number(category.budgetLimit || 0) > 0 ? `Orçamento ${formatCurrency(Number(category.budgetLimit))}` : 'Sem orçamento definido'}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Acompanhar</span>
                    <Switch
                      checked={isTracked}
                      onCheckedChange={(checked) => toggleTrackedCategory(category.id, checked)}
                      aria-label={`Acompanhar ${category.name}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function BudgetStat({ label, value, forceRed }: { label: string; value: number | string; forceRed?: boolean }) {
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-zinc-800 bg-gray-50/60 dark:bg-zinc-950/30 p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={cn('mt-2 text-xl font-black tabular-nums whitespace-nowrap', forceRed ? 'text-rose-600 dark:text-rose-300' : 'text-foreground')}>
        {typeof value === 'number' ? formatCurrency(value) : value}
      </p>
    </div>
  );
}

function BudgetCell({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={cn('mt-1 text-sm font-black tabular-nums whitespace-nowrap', danger && 'text-rose-600 dark:text-rose-300')}>{value}</p>
    </div>
  );
}
