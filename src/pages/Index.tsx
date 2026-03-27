import { useState, useRef, useEffect } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Home, List, CreditCard as CardIcon, HelpCircle, LayoutDashboard, Plus, Wallet, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';
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
import { AccountsOverview } from '@/components/dashboard/AccountsOverview';
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
import { ExpenseEvolution } from '@/components/dashboard/AccountEvolution';
import { Button } from '@/components/ui/button';
import { Transaction, SavingsGoal } from '@/types/finance';
import { PendingPayments } from '@/components/dashboard/PendingPayments';
import { EmergencyReserve } from '@/components/dashboard/EmergencyReserve';
import { CategoriesManager } from '@/components/settings/CategoriesManager';
import { BillsManager } from '@/components/accounts/BillsManager';
import { ExportManager } from '@/components/dashboard/ExportManager';

const DEFAULT_WIDGETS = [
  'STAT_NETWORTH', 'STAT_INCOME', 'STAT_EXPENSE', 'STAT_PROJECTED',
  'EXPENSE_CHART', 'EMERGENCY_RESERVE', 'PENDING_PAYMENTS', 'GOAL_PROGRESS',
  'ACCOUNTS_OVERVIEW', 'EXPENSE_EVOLUTION', 'RECENT_TRANSACTIONS'
];



type ViewType = 'dashboard' | 'transactions' | 'bills' | 'cards' | 'accounts' | 'goals' | 'reports' | 'debts' | 'simulator' | 'categories' | 'export';

export default function Index() {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
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
    GOAL_PROGRESS: {
      name: 'Metas e Sonhos',
      component: (
        <GoalProgress goals={savingsGoals} />
      )
    },
    ACCOUNTS_OVERVIEW: {
      name: 'Contas & Cartões',
      component: (
        <AccountsOverview accounts={accounts} creditCards={creditCards} />
      )
    },
    EXPENSE_EVOLUTION: {
      name: 'Evolução Mensal',
      component: (
        <ExpenseEvolution />
      )
    },
    RECENT_TRANSACTIONS: {
      name: 'Extrato Recente',
      component: (
        <RecentTransactions transactions={currentMonthTransactions} accounts={accounts} creditCards={creditCards} />
      )
    }
  };

  const MobileDashboard = () => (
    <div className="space-y-6">
      {/* Resumo Compacto */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Patrimônio" value={totalNetWorth} icon={<Wallet className="w-4 h-4" />} variant={totalNetWorth >= 0 ? 'positive' : 'negative'} isCompact />
        <StatCard title="Projetado" value={projectedBalance} icon={<PiggyBank className="w-4 h-4" />} variant={projectedBalance >= 0 ? 'positive' : 'negative'} isCompact />
      </div>

      <div className="flex overflow-x-auto pb-4 -mx-4 px-4 gap-4 no-scrollbar scroll-smooth">
        <div className="min-w-[280px]">
          <StatCard title="Receitas" value={cashflow.totalIncome} icon={<TrendingUp className="w-4 h-4" />} variant="positive" isCompact />
        </div>
        <div className="min-w-[280px]">
          <StatCard title="Despesas" value={cashflow.totalExpenses} icon={<TrendingDown className="w-4 h-4" />} variant="negative" isCompact />
        </div>
      </div>

      <div className="space-y-6">
        {WIDGET_CATALOG.ACCOUNTS_OVERVIEW.component}
        {WIDGET_CATALOG.EXPENSE_EVOLUTION.component}
        {WIDGET_CATALOG.PENDING_PAYMENTS.component}
        {WIDGET_CATALOG.RECENT_TRANSACTIONS.component}
      </div>
    </div>
  );

  const DesktopDashboard = () => (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary font-mono lowercase">Fluxo</h1>
          <p className="text-muted-foreground mt-1">Bem-vindo ao seu painel financeiro.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MonthSelector />
          <Button onClick={() => { setEditingTransaction(undefined); setShowTransactionForm(true); }} className="gap-2 rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
            <Plus className="w-4 h-4" /> Novo Lançamento
          </Button>
        </div>
      </div>
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
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Lançamentos</h1>
                <p className="text-muted-foreground mt-1">Gerencie suas receitas e despesas.</p>
              </div>
              <div className="flex items-center gap-3">
                <MonthSelector />
                <Button
                  onClick={() => { setEditingTransaction(undefined); setShowTransactionForm(true); }}
                  className="gap-2 rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                >
                  <Plus className="w-4 h-4" /> Nova Transação
                </Button>
              </div>
            </div>
            <TransactionList
              transactions={currentMonthTransactions}
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
          <div className="space-y-6 animate-fade-in">
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
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Metas</h1>
                <p className="text-muted-foreground mt-1">Acompanhe seu progresso.</p>
              </div>
              <Button onClick={() => setShowGoalForm(true)} className="gap-2 rounded-xl">
                <Plus className="w-4 h-4" /> Nova Meta
              </Button>
            </div>
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
        return <ReportsDashboard />;

      case 'debts':
        return (
          <DebtsManager
            debts={debts}
            onAddDebt={addDebt}
            onUpdateDebt={(id, updates) => updateDebt(id, updates)}
            onDeleteDebt={deleteDebt}
          />
        );

      case 'simulator':
        return (
          <WhatIfSimulator
            totalIncome={cashflow.totalIncome}
            totalExpenses={cashflow.totalExpenses}
            categoryExpenses={categoryExpenses.reduce((acc, curr) => ({ ...acc, [curr.name]: curr.value }), {} as Record<string, number>)}
          />
        );

      case 'categories':
        return <CategoriesManager />;

      case 'export':
        return <ExportManager />;

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

      <div className="md:hidden">
        <MobileNav currentView={currentView} onNavigate={(view: any) => setCurrentView(view)} />
      </div>

      <main className={cn(
        "flex-1 transition-all duration-300 ease-in-out px-4 pt-6 pb-24 md:p-8 w-full max-w-7xl mx-auto overflow-x-hidden",
        isExpanded && !isMobile ? "md:pl-72" : "md:pl-28",
        isMobile && "pb-32"
      )}>
        {renderView()}
      </main>

      {/* Floating Action Button (FAB) - Mobile Only */}
      {isMobile && currentView === 'dashboard' && (
        <Button
          onClick={() => { setEditingTransaction(undefined); setShowTransactionForm(true); }}
          className="fixed bottom-24 right-6 w-14 h-14 rounded-full shadow-2xl bg-primary text-white z-50 hover:scale-110 active:scale-95 transition-all flex items-center justify-center p-0"
        >
          <Plus className="w-8 h-8" />
        </Button>
      )}

      {/* Bottom Navigation - Mobile Only */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-xl border-t border-border z-50 px-6 py-3 flex items-center justify-between pb-8">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={cn("flex flex-col items-center gap-1", currentView === 'dashboard' ? "text-primary" : "text-muted-foreground")}
          >
            <Home className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Início</span>
          </button>
          <button
            onClick={() => setCurrentView('transactions')}
            className={cn("flex flex-col items-center gap-1", currentView === 'transactions' ? "text-primary" : "text-muted-foreground")}
          >
            <List className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Lançamentos</span>
          </button>
          <button
            onClick={() => setCurrentView('accounts')}
            className={cn("flex flex-col items-center gap-1", currentView === 'accounts' ? "text-primary" : "text-muted-foreground")}
          >
            <CardIcon className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Contas</span>
          </button>
          <button
            onClick={() => setCurrentView('debts')}
            className={cn("flex flex-col items-center gap-1", currentView === 'debts' ? "text-primary" : "text-muted-foreground")}
          >
            <HelpCircle className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Dívidas</span>
          </button>
        </div>
      )}

      {showTransactionForm && (
        <TransactionForm
          accounts={accounts}
          creditCards={creditCards}
          initialData={editingTransaction}
          onSubmit={(data) => {
            if (editingTransaction) {
              updateTransaction(
                editingTransaction.id,
                data,
                data.cardClosingDay,
                data.cardDueDay,
                editingTransaction.cardId
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
