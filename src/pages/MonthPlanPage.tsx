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

interface MonthPlanPageProps {
  isBalanceVisible: boolean;
  onRefreshData: () => void;
  onOpenTransactionForm: () => void;
  onOpenTransferForm: () => void;
  onNavigateToBills: () => void;
  onNavigateToTransactions: () => void;
}

function cardToneClasses(tone: 'safe' | 'attention' | 'risk' | 'default') {
  return {
    safe: 'bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.18),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.105),rgba(15,23,42,0.045))] ring-emerald-950/10 dark:bg-[radial-gradient(circle_at_top_right,rgba(52,211,153,0.14),transparent_36%),linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] dark:ring-emerald-300/10',
    attention: 'bg-[radial-gradient(circle_at_top_right,rgba(217,119,6,0.17),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.10),rgba(15,23,42,0.04))] ring-amber-950/10 dark:bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.13),transparent_36%),linear-gradient(135deg,rgba(255,255,255,0.065),rgba(255,255,255,0.025))] dark:ring-amber-300/10',
    risk: 'bg-[radial-gradient(circle_at_top_right,rgba(190,18,60,0.18),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.10),rgba(15,23,42,0.04))] ring-rose-950/10 dark:bg-[radial-gradient(circle_at_top_right,rgba(251,113,133,0.14),transparent_36%),linear-gradient(135deg,rgba(255,255,255,0.065),rgba(255,255,255,0.025))] dark:ring-rose-300/10',
    default: 'bg-[radial-gradient(circle_at_top_right,rgba(100,116,139,0.16),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.095),rgba(15,23,42,0.038))] ring-slate-950/10 dark:bg-[radial-gradient(circle_at_top_right,rgba(226,232,240,0.10),transparent_36%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.024))] dark:ring-white/10',
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
        'rounded-[1.8rem] p-4 md:p-5 shadow-[0_18px_46px_-32px_rgba(15,23,42,0.5)] ring-1 dark:shadow-[0_18px_52px_-34px_rgba(0,0,0,0.82)] backdrop-blur-sm',
        cardToneClasses(tone)
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
          <p className="text-2xl md:text-3xl font-black tracking-tight">{value}</p>
          <p className="text-sm font-bold text-foreground/80">{support}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/55 ring-1 ring-slate-950/5 dark:bg-white/[0.07] dark:ring-white/10">
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
  const { accounts, categories, transactions, debts, viewDate } = useFinanceStore();

  const monthPlan = useMemo(
    () =>
      buildMonthPlan({
        accounts,
        transactions,
        categories,
        debts,
        viewDate,
      }),
    [accounts, categories, debts, transactions, viewDate]
  );

  const monthTitle = format(viewDate, "MMMM 'de' yyyy", { locale: ptBR }).replace(/^./, (char) => char.toUpperCase());
  const dueItems = monthPlan.upcomingOpenExpenses.slice(0, 6);
  const cashBalanceTone = monthPlan.cashBalance < 0 ? 'risk' : monthPlan.openExpensesTotal > 0 ? 'attention' : 'safe';

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

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 pb-24 md:space-y-7 md:p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-muted-foreground">Controle financeiro</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight md:text-4xl">Painel de {monthTitle}</h1>
        </div>

        <div className="flex items-center gap-3">
          <MonthSelector />
          {!isMobile ? (
            <Button variant="outline" className="rounded-xl" onClick={onRefreshData}>
              Atualizar
            </Button>
          ) : null}
        </div>
      </div>

      <section className="rounded-[2.25rem] bg-gradient-to-br from-background via-background to-muted/20 p-1 shadow-[0_18px_60px_-32px_rgba(15,23,42,0.28)] dark:shadow-[0_22px_80px_-38px_rgba(0,0,0,0.7)]">
        <div className="rounded-[2rem] bg-background/88 p-5 backdrop-blur-xl md:p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {controlCards.map((card) => (
              <ControlMetricCard key={card.label} {...card} />
            ))}
          </div>
        </div>
      </section>

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
