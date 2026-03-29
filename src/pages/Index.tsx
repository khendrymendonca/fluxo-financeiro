import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useIsMobile } from '@/hooks/useIsMobile';
import {
  Home,
  List,
  CreditCard as CardIcon,
  HelpCircle,
  LayoutDashboard,
  Plus,
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Menu,
  ArrowUpDown,
  Receipt,
  Target,
  LineChart,
  Settings2,
  Database,
  Calculator,
  Eye,
  EyeOff,
  Bell,
  ArrowRight,
  Send,
  History,
  BarChart3,
  ArrowRightLeft,
  Info,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { useEmergencyFund } from '@/hooks/useEmergencyFund';
import { todayLocalString } from '@/utils/dateUtils';
import { formatCurrency } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import { NavigationRail } from '@/components/layout/NavigationRail';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { TransactionList } from '@/components/transactions/TransactionList';
import { GoalCard } from '@/components/goals/GoalCard';
import { GoalForm } from '@/components/goals/GoalForm';
import { WhatIfSimulator } from '@/components/simulator/WhatIfSimulator';
import { AccountsManager } from '@/components/accounts/AccountsManager';
import { DebtsManager } from '@/components/debts/DebtsManager';
import ReportsDashboard from './ReportsDashboard';
import CardsDashboard from './CardsDashboard';
import { Button } from '@/components/ui/button';
import { Transaction, SavingsGoal } from '@/types/finance';
import { EmergencyReserve } from '@/components/dashboard/EmergencyReserve';
import { CategoriesManager } from '@/components/settings/CategoriesManager';
import { PageHeader } from '@/components/ui/PageHeader';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";

type ViewType = 'dashboard' | 'transactions' | 'bills' | 'cards' | 'accounts' | 'goals' | 'reports' | 'debts' | 'simulator' | 'categories' | 'export';

export default function Index() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentView = (searchParams.get('view') as ViewType) || 'dashboard';

  const setCurrentView = (view: ViewType) => {
    setSearchParams({ view });
  };

  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);

  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem('sidebar-expanded');
    return saved !== null ? JSON.parse(saved) : false;
  });

  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | undefined>(undefined);

  const {
    accounts,
    creditCards,
    debts,
    savingsGoals,
    currentMonthTransactions,
    setEmergencyMonths,
    addTransaction,
    updateTransaction,
    addAccount,
    updateAccount,
    deleteAccount,
    addDebt,
    updateDebt,
    deleteDebt,
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    deleteTransaction,
    depositToGoal,
    totalPendingOutflows,
    viewDate
  } = useFinanceStore();

  const isMobile = useIsMobile();
  const { cashflow, categoryExpenses } = useDashboardMetrics(viewDate, currentMonthTransactions);
  const { ...emergencyData } = useEmergencyFund(currentMonthTransactions);

  const totalNetWorth = useMemo(() => accounts.reduce((sum, acc) => sum + Number(acc.balance), 0), [accounts]);

  const userInitials = useMemo(() => {
    if (user?.user_metadata?.full_name) {
      const parts = user.user_metadata.full_name.split(' ');
      if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      return parts[0].substring(0, 2).toUpperCase();
    }
    return user?.email?.substring(0, 2).toUpperCase() || '??';
  }, [user]);

  const userName = useMemo(() => {
    return user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Usuário';
  }, [user]);

  const projectedBalance = useMemo(() => totalNetWorth - totalPendingOutflows, [totalNetWorth, totalPendingOutflows]);

  const handleEditTransaction = useCallback((item: Transaction) => {
    setEditingTransaction(item);
    setShowTransactionForm(true);
  }, []);

  const handleToggleSidebar = useCallback((expanded: boolean) => {
    setIsExpanded(expanded);
    localStorage.setItem('sidebar-expanded', JSON.stringify(expanded));
  }, []);

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto pb-24">
            {/* Header Nu Style */}
            <div className="flex items-center justify-between px-1 py-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12 border-2 border-gray-100 dark:border-zinc-900 shadow-sm">
                  <AvatarFallback className="bg-gray-100 dark:bg-zinc-900 text-gray-500 dark:text-zinc-400 font-bold">{userInitials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-[10px] text-gray-500 dark:text-zinc-500 font-black uppercase tracking-widest leading-none">Olá,</p>
                  <p className="font-bold text-lg leading-tight">{userName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors" onClick={() => setIsBalanceVisible(!isBalanceVisible)}>
                  {isBalanceVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  onClick={() => {
                    import('sonner').then(({ toast }) => toast('Notificações em breve!'));
                  }}
                >
                  <Bell className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Saldo Principal */}
            <div className="px-1 py-4">
              <p className="text-[10px] text-gray-500 dark:text-zinc-500 font-black uppercase tracking-widest mb-1">Patrimônio Total</p>
              <h1 className="text-4xl font-black tracking-tighter transition-all duration-300 text-gray-900 dark:text-white">
                {isBalanceVisible ? formatCurrency(totalNetWorth) : '••••••'}
              </h1>
              <div className="flex items-center gap-2 mt-2 opacity-0">
                <span className="flex items-center gap-1 text-emerald-500 text-[10px] font-black uppercase tracking-wider">
                  <TrendingUp className="w-3 h-3" /> +0% <span className="text-gray-500 dark:text-zinc-500">este mês</span>
                </span>
              </div>
            </div>

            {/* Ações Rápidas */}
            <div className="flex gap-4 overflow-x-auto no-scrollbar py-2 -mx-1 px-1 snap-x">
              {[
                { id: 'add', icon: Plus, label: 'Lançar', color: 'bg-primary/20 text-primary border-primary/30', action: () => { setEditingTransaction(undefined); setShowTransactionForm(true); } },
                {
                  id: 'transfer', icon: ArrowRightLeft, label: 'Transferir', color: 'bg-white dark:bg-zinc-900 text-gray-900 dark:text-white border-gray-100 dark:border-zinc-800', action: () => {
                    setEditingTransaction(undefined);
                    setShowTransactionForm(true);
                  }
                },
                { id: 'pay', icon: Receipt, label: 'Pagar', color: 'bg-white dark:bg-zinc-900 text-gray-900 dark:text-white border-gray-100 dark:border-zinc-800', action: () => setCurrentView('transactions') },
                { id: 'invest', icon: Target, label: 'Investir', color: 'bg-white dark:bg-zinc-900 text-gray-900 dark:text-white border-gray-100 dark:border-zinc-800', action: () => setCurrentView('goals') },
              ].map(action => (
                <button
                  key={action.id}
                  onClick={action.action}
                  className="flex flex-col items-center gap-2 min-w-[70px] snap-start group active:scale-95 transition-transform"
                >
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border transition-all group-hover:bg-gray-50 dark:group-hover:bg-zinc-800 shadow-sm dark:shadow-none", action.color)}>
                    <action.icon className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-500 group-hover:text-gray-900 dark:group-hover:text-zinc-300">{action.label}</span>
                </button>
              ))}
            </div>

            {/* Métricas Principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-zinc-900/40 border border-gray-100 dark:border-zinc-900 p-6 rounded-[2.5rem] shadow-sm dark:shadow-none">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black text-gray-500 dark:text-zinc-500 uppercase tracking-widest">Saldo Projetado</p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger><Info className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-700" /></TooltipTrigger>
                      <TooltipContent className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-[10px] text-gray-900 dark:text-zinc-50">Saldo previsto considerando pendências</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <h3 className="text-2xl font-bold tracking-tight">
                  {isBalanceVisible ? formatCurrency(projectedBalance) : '••••••'}
                </h3>
              </div>

              <div className="bg-white dark:bg-zinc-900/40 border border-gray-100 dark:border-zinc-900 p-6 rounded-[2.5rem] shadow-sm dark:shadow-none">
                <p className="text-[10px] font-black text-gray-500 dark:text-zinc-500 uppercase tracking-widest mb-3">Fluxo do Mês</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] text-emerald-500 font-black uppercase mb-0.5">Entradas</p>
                    <p className="font-bold text-sm tracking-tight">{isBalanceVisible ? formatCurrency(cashflow.totalIncome) : '••••'}</p>
                  </div>
                  <div className="w-[1px] h-6 bg-gray-100 dark:bg-zinc-800" />
                  <div>
                    <p className="text-[9px] text-gray-500 dark:text-zinc-500 font-black uppercase mb-0.5">Saídas</p>
                    <p className="font-bold text-sm tracking-tight">{isBalanceVisible ? formatCurrency(cashflow.totalExpenses) : '••••'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Widgets de Gestão */}
            <div className="space-y-6 pt-2">
              <EmergencyReserve
                data={emergencyData as any}
                onMonthsChange={setEmergencyMonths}
              />

              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h2 className="text-lg font-bold tracking-tight">Minhas Contas</h2>
                  <Button variant="link" className="text-primary text-xs font-bold" onClick={() => setCurrentView('accounts')}>Ver todas</Button>
                </div>
                <AccountsManager
                  accounts={accounts}
                  onAddAccount={addAccount}
                  onUpdateAccount={updateAccount}
                  onDeleteAccount={deleteAccount}
                />
              </div>
            </div>
          </div>
        );
      case 'transactions':
        return (
          <div className="max-w-2xl mx-auto pt-4">
            <TransactionList
              transactions={currentMonthTransactions}
              onEdit={handleEditTransaction}
              onPayBill={async (tx) => {
                await updateTransaction(tx.id, {
                  isPaid: true,
                  paymentDate: todayLocalString(),
                  accountId: tx.accountId,
                  cardId: tx.cardId
                });
              }}
            />
          </div>
        );
      case 'goals':
        return (
          <div className="space-y-6 pt-4 max-w-4xl mx-auto">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-2xl font-bold tracking-tight">Metas</h2>
              <Button size="sm" className="rounded-xl font-bold" onClick={() => setShowGoalForm(true)}>Criar Meta</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savingsGoals.map(goal => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  accounts={accounts}
                  onUpdate={updateSavingsGoal}
                  onDelete={deleteSavingsGoal}
                  onDeposit={depositToGoal}
                  onEdit={(goal) => {
                    setEditingGoal(goal);
                    setShowGoalForm(true);
                  }}
                />
              ))}
            </div>
          </div>
        );
      case 'debts':
        return (
          <div className="max-w-2xl mx-auto">
            <DebtsManager
              debts={debts}
              onAddDebt={addDebt}
              onUpdateDebt={updateDebt}
              onDeleteDebt={deleteDebt}
            />
          </div>
        );
      case 'simulator':
        return (
          <div className="max-w-4xl mx-auto">
            <WhatIfSimulator
              totalIncome={cashflow.totalIncome}
              totalExpenses={cashflow.totalExpenses}
              categoryExpenses={Object.fromEntries(categoryExpenses.map(c => [c.name, c.value]))}
            />
          </div>
        );
      case 'categories':
        return <div className="max-w-2xl mx-auto"><CategoriesManager /></div>;
      case 'reports':
        return <ReportsDashboard />;
      case 'cards':
        return <div className="max-w-2xl mx-auto"><CardsDashboard /></div>;
      default:
        return <div className="text-center py-20 text-zinc-500 italic">Em breve...</div>;
    }
  };

  return (
    <div className="font-sans selection:bg-primary/30">
      {!isMobile && (
        <NavigationRail
          isExpanded={isExpanded}
          onToggle={handleToggleSidebar}
          currentView={currentView}
          onNavigate={setCurrentView}
        />
      )}

      <main className={cn(
        "transition-all duration-300 ease-in-out pb-24 md:pb-8 px-4",
        !isMobile && (isExpanded ? "pl-72" : "pl-24")
      )}>
        {renderView()}
      </main>

      {isMobile && (
        <BottomNavigation
          activeView={currentView}
          onViewChange={(v) => setCurrentView(v as ViewType)}
        />
      )}

      {showTransactionForm && (
        <TransactionForm
          accounts={accounts}
          creditCards={creditCards}
          initialData={editingTransaction}
          onSubmit={async (tx, _customInstallments, applyScope) => {
            if (editingTransaction) {
              await updateTransaction(editingTransaction.id, tx, tx.cardClosingDay, tx.cardDueDay, editingTransaction.cardId, applyScope);
            } else {
              await addTransaction(tx as any);
            }
            setShowTransactionForm(false);
            setEditingTransaction(undefined);
          }}
          onDelete={(id, scope) => {
            if (editingTransaction) deleteTransaction(editingTransaction, scope);
            setShowTransactionForm(false);
            setEditingTransaction(undefined);
          }}
          onClose={() => {
            setShowTransactionForm(false);
            setEditingTransaction(undefined);
          }}
        />
      )}

      {showGoalForm && (
        <GoalForm
          initialData={editingGoal}
          onSubmit={async (goal) => {
            if (editingGoal) await updateSavingsGoal(editingGoal.id, goal);
            else await addSavingsGoal(goal);
            setShowGoalForm(false);
            setEditingGoal(undefined);
          }}
          onClose={() => {
            setShowGoalForm(false);
            setEditingGoal(undefined);
          }}
        />
      )}
    </div>
  );
}
