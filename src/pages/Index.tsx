import { useState, useRef, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Home, List, CreditCard as CardIcon, HelpCircle, LayoutDashboard, Plus, Wallet, TrendingUp, TrendingDown, PiggyBank, Menu, ArrowUpDown, Receipt, Target, LineChart, Settings2, Database, Calculator } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { useAccounts } from '@/hooks/useFinanceQueries';
import { useEmergencyFund } from '@/hooks/useEmergencyFund';
import { todayLocalString } from '@/utils/dateUtils';
import { formatCurrency } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import { NavigationRail } from '@/components/layout/NavigationRail';
import { MobileNav } from '@/components/layout/MobileNav';
import { StatCard } from '@/components/dashboard/StatCard';
import { ExpenseChart } from '@/components/dashboard/ExpenseChart';
import { GoalProgress } from '@/components/dashboard/GoalProgress';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { TransactionList } from '@/components/transactions/TransactionList';
import { GoalCard } from '@/components/goals/GoalCard';
import { GoalForm } from '@/components/goals/GoalForm';
import { WhatIfSimulator } from '@/components/simulator/WhatIfSimulator';
import { AccountsManager } from '@/components/accounts/AccountsManager';
import { DebtsManager } from '@/components/debts/DebtsManager';
import ReportsDashboard from './ReportsDashboard';
import CardsDashboard from './CardsDashboard';
import { MonthSelector } from '@/components/dashboard/MonthSelector';
import { Button } from '@/components/ui/button';
import { Transaction, SavingsGoal } from '@/types/finance';
import { PendingPayments } from '@/components/dashboard/PendingPayments';
import { EmergencyReserve } from '@/components/dashboard/EmergencyReserve';
import { CategoriesManager } from '@/components/settings/CategoriesManager';
import { BillsManager } from '@/components/accounts/BillsManager';
import { ExportManager } from '@/components/dashboard/ExportManager';
import { PageHeader } from '@/components/ui/PageHeader';

const DEFAULT_WIDGETS = [
  'STAT_NETWORTH', 'STAT_INCOME', 'STAT_EXPENSE', 'STAT_PROJECTED',
  'PENDING_PAYMENTS', 'RECENT_TRANSACTIONS'
];



type ViewType = 'dashboard' | 'transactions' | 'bills' | 'cards' | 'accounts' | 'goals' | 'reports' | 'debts' | 'simulator' | 'categories' | 'export';

export default function Index() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentView = (searchParams.get('view') as ViewType) || 'dashboard';

  const setCurrentView = (view: ViewType) => {
    setSearchParams({ view });
  };
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);



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
    getCategoryExpenses,
    setEmergencyMonths,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addAccount,
    updateAccount,
    deleteAccount,
    addCreditCard,
    updateCreditCard,
    deleteCreditCard,
    addDebt,
    updateDebt,
    deleteDebt,
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    depositToGoal,
    categories,
    transferBetweenAccounts,
    loading,
    totalPendingOutflows,
    viewDate
  } = useFinanceStore();

  const isMobile = useIsMobile();

  const { cashflow } = useDashboardMetrics(viewDate, currentMonthTransactions);
  const { data: accountsData = [] } = useAccounts();

  const totalNetWorth = accountsData.reduce((sum, acc) => sum + Number(acc.balance), 0);
  const projectedBalance = totalNetWorth - totalPendingOutflows;

  const emergencyData = useEmergencyFund(currentMonthTransactions);
  const categoryExpenses = getCategoryExpenses();

  const handleEditTransaction = (item: Transaction) => {
    setEditingTransaction(item);
    setShowTransactionForm(true);
  };

  const handleToggleSidebar = (expanded: boolean) => {
    setIsExpanded(expanded);
    localStorage.setItem('sidebar-expanded', JSON.stringify(expanded));
  };

  const WIDGET_CATALOG: { [key: string]: { name: string, component: React.ReactNode } } = {
    STAT_NETWORTH: {
      name: 'Resumo: Patrimônio Total',
      component: (
        <StatCard title="Patrimônio Total" value={totalNetWorth} icon={<Wallet className="w-5 h-5" />} variant={totalNetWorth >= 0 ? 'positive' : 'negative'} />
      )
    },
    STAT_INCOME: {
      name: 'Resumo: Receitas',
      component: (
        <StatCard title="Receitas" value={cashflow.totalIncome} icon={<TrendingUp className="w-4 h-4 text-success" />} variant="positive" />
      )
    },
    STAT_EXPENSE: {
      name: 'Resumo: Despesas',
      component: (
        <StatCard title="Despesas" value={cashflow.totalExpenses} icon={<TrendingDown className="w-4 h-4 text-danger" />} variant="negative" />
      )
    },
    STAT_PROJECTED: {
      name: 'Resumo: Saldo Projetado',
      component: (
        <StatCard title="Saldo Projetado" value={projectedBalance} icon={<PiggyBank className="w-5 h-5" />} variant={projectedBalance >= 0 ? 'positive' : 'negative'} subtitle="Incluindo saídas pendentes" />
      )
    },
    EXPENSE_CHART: {
      name: 'Distribuição por Categorias',
      component: (
        <ExpenseChart data={categoryExpenses.reduce((acc, curr) => ({ ...acc, [curr.name]: curr.value }), {} as Record<string, number>)} />
      )
    },
    EMERGENCY_RESERVE: {
      name: 'Reserva de Emergência',
      component: (
        <EmergencyReserve data={emergencyData} onMonthsChange={setEmergencyMonths} accounts={accounts} onTransfer={(from, to, amount, desc) => { transferBetweenAccounts(from, to, amount, desc, todayLocalString()); return Promise.resolve(); }} />
      )
    },
    PENDING_PAYMENTS: {
      name: 'Pagamentos Pendentes',
      component: (
        <PendingPayments transactions={currentMonthTransactions} accounts={accounts} creditCards={creditCards} />
      )
    },
    RECENT_TRANSACTIONS: {
      name: 'Extrato Recente',
      component: (
        <RecentTransactions transactions={currentMonthTransactions} accounts={accounts} creditCards={creditCards} />
      )
    }
  };

  const navItemsMobile = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Painel' },
    { id: 'transactions', icon: ArrowUpDown, label: 'Lançamentos' },
    { id: 'bills', icon: Receipt, label: 'Contas Fixas' },
    { id: 'cards', icon: CardIcon, label: 'Cartões' },
    { id: 'accounts', icon: Wallet, label: 'Carteira' },
    { id: 'goals', icon: Target, label: 'Metas' },
    { id: 'debts', icon: TrendingDown, label: 'Acordos' },
    { id: 'reports', icon: LineChart, label: 'Relatórios' },
    { id: 'categories', icon: Settings2, label: 'Categorias' },
    { id: 'export', icon: Database, label: 'Dados' },
    { id: 'simulator', icon: Calculator, label: 'Simulador' },
  ];

  const MobileDashboard = () => (
    <div className="space-y-6 px-4 py-4">
      {/* Resumo em Bloco 2x2 */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Patrimônio" value={totalNetWorth} icon={<Wallet className="w-4 h-4" />} variant={totalNetWorth >= 0 ? 'positive' : 'negative'} isCompact />
        <StatCard title="Projetado" value={projectedBalance} icon={<PiggyBank className="w-4 h-4" />} variant={projectedBalance >= 0 ? 'positive' : 'negative'} isCompact />
        <StatCard title="Receitas" value={cashflow.totalIncome} icon={<TrendingUp className="w-4 h-4" />} variant="positive" isCompact />
        <StatCard title="Despesas" value={cashflow.totalExpenses} icon={<TrendingDown className="w-4 h-4" />} variant="negative" isCompact />
      </div>

      <div className="space-y-6 pb-20">
        {WIDGET_CATALOG.PENDING_PAYMENTS.component}
        <div className="w-full">
          {WIDGET_CATALOG.RECENT_TRANSACTIONS.component}
        </div>
      </div>
    </div>
  );

  const DesktopDashboard = () => (
    <div className="space-y-6">
      <PageHeader title="Fluxo" icon={Home}>
        <div className="flex items-center gap-2">
          <MonthSelector />
          <Button onClick={() => { setEditingTransaction(undefined); setShowTransactionForm(true); }} className="gap-2 rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
            <Plus className="w-4 h-4" /> Novo Lançamento
          </Button>
        </div>
      </PageHeader>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {DEFAULT_WIDGETS.map(id => (
          <div key={id} className={cn(
            "w-full h-full",
            id === 'RECENT_TRANSACTIONS' && "md:col-span-2 lg:col-span-3",
            (id === 'EXPENSE_CHART' || id === 'EXPENSE_EVOLUTION') && "md:col-span-2 lg:col-span-2"
          )}>
            {WIDGET_CATALOG[id].component}
          </div>
        ))}
      </div>
    </div>
  );

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return isMobile ? <MobileDashboard /> : <DesktopDashboard />;

      case 'transactions':
        return (
          <div className="space-y-6 animate-fade-in px-4 py-4">
            <PageHeader title="Lançamentos" icon={ArrowUpDown}>
              <div className="flex items-center gap-3">
                <MonthSelector />
                <Button
                  onClick={() => { setEditingTransaction(undefined); setShowTransactionForm(true); }}
                  className="hidden md:flex gap-2 rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                >
                  <Plus className="w-4 h-4" /> Nova Transação
                </Button>
              </div>
            </PageHeader>
            <TransactionList
              transactions={currentMonthTransactions}
              allowSettlement={false}
              onEdit={handleEditTransaction}
              onPayBill={async (transaction: Transaction) => {
                await updateTransaction(transaction.id, { isPaid: true }, undefined, undefined, transaction.cardId);
              }}
            />
          </div>
        );

      case 'bills':
        return <BillsManager />;

      case 'cards':
        return <CardsDashboard />;

      case 'accounts':
        return (
          <div className="space-y-6 animate-fade-in px-4 py-4">
            <AccountsManager
              accounts={accounts}
              onAddAccount={addAccount}
              onUpdateAccount={(id, updates) => updateAccount(id, updates)}
              onDeleteAccount={deleteAccount}
            />
          </div>
        );

      case 'goals':
        return (
          <div className="space-y-6 animate-fade-in px-4 py-4">
            <PageHeader title="Metas" icon={Target}>
              <Button onClick={() => setShowGoalForm(true)} className="gap-2 rounded-xl">
                <Plus className="w-4 h-4" /> Nova Meta
              </Button>
            </PageHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savingsGoals.map(goal => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  accounts={accounts}
                  onDelete={() => deleteSavingsGoal(goal.id)}
                  onUpdate={(id, updates) => updateSavingsGoal(id, updates)}
                  onDeposit={depositToGoal}
                />
              ))}
            </div>
          </div>
        );

      case 'reports':
        return (
          <div className="px-4 py-4 animate-fade-in">
            <ReportsDashboard />
          </div>
        );

      case 'debts':
        return (
          <div className="px-4 py-4 animate-fade-in">
            <PageHeader title="Acordos" icon={TrendingDown} />
            <DebtsManager
              debts={debts}
              onAddDebt={addDebt}
              onUpdateDebt={(id, updates) => updateDebt(id, updates)}
              onDeleteDebt={deleteDebt}
            />
          </div>
        );

      case 'simulator':
        return (
          <div className="px-4 py-4 animate-fade-in min-h-[80dvh]">
            <WhatIfSimulator
              totalIncome={cashflow.totalIncome}
              totalExpenses={cashflow.totalExpenses}
              categoryExpenses={categoryExpenses.reduce((acc, curr) => ({ ...acc, [curr.name]: curr.value }), {} as Record<string, number>)}
            />
          </div>
        );

      case 'categories':
        return (
          <div className="px-4 py-4 animate-fade-in">
            <CategoriesManager />
          </div>
        );

      case 'export':
        return (
          <div className="px-4 py-4 animate-fade-in">
            <ExportManager />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground overflow-x-hidden">
      <div className={cn(
        "hidden md:flex flex-col border-r border-border bg-card/50 backdrop-blur-xl fixed left-0 top-0 h-full z-40 transition-all duration-300 ease-in-out",
        isExpanded ? "w-64" : "w-20"
      )}>
        <NavigationRail
          currentView={currentView}
          onNavigate={(view: any) => setCurrentView(view)}
          isExpanded={isExpanded}
          onToggle={handleToggleSidebar}
        />
      </div>

      <div className="md:hidden fixed top-0 left-0 right-0 h-14 flex items-center px-4 bg-background/80 backdrop-blur-md border-b z-40">
        <Sheet>
          <SheetTrigger asChild>
            <button className="p-2 rounded-xl hover:bg-muted text-foreground transition-colors">
              <Menu className="w-6 h-6" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[85%] max-w-[300px] p-0 border-r border-border bg-card">
            <SheetHeader className="p-6 border-b border-border text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
                  <span className="text-primary-foreground font-bold text-lg">F</span>
                </div>
                <SheetTitle className="font-bold text-xl tracking-tight text-primary font-mono lowercase">Fluxo</SheetTitle>
              </div>
            </SheetHeader>
            <div className="flex flex-col gap-1 p-4 overflow-y-auto h-[calc(100dvh-100px)]">
              {navItemsMobile.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <SheetClose asChild key={item.id}>
                    <button
                      onClick={() => { setCurrentView(item.id as any); }}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 text-left w-full",
                        isActive ? "bg-primary-light text-primary font-bold shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon className={cn("w-5 h-5", isActive && "text-primary")} />
                      <span className="text-sm">{item.label}</span>
                    </button>
                  </SheetClose>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
        <div className="flex-1 flex justify-center mr-10">
          <span className="font-bold text-lg tracking-tight text-primary font-mono lowercase">Fluxo</span>
        </div>
      </div>

      <main className={cn(
        "flex-1 transition-all duration-300 ease-in-out px-0 md:px-4 pt-16 md:pt-6 pb-32 md:p-8 w-full max-w-7xl mx-auto overflow-x-hidden",
        isExpanded && !isMobile ? "md:pl-72" : "md:pl-28"
      )}>
        {renderView()}
      </main>

      {/* Floating Action Button (FAB) - Mobile Only */}
      {isMobile && (currentView === 'dashboard' || currentView === 'transactions') && (
        <Button
          onClick={() => { setEditingTransaction(undefined); setShowTransactionForm(true); }}
          className="fixed bottom-24 right-4 w-14 h-14 rounded-full shadow-2xl bg-primary text-white z-50 hover:scale-110 active:scale-95 transition-all flex items-center justify-center p-0 border border-white/20"
        >
          <Plus className="w-6 h-6" />
        </Button>
      )}

      {/* Bottom Navigation - Mobile Only */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-xl border-t border-border z-50 px-8 py-3 flex items-center justify-between pb-8">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={cn("flex flex-col items-center gap-1.5 transition-all", currentView === 'dashboard' ? "text-primary px-3" : "text-muted-foreground")}
          >
            <Home className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Início</span>
          </button>
          <button
            onClick={() => setCurrentView('transactions')}
            className={cn("flex flex-col items-center gap-1.5 transition-all", currentView === 'transactions' ? "text-primary px-3" : "text-muted-foreground")}
          >
            <List className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Lançamentos</span>
          </button>
          <button
            onClick={() => setCurrentView('accounts')}
            className={cn("flex flex-col items-center gap-1.5 transition-all", currentView === 'accounts' ? "text-primary px-3" : "text-muted-foreground")}
          >
            <CardIcon className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Carteira</span>
          </button>
          <button
            onClick={() => setCurrentView('goals')}
            className={cn("flex flex-col items-center gap-1.5 transition-all", currentView === 'goals' ? "text-primary px-3" : "text-muted-foreground")}
          >
            <Target className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Metas</span>
          </button>
        </div>
      )}

      {showTransactionForm && (
        <TransactionForm
          accounts={accounts}
          creditCards={creditCards}
          initialData={editingTransaction}
          onSubmit={(data, _customInstallments, applyScope) => {
            if (editingTransaction) {
              updateTransaction(
                editingTransaction.id,
                data,
                data.cardClosingDay,
                data.cardDueDay,
                editingTransaction.cardId,
                applyScope
              );
            } else {
              addTransaction(data);
            }
            setShowTransactionForm(false);
            setEditingTransaction(undefined);
          }}
          onClose={() => {
            setShowTransactionForm(false);
            setEditingTransaction(undefined);
          }}
          onDelete={(id, scope) => {
            if (editingTransaction) {
              deleteTransaction(editingTransaction, scope);
            }
            setShowTransactionForm(false);
            setEditingTransaction(undefined);
          }}
        />
      )}

      {showGoalForm && (
        <GoalForm
          onSubmit={(data) => {
            if (editingGoal) {
              updateSavingsGoal(editingGoal.id, data);
            } else {
              addSavingsGoal(data);
            }
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
