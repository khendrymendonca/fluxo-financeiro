import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
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
  Sun,
  Moon,
  Zap,
  Rocket,
  Shield
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
import { CategoriesManager } from '@/components/settings/CategoriesManager';
import { ProfileSettings } from './ProfileSettings';
import { PageHeader } from '@/components/ui/PageHeader';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import EmergencyFund from './EmergencyFund';
import { BillsManager } from '@/components/accounts/BillsManager';
import { StatCard } from '@/components/dashboard/StatCard';
import { ExpenseChart } from '@/components/dashboard/ExpenseChart';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { PendingPayments } from '@/components/dashboard/PendingPayments';
import { MonthSelector } from '@/components/dashboard/MonthSelector';
import { ExportManager } from '@/components/dashboard/ExportManager';
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

type ViewType = 'dashboard' | 'transactions' | 'bills' | 'cards' | 'accounts' | 'goals' | 'reports' | 'debts' | 'simulator' | 'categories' | 'export' | 'emergency' | 'menu' | 'profile';

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

  const [isExpanded, setIsExpanded] = useState(true);

  const { theme, setTheme } = useTheme();
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | undefined>(undefined);
  const [initialFormTab, setInitialFormTab] = useState<'pontual' | 'transfer' | undefined>(undefined);

  const {
    accounts,
    creditCards,
    debts,
    savingsGoals,
    categories,
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
    // No longer toggleable in Web
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
    { id: 'transactions', icon: List, label: 'Lançamentos' },
    { id: 'cards', icon: CardIcon, label: 'Cartões' },
    { id: 'bills', icon: Receipt, label: 'Gestão de Contas' },
    { id: 'accounts', icon: Wallet, label: 'Minhas Contas (Carteira)' },
    { id: 'emergency', icon: Shield, label: 'Reserva de Emergência' },
    { id: 'goals', icon: Rocket, label: 'Sonhos & Projetos' },
    { id: 'debts', icon: History, label: 'Acordos' },
    { id: 'reports', icon: BarChart3, label: 'Relatórios' },
    { id: 'categories', icon: Settings2, label: 'Categorias' },
    { id: 'simulator', icon: Calculator, label: 'Simulador' },
    { id: 'export', icon: Database, label: 'Exportar' },
    { id: 'profile', icon: Settings2, label: 'Ajustes de Perfil' },
  ];

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        if (!isMobile) {
          return (
            <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto p-4 md:p-8">
              {/* Header Desktop com Saudação */}
              <div className="mb-4">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-1">Visão Geral</p>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                      Olá, <span className="text-primary">{userName}</span>
                    </h1>
                  </div>
                  <MonthSelector />
                </div>
              </div>

              {/* Linha 1: Métricas principais - 4 cards lado a lado */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-500">
                <StatCard title="Saldo Total" value={totalNetWorth} icon={<Wallet className="w-5 h-5" />} variant="neutral" />
                <StatCard title="Projetado" value={projectedBalance} icon={<Calculator className="w-5 h-5" />} variant={projectedBalance < 0 ? 'negative' : 'neutral'} />
                <StatCard title="Receitas" value={cashflow.totalIncome} icon={<TrendingUp className="w-5 h-5" />} variant="positive" />
                <StatCard title="Despesas" value={cashflow.totalExpenses} icon={<TrendingDown className="w-5 h-5" />} variant="negative" />
              </div>

              {/* Grid Principal - Layout 2/1 para priorizar Lançamentos */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
                {/* Coluna 1 & 2: Contas a pagar e Transações Recentes */}
                <div className="lg:col-span-2 space-y-6">
                  <PendingPayments transactions={currentMonthTransactions} accounts={accounts} creditCards={creditCards} />
                  <RecentTransactions transactions={currentMonthTransactions} accounts={accounts} creditCards={creditCards} />
                </div>

                {/* Coluna 3: Gráfico de gastos (Distribuição) */}
                <div className="lg:col-span-1">
                  <ExpenseChart data={Object.fromEntries(categoryExpenses.map(c => [c.name, c.value]))} />
                </div>
              </div>
            </div>
          );
        }

        // Dashboard Mobile Minimalista (Zero-Scroll Estabilizado)
        return (
          <div className="flex flex-col h-full animate-in slide-in-from-bottom-4 duration-500 overflow-hidden">
            {/* Bloco Superior: Saldo */}
            <div className="flex flex-col gap-1 shrink-0 mb-4 min-w-0 flex-1 overflow-hidden">
              <p className="text-[10px] text-gray-500 dark:text-zinc-500 font-black uppercase tracking-widest">Patrimônio Total</p>
              <h1
                className="text-[clamp(1.5rem,4vw,3rem)] font-black tracking-tighter truncate block w-full max-w-[90vw] md:max-w-md text-gray-900 dark:text-white"
                title={formatCurrency(totalNetWorth)}
              >
                {isBalanceVisible ? formatCurrency(totalNetWorth) : '••••••'}
              </h1>
            </div>

            {/* Ações Rápidas - Oculto no Desktop */}
            <div className="flex gap-4 overflow-x-auto no-scrollbar py-2 -mx-4 px-4 shrink-0 mb-4">
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
                  className="flex flex-col items-center gap-2 min-w-[70px] active:scale-95 transition-transform"
                >
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border shadow-sm dark:shadow-none", action.color)}>
                    <action.icon className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-500">{action.label}</span>
                </button>
              ))}
            </div>

            {/* Conteúdo Rolável Internamente */}
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-6">
              {/* Métricas Principais */}
              <div className="grid grid-cols-1 gap-3">
                <div className="bg-white dark:bg-zinc-900/40 border border-gray-100 dark:border-zinc-900 p-5 rounded-[2rem] shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-black text-gray-500 dark:text-zinc-500 uppercase tracking-widest">Saldo Projetado</p>
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
                    className={cn("text-2xl font-bold tracking-tight truncate block w-full max-w-full", projectedBalance < 0 ? "text-danger" : "text-gray-900 dark:text-white")}
                    title={isBalanceVisible ? formatCurrency(projectedBalance) : '••••••'}
                  >
                    {isBalanceVisible ? formatCurrency(projectedBalance) : '••••••'}
                  </h3>
                </div>

                <div className="bg-white dark:bg-zinc-900/40 border border-gray-100 dark:border-zinc-900 p-5 rounded-[2rem] shadow-sm">
                  <p className="text-[10px] font-black text-gray-500 dark:text-zinc-500 uppercase tracking-widest mb-2">Fluxo do Mês</p>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <p className="text-[9px] text-emerald-500 font-black uppercase">Entradas</p>
                      <p className="font-bold text-sm">{isBalanceVisible ? formatCurrency(cashflow.totalIncome) : '••••'}</p>
                    </div>
                    <div className="w-[1px] h-6 bg-gray-100 dark:bg-zinc-800" />
                    <div className="flex flex-col">
                      <p className="text-[9px] text-danger font-black uppercase">Saídas</p>
                      <p className="font-bold text-sm">{isBalanceVisible ? formatCurrency(cashflow.totalExpenses) : '••••'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Últimos Lançamentos */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-1">
                  <p className="text-[10px] font-black text-gray-500 dark:text-zinc-500 uppercase tracking-widest">Últimos Lançamentos</p>
                  <button onClick={() => setCurrentView('transactions')} className="text-[10px] font-bold text-primary px-2">Ver tudo</button>
                </div>
                <div className="space-y-2">
                  {currentMonthTransactions.slice(0, 3).map(tx => (
                    <div key={tx.id} className="bg-white dark:bg-zinc-900/40 border border-gray-50 dark:border-zinc-900 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-danger/10 text-danger')}>
                          {tx.type === 'income' ? <Plus className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold leading-none mb-1">{tx.description}</p>
                          <p className="text-[10px] text-gray-500 dark:text-zinc-500 uppercase font-black">
                            {categories.find(c => c.id === tx.categoryId)?.name || 'Geral'}
                          </p>
                        </div>
                      </div>
                      <p className={cn("text-xs font-black", tx.type === 'income' ? 'text-emerald-500' : 'text-gray-900 dark:text-white')}>
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(Number(tx.amount)))}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      case 'transactions':
        return (
          <div className="space-y-4 pt-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <PageHeader title="Lançamentos" icon={List} />
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => {
                    setEditingTransaction(undefined);
                    setShowTransactionForm(true);
                  }}
                  className="bg-primary hover:bg-primary/90 text-white shadow-md hidden md:flex rounded-xl font-bold"
                >
                  <Plus className="w-4 h-4 mr-2" /> Novo Lançamento
                </Button>
                <MonthSelector />
              </div>
            </div>
            <TransactionList
              transactions={currentMonthTransactions}
              onEdit={handleEditTransaction}
              onPayBill={async (tx) => {
                await updateTransaction({
                  id: tx.id,
                  updates: {
                    isPaid: true,
                    paymentDate: todayLocalString(),
                    accountId: tx.accountId,
                    cardId: tx.cardId
                  }
                });
              }}
            />
          </div>
        );
      case 'goals':
        return (
          <div className="space-y-6 pt-2">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-2xl font-black tracking-tight">Sonhos & Projetos</h2>
              <Button size="sm" className="rounded-xl font-bold bg-primary text-white" onClick={() => setShowGoalForm(true)}>Lançar Novo Projeto</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savingsGoals.map(goal => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  accounts={accounts}
                  onUpdate={(id, updates) => {
                    console.log('Update Goal:', id, updates);
                    updateSavingsGoal({ id, updates });
                  }}
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
              onUpdateDebt={(id, updates) => {
                console.log('Update Debt:', id, updates);
                updateDebt({ id, updates });
              }}
              onDeleteDebt={deleteDebt}
            />
          </div>
        );
      case 'simulator':
        return (
          <div className="w-full">
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
        return <div className="w-full"><CardsDashboard /></div>;
      case 'accounts':
        return (
          <div className="w-full max-w-5xl mx-auto">
            <AccountsManager
              accounts={accounts}
              onAddAccount={addAccount}
              onUpdateAccount={(id, updates) => {
                console.log('Disparando update para conta:', id, updates);
                updateAccount({ id, updates });
              }}
              onDeleteAccount={deleteAccount}
            />
          </div>
        );
      case 'bills':
        return <BillsManager />;
      case 'emergency':
        return <EmergencyFund />;
      case 'export':
        return <ExportManager />;
      case 'profile':
        return <ProfileSettings />;
      default:
        return <div className="text-center py-20 text-zinc-500 italic">Em breve...</div>;
    }
  };

  return (
    <AppLayout
      sidebar={
        <NavigationRail
          currentView={currentView}
          onNavigate={setCurrentView}
        />
      }
      headerMobile={
        <>
          <div className="flex items-center gap-4">
            <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-gray-500 dark:text-zinc-400">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:w-[350px] bg-white dark:bg-zinc-950 border-r border-gray-100 dark:border-zinc-900 p-0 flex flex-col h-full">
                <SheetHeader className="p-6 text-left border-b border-gray-100 dark:border-zinc-900 shrink-0">
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

                <div className="flex-1 overflow-y-auto py-4 space-y-1 no-scrollbar">
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

                <div className="mt-auto border-t border-gray-100 dark:border-zinc-900 p-6 space-y-6">
                  <div>
                    <p className="text-[10px] uppercase font-black tracking-widest text-zinc-500 mb-4">Aparência</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[{ id: 'light', icon: Sun, label: 'Claro' }, { id: 'dark', icon: Moon, label: 'Escuro' }, { id: 'amoled', icon: Zap, label: 'AMOLED' }].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setTheme(t.id as any)}
                          className={cn(
                            "flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all",
                            theme === t.id ? "bg-primary/10 border-primary text-primary" : "bg-gray-50 dark:bg-zinc-900 border-transparent text-zinc-500"
                          )}
                        >
                          <t.icon className="w-4 h-4" />
                          <span className="text-[9px] font-bold">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-gray-100 dark:bg-zinc-900 text-gray-500 dark:text-zinc-400 font-bold text-[10px]">{userInitials}</AvatarFallback>
              </Avatar>
              <p className="font-bold text-sm">{userName}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsBalanceVisible(!isBalanceVisible)}>
            {isBalanceVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </Button>
        </>
      }
      bottomNav={
        <BottomNavigation
          activeView={currentView}
          onViewChange={(v) => setCurrentView(v as ViewType)}
        />
      }
      fab={
        ['dashboard', 'transactions'].includes(currentView) && (
          <Button
            onClick={() => {
              setEditingTransaction(undefined);
              setShowTransactionForm(true);
            }}
            className="fixed bottom-24 right-4 w-14 h-14 rounded-full shadow-2xl bg-primary text-primary-foreground z-40 md:hidden"
          >
            <Plus className="w-7 h-7" />
          </Button>
        )
      }
    >
      {renderView()}

      {showTransactionForm && (
        <TransactionForm
          accounts={accounts}
          creditCards={creditCards}
          initialData={editingTransaction}
          initialTab={initialFormTab}
          onSubmit={async (tx, _customInstallments, applyScope) => {
            if (editingTransaction) {
              await updateTransaction({
                id: editingTransaction.id,
                updates: tx,
                cardClosingDay: tx.cardClosingDay,
                cardDueDay: tx.cardDueDay,
                currentCardId: editingTransaction.cardId,
                applyScope
              });
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
            if (editingGoal) await updateSavingsGoal({ id: editingGoal.id, updates: goal });
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
    </AppLayout>
  );
}
