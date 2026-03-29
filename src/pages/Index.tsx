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
  LogOut,
  Shield,
  Sun,
  Moon,
  Zap
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { useTheme } from '@/hooks/useTheme';
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
import EmergencyFund from './EmergencyFund';
import { BillsManager } from '@/components/accounts/BillsManager';
import { StatCard } from '@/components/dashboard/StatCard';
import { ExpenseChart } from '@/components/dashboard/ExpenseChart';
import { GoalProgress } from '@/components/dashboard/GoalProgress';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { PendingPayments } from '@/components/dashboard/PendingPayments';
import { MonthSelector } from '@/components/dashboard/MonthSelector';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

type ViewType = 'dashboard' | 'transactions' | 'bills' | 'cards' | 'accounts' | 'goals' | 'reports' | 'debts' | 'simulator' | 'categories' | 'export' | 'emergency' | 'menu';

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

  const { theme, setTheme } = useTheme();
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | undefined>(undefined);
  const [initialFormTab, setInitialFormTab] = useState<'pontual' | 'transfer' | undefined>(undefined);

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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    if (currentView === 'menu') {
      setIsDrawerOpen(true);
      setCurrentView('dashboard'); // Reset p/ não ficar preso no estado 'menu'
    }
  }, [currentView]);

  const navigationItems = [
    { id: 'dashboard', icon: Home, label: 'Início' },
    { id: 'transactions', icon: List, label: 'Extrato' },
    { id: 'bills', icon: Receipt, label: 'Gestão de Contas' },
    { id: 'accounts', icon: Wallet, label: 'Minhas Contas (Carteira)' },
    { id: 'emergency', icon: Shield, label: 'Reserva de Emergência' },
    { id: 'goals', icon: Target, label: 'Metas' },
    { id: 'debts', icon: History, label: 'Acordos' },
    { id: 'reports', icon: BarChart3, label: 'Relatórios' },
    { id: 'categories', icon: Settings2, label: 'Categorias' },
    { id: 'simulator', icon: Calculator, label: 'Simulador' },
    { id: 'export', icon: Database, label: 'Exportar' },
  ];

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        if (!isMobile) {
          return (
            <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
              {/* Header Desktop com Seletor de Período */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <PageHeader title={`Dashboard`} icon={LayoutDashboard} />
                <MonthSelector />
              </div>

              {/* Grid de Stats Superiores */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Saldo em Contas" value={totalNetWorth} icon={<Wallet />} variant="neutral" />
                <StatCard title="Entradas (Mês)" value={cashflow.totalIncome} icon={<TrendingUp />} variant="positive" />
                <StatCard title="Saídas (Mês)" value={cashflow.totalExpenses} icon={<TrendingDown />} variant="negative" />
                <StatCard title="Projetado" value={projectedBalance} icon={<Calculator />} variant={projectedBalance < 0 ? 'negative' : 'neutral'} subtitle="Considerando contas a pagar" />
              </div>

              {/* Grid Layout Principal */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <ExpenseChart data={Object.fromEntries(categoryExpenses.map(c => [c.name, c.value]))} />
                  <RecentTransactions transactions={currentMonthTransactions} accounts={accounts} creditCards={creditCards} />
                </div>
                <div className="space-y-6">
                  <PendingPayments transactions={currentMonthTransactions} accounts={accounts} creditCards={creditCards} />
                  <GoalProgress goals={savingsGoals} />
                  <EmergencyReserve data={emergencyData as any} onMonthsChange={setEmergencyMonths} />
                </div>
              </div>
            </div>
          );
        }

        // Dashboard Mobile (Nu-Style)
        return (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto pb-24">
            {/* Header Estilo App Nativo (Safe Area + Alinhamento) */}
            <div className="flex items-center justify-between pt-12 md:pt-6 px-1 py-4">
              <div className="flex items-center gap-4">
                <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                      <Menu className="w-6 h-6" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[300px] sm:w-[350px] bg-white dark:bg-zinc-950 border-r border-gray-100 dark:border-zinc-900 p-0 overflow-y-auto no-scrollbar">
                    <SheetHeader className="p-6 text-left border-b border-gray-100 dark:border-zinc-900">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-primary/10 text-primary font-bold">{userInitials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <SheetTitle className="text-sm font-bold">{userName}</SheetTitle>
                          <SheetDescription className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Menu Principal</SheetDescription>
                        </div>
                      </div>
                    </SheetHeader>

                    <div className="py-4 space-y-1">
                      {navigationItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setCurrentView(item.id as ViewType);
                            setIsDrawerOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center gap-4 px-6 py-4 text-sm font-bold transition-all",
                            currentView === item.id
                              ? "text-primary bg-primary/5 border-r-4 border-primary"
                              : "text-gray-500 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-900"
                          )}
                        >
                          <item.icon className="w-5 h-5" />
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>

                    <div className="absolute bottom-6 left-6 right-6 space-y-6">
                      <div className="pt-6 border-t border-gray-100 dark:border-zinc-900">
                        <p className="text-[10px] uppercase font-black tracking-widest text-zinc-500 mb-4">Aparência</p>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'light', icon: Sun, label: 'Claro' },
                            { id: 'dark', icon: Moon, label: 'Escuro' },
                            { id: 'amoled', icon: Zap, label: 'AMOLED' },
                          ].map((t) => (
                            <button
                              key={t.id}
                              onClick={() => setTheme(t.id as any)}
                              className={cn(
                                "flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all",
                                theme === t.id
                                  ? "bg-primary/10 border-primary text-primary"
                                  : "bg-gray-50 dark:bg-zinc-900 border-transparent text-zinc-500"
                              )}
                            >
                              <t.icon className="w-4 h-4" />
                              <span className="text-[9px] font-bold">{t.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          import('sonner').then(({ toast }) => toast('Logout em breve...'));
                          setIsDrawerOpen(false);
                        }}
                        className="flex items-center gap-4 text-sm font-bold text-danger hover:opacity-80 transition-opacity"
                      >
                        <LogOut className="w-5 h-5" />
                        <span>Sair do App</span>
                      </button>
                    </div>
                  </SheetContent>
                </Sheet>

                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 border-2 border-gray-100 dark:border-zinc-900 shadow-sm">
                    <AvatarFallback className="bg-gray-100 dark:bg-zinc-900 text-gray-500 dark:text-zinc-400 font-bold">{userInitials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-[10px] text-gray-500 dark:text-zinc-500 font-black uppercase tracking-widest leading-none">Olá,</p>
                    <p className="font-bold text-base leading-tight">{userName}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors" onClick={() => setIsBalanceVisible(!isBalanceVisible)}>
                  {isBalanceVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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
                    setInitialFormTab('transfer');
                    setShowTransactionForm(true);
                  }
                },
                { id: 'pay', icon: Receipt, label: 'Pagar', color: 'bg-white dark:bg-zinc-900 text-gray-900 dark:text-white border-gray-100 dark:border-zinc-800', action: () => setCurrentView('bills') },
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

            {/* Dashboards Extras Mobile */}
            <div className="space-y-6 pt-2">
              <EmergencyReserve
                data={emergencyData as any}
                onMonthsChange={setEmergencyMonths}
              />
            </div>
          </div>
        );
      case 'transactions':
        return (
          <div className="max-w-4xl mx-auto space-y-4 pt-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <PageHeader title="Extrato de Lançamentos" icon={List} />
              <MonthSelector />
            </div>
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
        return <div className="max-w-4xl mx-auto"><CardsDashboard /></div>;
      case 'bills':
        return <BillsManager />;
      case 'emergency':
        return <EmergencyFund />;
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

      {isMobile && currentView !== 'bills' && (
        <Button
          onClick={() => {
            setEditingTransaction(undefined);
            setInitialFormTab(undefined);
            setShowTransactionForm(true);
          }}
          className="fixed bottom-24 right-4 w-14 h-14 rounded-full shadow-2xl bg-primary text-primary-foreground hover:scale-110 active:scale-95 transition-all p-0 flex items-center justify-center z-40 border-4 border-white dark:border-zinc-950"
        >
          <Plus className="w-7 h-7" />
        </Button>
      )}

      {showTransactionForm && (
        <TransactionForm
          accounts={accounts}
          creditCards={creditCards}
          initialData={editingTransaction}
          initialTab={initialFormTab}
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
            setInitialFormTab(undefined);
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
