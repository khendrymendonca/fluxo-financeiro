import { useState } from 'react';
import { Plus, Wallet, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { useAccounts } from '@/hooks/useFinanceQueries';
import { useEmergencyFund } from '@/hooks/useEmergencyFund';
import { parseLocalDate, todayLocalString, toLocalDateString } from '@/utils/dateUtils';
import { formatCurrency } from '@/utils/formatters';
import { usePayBill, useDeleteBill } from '@/hooks/useBillMutations';
import { useSeedCoach } from '@/hooks/useBudgetCoach';
import { NavigationRail } from '@/components/layout/NavigationRail';
import { MobileNav } from '@/components/layout/MobileNav';
import { StatCard } from '@/components/dashboard/StatCard';
import { ExpenseChart } from '@/components/dashboard/ExpenseChart';
import { BalanceEvolutionChart } from '@/components/dashboard/BalanceEvolutionChart';
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
import { Button } from '@/components/ui/button';
import { Transaction, SavingsGoal } from '@/types/finance';
import { PendingPayments } from '@/components/dashboard/PendingPayments';
import { EmergencyReserve } from '@/components/dashboard/EmergencyReserve';
import { BudgetCoach } from '@/components/coach/BudgetCoach';
import { HabitTracker } from '@/components/coach/HabitTracker';
import { BillsManager } from '@/components/coach/BillsManager';
import { CategoriesManager } from '@/components/coach/CategoriesManager';
import { SmartInsights } from '@/components/coach/SmartInsights';
import { ExportManager } from '@/components/dashboard/ExportManager';
import { AccountEvolution } from '@/components/dashboard/AccountEvolution';
import { cn } from '@/lib/utils';

type ViewType = 'dashboard' | 'transactions' | 'cards' | 'accounts' | 'goals' | 'reports' | 'debts' | 'simulator' | 'bills' | 'categories' | 'export';

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
    getCardExpenses,
    getCategoryExpenses,
    getEmergencyFundData,
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
    currentMonthBills,
    transferBetweenAccounts,
    seedCoach,
    loading,
    totalPendingOutflows,
    viewDate
  } = useFinanceStore();

  const { cashflow } = useDashboardMetrics(viewDate, currentMonthTransactions);
  const { data: accountsData = [] } = useAccounts();

  const { mutateAsync: payBill } = usePayBill();
  const { mutateAsync: deleteBill } = useDeleteBill();

  const totalNetWorth = accountsData.reduce((sum, acc) => sum + Number(acc.balance), 0);
  const projectedBalance = totalNetWorth - totalPendingOutflows;

  const { mutate: seedCoachAction } = useSeedCoach();
  const emergencyData = useEmergencyFund(currentMonthTransactions);

  // ✅ FIX: renomeado para periodBalance para não confundir com viewBalance
  const periodBalance = cashflow.totalIncome - cashflow.totalExpenses;
  const categoryExpenses = getCategoryExpenses();

  const showCoachOnboarding = !loading && categories.length === 0;

  // ✅ FIX: removido bloco silencioso de bills — TransactionList já trata bills diretamente
  const handleEditTransaction = (item: Transaction) => {
    setEditingTransaction(item);
    setShowTransactionForm(true);
  };

  const handleToggleSidebar = (expanded: boolean) => {
    setIsExpanded(expanded);
    localStorage.setItem('sidebar-expanded', JSON.stringify(expanded));
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-primary font-mono lowercase">Fluxo</h1>
                <p className="text-muted-foreground mt-1">Bem-vindo ao seu painel financeiro.</p>
              </div>
              <div className="flex items-center gap-3">
                <MonthSelector />
                <Button
                  onClick={() => { setEditingTransaction(undefined); setShowTransactionForm(true); }}
                  className="gap-2 rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                >
                  <Plus className="w-4 h-4" /> Novo Lançamento
                </Button>
              </div>
            </div>

            {showCoachOnboarding && (
              <div className="bg-primary/10 border border-primary/20 rounded-3xl p-8 mb-6 animate-scale-in text-center space-y-4">
                <div className="bg-primary/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">Bem-vindo ao Coach Financeiro!</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Para começar a usar a regra 50-30-20 e ter inteligência sobre seus gastos,
                  precisamos configurar suas categorias iniciais.
                </p>
                <Button onClick={() => seedCoachAction()} className="rounded-xl px-8 py-6 text-lg h-auto shadow-xl shadow-primary/20">
                  Ativar Coach Agora
                </Button>
              </div>
            )}

            <SmartInsights onNavigate={(view) => setCurrentView(view as ViewType)} />

            {/* Dashboard Cards Gerais */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                title="Patrimônio Total"
                value={totalNetWorth}
                icon={<Wallet className="w-5 h-5" />}
                variant={totalNetWorth >= 0 ? 'positive' : 'negative'}
              />
              <StatCard
                title="Receitas"
                value={cashflow.totalIncome}
                icon={<TrendingUp className="w-4 h-4 text-success" />}
                variant="positive"
              />
              <StatCard
                title="Despesas"
                value={cashflow.totalExpenses}
                icon={<TrendingDown className="w-4 h-4 text-danger" />}
                variant="negative"
              />
              {/* ✅ FIX: usa periodBalance no lugar de balance */}
              <StatCard
                title="Saldo Projetado"
                value={projectedBalance}
                icon={<PiggyBank className="w-5 h-5" />}
                variant={projectedBalance >= 0 ? 'positive' : 'negative'}
                subtitle="Considerando saídas pendentes"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <BudgetCoach />
              <ExpenseChart
                data={categoryExpenses.reduce((acc, curr) => ({ ...acc, [curr.name]: curr.value }), {} as Record<string, number>)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <EmergencyReserve
                data={emergencyData}
                onMonthsChange={setEmergencyMonths}
                accounts={accounts}
                onTransfer={(from, to, amount, desc) => {
                  transferBetweenAccounts(from, to, amount, desc, todayLocalString());
                  return Promise.resolve();
                }}
              />
              <PendingPayments
                transactions={currentMonthTransactions}
                accounts={accounts}
                creditCards={creditCards}
              />
              <GoalProgress goals={savingsGoals} />
              <AccountsOverview
                accounts={accounts}
                creditCards={creditCards}
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <AccountEvolution />
              <RecentTransactions
                transactions={currentMonthTransactions}
                accounts={accounts}
                creditCards={creditCards}
              />
            </div>
          </div>
        );

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
              bills={currentMonthBills}
              onEdit={handleEditTransaction}
              onPayBill={async (bill, accountId, paymentDate, isPartial, partialAmount, cardId) => {
                await payBill({ bill, accountId, paymentDate, isPartial, partialAmount, cardId })
              }}
              onDeleteBill={(id) => deleteBill(id)}
            />
          </div>
        );

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

      case 'bills':
        return <BillsManager />;

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
        isExpanded ? "md:pl-72" : "md:pl-28"
      )}>
        {renderView()}
      </main>

      {showTransactionForm && (
        <TransactionForm
          accounts={accounts}
          creditCards={creditCards}
          initialData={editingTransaction}
          onSubmit={(data, custom, applyScope) => {
            if (editingTransaction) {
              updateTransaction(
                editingTransaction.id,
                data
              );
            } else {
              // Custom handling se necessário, mas addTransaction aceita 1 obj
              addTransaction(data as Omit<Transaction, 'id' | 'userId'>);
            }
            setShowTransactionForm(false);
            setEditingTransaction(undefined);
          }}
          onClose={() => {
            setShowTransactionForm(false);
            setEditingTransaction(undefined);
          }}
          onDelete={(id, scope) => {
            deleteTransaction(id, scope === 'future');
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
