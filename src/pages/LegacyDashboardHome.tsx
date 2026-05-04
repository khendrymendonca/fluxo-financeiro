import { useMemo } from 'react';
import {
  Calculator,
  ArrowRightLeft,
  Info,
  Plus,
  Receipt,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
  Rabbit,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { formatCurrency } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import { BudgetAlerts } from '@/components/dashboard/BudgetAlerts';
import { ExpenseChart } from '@/components/dashboard/ExpenseChart';
import { MonthSelector } from '@/components/dashboard/MonthSelector';
import { PendingPayments } from '@/components/dashboard/PendingPayments';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { StatCard } from '@/components/dashboard/StatCard';
import { WeeklyFlowChart } from '@/components/dashboard/WeeklyFlowChart';

interface LegacyDashboardHomeProps {
  isBalanceVisible: boolean;
  onRefreshData: () => void;
  onOpenTransactionForm: () => void;
  onOpenTransferForm: () => void;
  onNavigateToBills: () => void;
  onNavigateToTransactions: () => void;
}

export function LegacyDashboardHome({
  isBalanceVisible,
  onRefreshData,
  onOpenTransactionForm,
  onOpenTransferForm,
  onNavigateToBills,
  onNavigateToTransactions,
}: LegacyDashboardHomeProps) {
  const { user } = useAuth();
  const { accentColor } = useThemeColor();
  const isMobile = useIsMobile();
  const {
    accounts,
    creditCards,
    categories,
    currentMonthTransactions,
    totalPendingOutflows,
    viewDate,
  } = useFinanceStore();
  const { cashflow, categoryExpenses } = useDashboardMetrics(viewDate, currentMonthTransactions);

  const totalNetWorth = useMemo(
    () => accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0),
    [accounts]
  );
  const projectedBalance = useMemo(
    () => totalNetWorth - totalPendingOutflows,
    [totalNetWorth, totalPendingOutflows]
  );
  const userName = useMemo(
    () => user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Usuário',
    [user]
  );

  if (!isMobile) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto p-4 md:p-6 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1 opacity-50">Visão Geral</p>
            <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              Olá, <span className="text-primary">{userName}</span>
              {accentColor === 'pascoa' && <Rabbit className="w-8 h-8 text-primary animate-bounce" />}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={onRefreshData}
              className="rounded-xl border-border/40 h-10 w-10 hover:bg-primary/5 hover:text-primary transition-colors shrink-0"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <MonthSelector />
          </div>
        </div>

        <BudgetAlerts />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100">
          <StatCard title="Saldo Total" value={totalNetWorth} icon={<Wallet className="w-4 h-4" />} variant="neutral" />
          <StatCard title="Projetado" value={projectedBalance} icon={<Calculator className="w-4 h-4" />} variant={projectedBalance < 0 ? 'negative' : 'neutral'} />
          <StatCard title="Receitas" value={cashflow.totalIncome} icon={<TrendingUp className="w-4 h-4" />} variant="positive" />
          <StatCard title="Despesas" value={cashflow.totalExpenses} icon={<TrendingDown className="w-4 h-4" />} variant="negative" />
        </div>

        <div className="hidden md:grid md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200">
          <div className="bg-card rounded-[2rem] p-6 border border-border/40 shadow-sm h-[280px]">
            <WeeklyFlowChart transactions={currentMonthTransactions} viewDate={viewDate} />
          </div>
          <div className="bg-card rounded-[2rem] p-6 border border-border/40 shadow-sm h-[280px]">
            <ExpenseChart data={Object.fromEntries(categoryExpenses.map((category) => [category.name, category.value]))} />
          </div>
        </div>

        <div className="hidden md:block animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300">
          <div className="bg-card rounded-[2rem] border border-border/40 shadow-sm overflow-y-auto no-scrollbar h-[320px]">
            <PendingPayments
              transactions={currentMonthTransactions}
              accounts={accounts}
              creditCards={creditCards}
              viewDate={viewDate}
            />
          </div>
        </div>

        <div className="hidden md:block animate-in fade-in slide-in-from-bottom-2 duration-500 delay-400">
          <div className="bg-card rounded-[2rem] border border-border/40 shadow-sm overflow-hidden min-h-[400px]">
            <RecentTransactions transactions={currentMonthTransactions} accounts={accounts} creditCards={creditCards} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-in slide-in-from-bottom-4 duration-500 overflow-hidden">
      <div className="flex flex-col gap-1 shrink-0 mb-4 min-w-0 flex-1 overflow-hidden relative">
        <p className="text-xs text-gray-500 dark:text-zinc-500 font-black uppercase tracking-widest">Patrimônio Total</p>
        {accentColor === 'pascoa' && <Rabbit className="absolute right-4 top-0 w-8 h-8 text-primary animate-bounce duration-1000" />}
        <h1
          className="text-[clamp(1.5rem,4vw,3rem)] font-black tracking-tighter truncate block w-full max-w-[90vw] md:max-w-md text-gray-900 dark:text-white"
          title={formatCurrency(totalNetWorth)}
        >
          {isBalanceVisible ? formatCurrency(totalNetWorth) : '••••••'}
        </h1>
      </div>

      <div className="flex gap-4 overflow-x-auto no-scrollbar py-2 -mx-4 px-4 shrink-0 mb-4">
        {[
          { id: 'add', icon: Plus, label: 'Lançar', color: 'bg-primary/20 text-primary border-primary/30', action: onOpenTransactionForm },
          {
            id: 'transfer',
            icon: ArrowRightLeft,
            label: 'Transferir',
            color: 'bg-white dark:bg-zinc-900 text-gray-900 dark:text-white border-gray-100 dark:border-zinc-800',
            action: onOpenTransferForm,
          },
          {
            id: 'pay',
            icon: Receipt,
            label: 'Pagar',
            color: 'bg-white dark:bg-zinc-900 text-gray-900 dark:text-white border-gray-100 dark:border-zinc-800',
            action: onNavigateToBills,
          },
        ].map((action) => (
          <button
            key={action.id}
            onClick={action.action}
            className="flex flex-col items-center gap-2 min-w-[70px] active:scale-95 transition-transform"
          >
            <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center border shadow-sm dark:shadow-none', action.color)}>
              <action.icon className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-gray-500 dark:text-zinc-500">{action.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar space-y-6">
        <div className="grid grid-cols-1 gap-3">
          <div className="bg-white dark:bg-zinc-900/40 border border-gray-100 dark:border-zinc-900 p-5 rounded-[2rem] shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-black text-gray-500 dark:text-zinc-500 uppercase tracking-widest">Saldo Projetado</p>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 p-0 hover:bg-transparent">
                      <Info className="w-4 h-4 text-gray-400 dark:text-zinc-600" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-zinc-800 text-white border-none p-3 rounded-lg max-w-[200px] text-xs leading-relaxed z-[100]">
                    O saldo projetado soma seu saldo atual com todas as receitas e despesas previstas para este mês.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <h3
              className={cn('text-2xl font-bold tracking-tight truncate block w-full max-w-full', projectedBalance < 0 ? 'text-danger' : 'text-gray-900 dark:text-white')}
              title={isBalanceVisible ? formatCurrency(projectedBalance) : '••••••'}
            >
              {isBalanceVisible ? formatCurrency(projectedBalance) : '••••••'}
            </h3>
          </div>

          <div className="bg-white dark:bg-zinc-900/40 border border-gray-100 dark:border-zinc-900 p-5 rounded-[2rem] shadow-sm">
            <p className="text-xs font-black text-gray-500 dark:text-zinc-500 uppercase tracking-widest mb-2">Fluxo do Mês</p>
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <p className="text-[11px] text-emerald-500 font-black uppercase">Entradas</p>
                <p className="font-bold text-sm">{isBalanceVisible ? formatCurrency(cashflow.totalIncome) : '••••'}</p>
              </div>
              <div className="w-[1px] h-6 bg-gray-100 dark:bg-zinc-800" />
              <div className="flex flex-col">
                <p className="text-[11px] text-danger font-black uppercase">Saídas</p>
                <p className="font-bold text-sm">{isBalanceVisible ? formatCurrency(cashflow.totalExpenses) : '••••'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-black text-gray-500 dark:text-zinc-500 uppercase tracking-widest">Últimos Lançamentos</p>
            <button onClick={onNavigateToTransactions} className="text-xs font-bold text-primary px-2">Ver tudo</button>
          </div>
          <div className="space-y-2">
            {currentMonthTransactions.slice(0, 3).map((transaction) => (
              <div key={transaction.id} className="bg-white dark:bg-zinc-900/40 border border-gray-50 dark:border-zinc-900 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', transaction.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-danger/10 text-danger')}>
                    {transaction.type === 'income' ? <Plus className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold leading-none mb-1">{transaction.description}</p>
                    <p className="text-xs text-gray-500 dark:text-zinc-500 uppercase font-black">
                      {categories.find((category) => category.id === transaction.categoryId)?.name || 'Geral'}
                    </p>
                  </div>
                </div>
                <p className={cn('text-xs font-black', transaction.type === 'income' ? 'text-emerald-500' : 'text-gray-900 dark:text-white')}>
                  {transaction.type === 'income' ? '+' : '-'}
                  {formatCurrency(Math.abs(Number(transaction.amount)))}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
