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

type ViewType = 'dashboard' | 'transactions' | 'cards' | 'accounts' | 'goals' | 'reports' | 'debts' | 'simulator';

export default function Index() {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);

  const {
    transactions,
    accounts,
    creditCards,
    debts,
    savingsGoals,
    totalBalance,
    totalIncome,
    totalExpenses,
    currentMonthTransactions,
    getCardExpenses,
    getCategoryExpenses,
    addTransaction,
    deleteTransaction,
    addAccount,
    deleteAccount,
    addCreditCard,
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

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Olá! 👋</h1>
                <p className="text-muted-foreground">Aqui está seu resumo financeiro</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">
                  {new Date().toLocaleDateString('pt-BR', {
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Saldo Total"
                value={totalBalance}
                subtitle="Em todas as contas"
                icon={<Wallet className="w-5 h-5" />}
                variant="neutral"
              />
              <StatCard
                title="Receitas do Mês"
                value={totalIncome}
                subtitle="Entradas"
                icon={<TrendingUp className="w-5 h-5" />}
                variant="positive"
              />
              <StatCard
                title="Despesas do Mês"
                value={totalExpenses}
                subtitle="Saídas"
                icon={<TrendingDown className="w-5 h-5" />}
                variant="negative"
              />
              <StatCard
                title="Balanço Mensal"
                value={balance}
                subtitle={balance >= 0 ? "Você está no verde! 🎉" : "Atenção aos gastos"}
                icon={<PiggyBank className="w-5 h-5" />}
                variant={balance >= 0 ? "positive" : "negative"}
              />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ExpenseChart data={categoryExpenses} />
              <BalanceEvolutionChart transactions={currentMonthTransactions} />
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <RecentTransactions transactions={transactions} />
              <GoalProgress goals={savingsGoals} />
              <AccountsOverview
                accounts={accounts}
                creditCards={creditCards}
                getCardExpenses={getCardExpenses}
              />
            </div>
          </div>
        );

      case 'transactions':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Lançamentos</h1>
                <p className="text-muted-foreground">Gerencie suas receitas e despesas</p>
              </div>
            </div>
            <TransactionList
              transactions={transactions}
              onDelete={deleteTransaction}
            />
          </div>
        );

      case 'accounts':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold">Contas e Cartões</h1>
              <p className="text-muted-foreground">Gerencie suas contas bancárias e cartões</p>
            </div>
            <AccountsManager
              accounts={accounts}
              creditCards={creditCards}
              getCardExpenses={getCardExpenses}
              onAddAccount={addAccount}
              onDeleteAccount={deleteAccount}
              onAddCard={addCreditCard}
              onDeleteCard={deleteCreditCard}
            />
          </div>
        );

      case 'goals':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Metas de Economia</h1>
                <p className="text-muted-foreground">Acompanhe seu progresso</p>
              </div>
              <button
                onClick={() => setShowGoalForm(true)}
                className="px-4 py-2 rounded-xl bg-info text-info-foreground font-medium hover:bg-info/90 transition-colors"
              >
                <Plus className="w-4 h-4 inline mr-2" />
                Nova Meta
              </button>
            </div>

            {savingsGoals.length === 0 ? (
              <div className="card-elevated p-12 text-center">
                <PiggyBank className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma meta criada</h3>
                <p className="text-muted-foreground mb-4">
                  Comece a economizar definindo suas metas financeiras
                </p>
                <button
                  onClick={() => setShowGoalForm(true)}
                  className="px-6 py-3 rounded-xl bg-info text-info-foreground font-medium hover:bg-info/90 transition-colors"
                >
                  Criar Primeira Meta
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {savingsGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onUpdate={updateSavingsGoal}
                    onDelete={deleteSavingsGoal}
                  />
                ))}
              </div>
            )}
          </div>
        );

      case 'reports':
        return <ReportsDashboard />;

      case 'debts':
        return (
          <div className="space-y-6">
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
          <div className="space-y-6">
            <WhatIfSimulator
              totalIncome={totalIncome}
              totalExpenses={totalExpenses}
              categoryExpenses={categoryExpenses}
            />
          </div>
        );

      case 'cards':
        return <CardsDashboard />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Navigation Rail */}
      <NavigationRail currentView={currentView} onNavigate={(view) => setCurrentView(view as ViewType)} />

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          {renderView()}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNav currentView={currentView} onNavigate={(view) => setCurrentView(view as ViewType)} />

      {/* Floating Action Button */}
      <button
        onClick={() => setShowTransactionForm(true)}
        className="fab"
        aria-label="Novo lançamento"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Transaction Form Modal */}
      {showTransactionForm && (
        <TransactionForm
          accounts={accounts}
          creditCards={creditCards}
          onSubmit={addTransaction}
          onClose={() => setShowTransactionForm(false)}
        />
      )}

      {/* Goal Form Modal */}
      {showGoalForm && (
        <GoalForm
          onSubmit={addSavingsGoal}
          onClose={() => setShowGoalForm(false)}
        />
      )}
    </div>
  );
}
