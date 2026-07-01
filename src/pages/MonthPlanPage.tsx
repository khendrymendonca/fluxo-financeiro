import { useMemo, type ReactNode } from 'react';
import {
  AlertTriangle,
  Landmark,
  PiggyBank,
  Wallet,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { useIsMobile } from '@/hooks/useIsMobile';
import { MonthSelector } from '@/components/dashboard/MonthSelector';
import { formatCurrency } from '@/utils/formatters';
import { parseLocalDate } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';
import { buildMonthPlan, type MonthPlanCashItem } from '@/utils/monthPlan';
import { buildCardInvoiceObligations } from '@/utils/invoiceObligations';
import { LegacyDashboardHome } from './LegacyDashboardHome';
import { AppBootScreen } from '@/components/layout/AppBootScreen';

interface MonthPlanPageProps {
  isBalanceVisible: boolean;
  onRefreshData: () => void;
  onOpenTransactionForm: () => void;
  onOpenTransferForm: () => void;
  onNavigateToBills: () => void;
  onNavigateToTransactions: () => void;
}

function iconToneClasses(tone: 'safe' | 'attention' | 'risk' | 'default') {
  return {
    safe: 
      'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
    attention: 
      'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
    risk: 
      'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
    default: 
      'bg-slate-50 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400',
  }[tone];
}

function ControlMetricCard({
  label,
  value,
  support,
  tone,
  icon,
}: {
  label: string;
  value: string;
  support: string;
  tone: 'safe' | 'attention' | 'risk' | 'default';
  icon: ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-[1.8rem] p-5 bg-card border border-border/50 shadow-md backdrop-blur-sm'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
          <p className="text-2xl md:text-3xl font-black tracking-tight whitespace-nowrap tabular-nums text-foreground">{value}</p>
          <p className="text-xs font-semibold text-muted-foreground/80">{support}</p>
        </div>
        <div className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ring-black/5 dark:ring-white/5",
          iconToneClasses(tone)
        )}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function DueItemRow({
  item,
  isBalanceVisible,
}: {
  item: MonthPlanCashItem;
  isBalanceVisible: boolean;
}) {
  const statusLabel = item.status === 'overdue' ? 'Vencida' : item.status === 'today' ? 'Hoje' : 'Em breve';

  return (
    <div className="flex items-center justify-between gap-4 rounded-[1.35rem] border border-border/50 bg-background/60 p-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'h-2.5 w-2.5 shrink-0 rounded-full',
              item.status === 'overdue' ? 'bg-rose-500' : item.status === 'today' ? 'bg-amber-500' : 'bg-emerald-500'
            )}
          />
          <p className="truncate text-sm font-black">{item.description}</p>
        </div>
        <p className="mt-1 text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">
          {statusLabel} - {format(parseLocalDate(item.date), "dd 'de' MMM", { locale: ptBR })}
        </p>
      </div>
      <p className="shrink-0 text-sm font-black">{isBalanceVisible ? formatCurrency(item.amount) : '......'}</p>
    </div>
  );
}

export default function MonthPlanPage({
  isBalanceVisible,
  onRefreshData,
  onOpenTransactionForm,
  onOpenTransferForm,
  onNavigateToBills,
  onNavigateToTransactions,
}: MonthPlanPageProps) {
  const isMobile = useIsMobile();
  const { accounts, categories, creditCards, transactions, debts, viewDate, viewMode, loading } = useFinanceStore();

  const transactionsWithInvoiceObligations = useMemo(
    () => [
      ...transactions,
      ...buildCardInvoiceObligations({
        creditCards,
        transactions,
        viewDate,
      }),
    ],
    [creditCards, transactions, viewDate]
  );

  const monthPlan = useMemo(
    () =>
      buildMonthPlan({
        accounts,
        transactions: transactionsWithInvoiceObligations,
        categories,
        debts,
        viewDate,
        periodMode: viewMode === 'year' ? 'year' : 'month',
      }),
    [accounts, categories, debts, transactionsWithInvoiceObligations, viewDate, viewMode]
  );

  const periodTitle = useMemo(() => {
    if (viewMode === 'year') {
      return String(viewDate.getFullYear());
    }

    return format(viewDate, "MMMM 'de' yyyy", { locale: ptBR }).replace(/^./, (char) => char.toUpperCase());
  }, [viewDate, viewMode]);
  const dueItems = monthPlan.upcomingOpenExpenses.slice(0, 6);
  const cashBalanceTone = monthPlan.cashBalance < 0 ? 'risk' : monthPlan.openExpensesTotal > 0 ? 'attention' : 'safe';

  // Se estiver carregando e não tivermos contas (indicando que é o primeiro load), mostramos boot screen
  if (loading && accounts.length === 0) {
    return <AppBootScreen message="Carregando dados financeiros..." detail="Quase pronto para você assumir o controle" />;
  }

  const controlCards = [
    {
      label: 'Total em contas',
      value: isBalanceVisible ? formatCurrency(monthPlan.totalAccountBalance) : '......',
      support: 'Soma das contas e carteiras.',
      tone: 'safe' as const,
      icon: <Landmark className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />,
    },
    {
      label: 'Despesas em aberto',
      value: isBalanceVisible ? formatCurrency(monthPlan.openExpensesTotal) : '......',
      support: 'Pendentes até o fim do mês.',
      tone: monthPlan.openExpensesTotal > 0 ? 'attention' as const : 'default' as const,
      icon: <Wallet className="h-5 w-5 text-amber-700 dark:text-amber-300" />,
    },
    {
      label: 'Saldo',
      value: isBalanceVisible ? formatCurrency(monthPlan.cashBalance) : '......',
      support: 'Depois das despesas em aberto.',
      tone: cashBalanceTone as 'safe' | 'attention' | 'risk',
      icon: <PiggyBank className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />,
    },
    {
      label: 'Vencidas',
      value: isBalanceVisible ? formatCurrency(monthPlan.overdueOpenExpensesTotal) : '......',
      support: `${monthPlan.overdueOpenExpensesCount} pendente(s) vencida(s).`,
      tone: monthPlan.overdueOpenExpensesTotal > 0 ? 'risk' as const : 'default' as const,
      icon: <AlertTriangle className="h-5 w-5 text-rose-700 dark:text-rose-300" />,
    },
  ];

  if (isMobile) {
    return (
      <LegacyDashboardHome
        isBalanceVisible={isBalanceVisible}
        onRefreshData={onRefreshData}
        onOpenTransactionForm={onOpenTransactionForm}
        onOpenTransferForm={onOpenTransferForm}
        onNavigateToBills={onNavigateToBills}
        onNavigateToTransactions={onNavigateToTransactions}
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 pb-24 md:space-y-7 md:p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-muted-foreground">Controle financeiro</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight md:text-4xl">Painel de {periodTitle}</h1>
        </div>

        <div className="flex items-center gap-3">
          <MonthSelector modes={['month', 'year']} />
          {!isMobile ? (
            <Button variant="outline" className="rounded-xl" onClick={onRefreshData}>
              Atualizar
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {controlCards.map((card) => (
          <ControlMetricCard key={card.label} {...card} />
        ))}
      </div>

      <section className="rounded-[2rem] border border-border/50 bg-card p-5 shadow-sm dark:shadow-none md:p-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-muted-foreground">A pagar</p>
            <h2 className="text-xl font-black tracking-tight md:text-2xl">Vencimentos próximos</h2>
          </div>
          <Button variant="ghost" className="rounded-xl font-bold text-primary" onClick={onNavigateToBills}>
            Ver contas
          </Button>
        </div>

        <div className="mt-5 space-y-3">
          {dueItems.length > 0 ? (
            dueItems.map((item) => (
              <DueItemRow key={item.id} item={item} isBalanceVisible={isBalanceVisible} />
            ))
          ) : (
            <div className="rounded-[1.6rem] border border-dashed border-border/60 bg-background/40 p-5">
              <p className="text-sm text-muted-foreground">Nenhuma despesa aberta encontrada para este período.</p>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[2rem] border border-border/50 bg-card p-4 shadow-sm dark:shadow-none md:p-5">
        <div className="flex flex-wrap gap-3">
          <Button className="rounded-xl font-bold" onClick={onOpenTransactionForm}>
            Novo lançamento
          </Button>
          <Button variant="outline" className="rounded-xl font-bold" onClick={onOpenTransferForm}>
            Transferir
          </Button>
          <Button variant="outline" className="rounded-xl font-bold" onClick={onNavigateToTransactions}>
            Ver lançamentos
          </Button>
          {isMobile ? (
            <Button variant="ghost" className="rounded-xl font-bold" onClick={onRefreshData}>
              Atualizar
            </Button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
