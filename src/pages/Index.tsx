import { useState } from 'react';
import { Plus, Wallet, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';
import { useFinanceStore } from '@/hooks/useFinanceStore';
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

type ViewType = 'dashboard' | 'transactions' | 'cards' | 'accounts' | 'goals' | 'reports' | 'debts' | 'simulator';

export default function Index() {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);

  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | undefined>(undefined);

  const {
    accounts,
    creditCards,
    debts,
    savingsGoals,
    totalIncome,
    totalExpenses,
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
  } = useFinanceStore();

  const balance = totalIncome - totalExpenses;
  const categoryExpenses = getCategoryExpenses();
  const emergencyData = getEmergencyFundData();

  const handleEditTransaction = (tx: Transaction) => {
    setEditingTransaction(tx);
    setShowTransactionForm(true);
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <div className="space-y-6 animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-primary font-mono lowercase">Fluxo</h1>
                <p className="text-muted-foreground mt-1">Bem-vindo ao seu painel financeiro.</p>
              </div>
              <div className="flex items-center gap-3">
                <MonthSelector />
                <Button onClick={() => { setEditingTransaction(undefined); setShowTransactionForm(true); }} className="gap-2 rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                  <Plus className="w-4 h-4" /> Novo Lançamento
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard
                title="Balanço Mensal"
                value={balance}
                icon={<Wallet className="w-6 h-6" />}
                variant={balance >= 0 ? 'positive' : 'negative'}
              />
              <StatCard
                title="Receitas"
                value={totalIncome}
                icon={<TrendingUp className="w-6 h-6 text-success" />}
                variant="positive"
              />
              <StatCard
                title="Despesas"
                value={totalExpenses}
                icon={<TrendingDown className="w-6 h-6 text-danger" />}
                variant="negative"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ExpenseChart data={categoryExpenses} />
              <BalanceEvolutionChart transactions={currentMonthTransactions} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <EmergencyReserve data={emergencyData} onMonthsChange={setEmergencyMonths} />
                  <PendingPayments
                    transactions={currentMonthTransactions}
                    accounts={accounts}
                    creditCards={creditCards}
                  />
                </div>
                <RecentTransactions
                  transactions={currentMonthTransactions}
                  accounts={accounts}
                  creditCards={creditCards}
                />
              </div>
              <div className="space-y-6">
                <GoalProgress goals={savingsGoals} />
                <AccountsOverview
                  accounts={accounts}
                  creditCards={creditCards}
                  getCardExpenses={getCardExpenses}
                />
              </div>
            </div>
          </div>
        );

      case 'transactions':
        return (
          <div className="space-y-6 animate-fade-in pb-20">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Lançamentos</h1>
                <p className="text-muted-foreground mt-1">Gerencie suas receitas e despesas.</p>
              </div>
              <Button onClick={() => { setEditingTransaction(undefined); setShowTransactionForm(true); }} className="gap-2 rounded-xl">
                <Plus className="w-4 h-4" /> Nova Transação
              </Button>
            </div>
            <TransactionList
              transactions={currentMonthTransactions}
              accounts={accounts}
              creditCards={creditCards}
              onDelete={deleteTransaction}
              onEdit={handleEditTransaction}
            />
          </div>
        );

      case 'cards':
        return <CardsDashboard />;

      case 'accounts':
        return (
          <div className="space-y-6 animate-fade-in pb-20">
            <AccountsManager
              accounts={accounts}
              creditCards={creditCards}
              getCardExpenses={getCardExpenses}
              onAddAccount={addAccount}
              onUpdateAccount={updateAccount}
              onDeleteAccount={deleteAccount}
              onAddCard={addCreditCard}
              onDeleteCard={deleteCreditCard}
              onUpdateCard={updateCreditCard}
            />
          </div>
        );

      case 'goals':
        return (
          <div className="space-y-6 animate-fade-in pb-20">
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
                  onEdit={(g) => { setEditingGoal(g); setShowGoalForm(true); }}
                  onDelete={() => deleteSavingsGoal(goal.id)}
                  onUpdate={(updates) => updateSavingsGoal(goal.id, updates)}
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
            totalIncome={totalIncome}
            totalExpenses={totalExpenses}
            categoryExpenses={categoryExpenses.reduce((acc, curr) => ({ ...acc, [curr.name]: curr.value }), {})}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <div className="hidden md:flex flex-col border-r border-border bg-card/50 backdrop-blur-xl fixed left-0 top-0 h-full z-40">
        <NavigationRail currentView={currentView} onViewChange={(view: any) => setCurrentView(view)} />
      </div>

      <div className="md:hidden">
        <MobileNav currentView={currentView} onViewChange={(view: any) => setCurrentView(view)} />
      </div>

      <main className="flex-1 md:pl-20 px-4 py-8 md:p-8 w-full max-w-7xl mx-auto overflow-x-hidden">
        {renderView()}
      </main>

      {showTransactionForm && (
        <TransactionForm
          accounts={accounts}
          creditCards={creditCards}
          initialData={editingTransaction}
          onSubmit={(data, custom) => {
            if (editingTransaction) {
              updateTransaction({ ...editingTransaction, ...data });
            } else {
              addTransaction(data, custom);
            }
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
