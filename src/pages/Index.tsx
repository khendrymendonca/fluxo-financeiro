import { useState } from 'react';
import { Plus, Wallet, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';
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
import RGL, { Layout } from 'react-grid-layout';
// @ts-ignore
const WidthProvider = RGL.WidthProvider;
// @ts-ignore
const Responsive = RGL.Responsive;

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Settings2, Save, RotateCcw, X } from 'lucide-react';

const ResponsiveGridLayout = WidthProvider(Responsive);

const DEFAULT_WIDGETS = [
  'STAT_NETWORTH', 'STAT_INCOME', 'STAT_EXPENSE', 'STAT_PROJECTED',
  'EXPENSE_CHART', 'EMERGENCY_RESERVE', 'PENDING_PAYMENTS', 'GOAL_PROGRESS',
  'ACCOUNTS_OVERVIEW', 'EXPENSE_EVOLUTION', 'RECENT_TRANSACTIONS'
];

const INITIAL_LAYOUTS: any = {
  lg: [
    { i: 'STAT_NETWORTH', x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'STAT_INCOME', x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'STAT_EXPENSE', x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'STAT_PROJECTED', x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'EXPENSE_CHART', x: 0, y: 2, w: 6, h: 5, minW: 4, minH: 4 },
    { i: 'EMERGENCY_RESERVE', x: 6, y: 2, w: 3, h: 5, minW: 2, minH: 4 },
    { i: 'PENDING_PAYMENTS', x: 9, y: 2, w: 3, h: 5, minW: 2, minH: 4 },
    { i: 'GOAL_PROGRESS', x: 0, y: 7, w: 3, h: 5, minW: 2, minH: 4 },
    { i: 'ACCOUNTS_OVERVIEW', x: 3, y: 7, w: 3, h: 5, minW: 2, minH: 4 },
    { i: 'EXPENSE_EVOLUTION', x: 6, y: 7, w: 6, h: 5, minW: 4, minH: 4 },
    { i: 'RECENT_TRANSACTIONS', x: 0, y: 12, w: 12, h: 8, minW: 6, minH: 4 },
  ]
};

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

  const [activeWidgets, setActiveWidgets] = useState<string[]>(() => {
    const saved = localStorage.getItem('active-dashboard-widgets');
    return saved ? JSON.parse(saved) : DEFAULT_WIDGETS;
  });

  const [layouts, setLayouts] = useState(() => {
    const saved = localStorage.getItem('dashboard-layout-v2');
    return saved ? JSON.parse(saved) : INITIAL_LAYOUTS;
  });

  const [isEditingLayout, setIsEditingLayout] = useState(false);

  const saveLayout = (currentLayout: Layout[], allLayouts: { [key: string]: Layout[] }) => {
    setLayouts(allLayouts);
    localStorage.setItem('dashboard-layout-v2', JSON.stringify(allLayouts));
  };

  const removeWidget = (id: string) => {
    const nextWidgets = activeWidgets.filter(w => w !== id);
    setActiveWidgets(nextWidgets);
    localStorage.setItem('active-dashboard-widgets', JSON.stringify(nextWidgets));
  };

  const addWidget = (id: string) => {
    if (activeWidgets.includes(id)) return;
    const nextWidgets = [...activeWidgets, id];
    setActiveWidgets(nextWidgets);
    localStorage.setItem('active-dashboard-widgets', JSON.stringify(nextWidgets));
  };

  const resetLayout = () => {
    setLayouts(INITIAL_LAYOUTS);
    setActiveWidgets(DEFAULT_WIDGETS);
    localStorage.removeItem('dashboard-layout-v2');
    localStorage.removeItem('active-dashboard-widgets');
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

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <div className="space-y-6 animate-fade-in relative">
            {/* Header / Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-primary font-mono lowercase">Fluxo</h1>
                <p className="text-muted-foreground mt-1">Bem-vindo ao seu painel financeiro.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <MonthSelector />
                <div className="flex bg-muted p-1 rounded-xl">
                  <Button variant={isEditingLayout ? "secondary" : "ghost"} size="sm" onClick={() => setIsEditingLayout(!isEditingLayout)} className="rounded-lg h-9 px-3 gap-2">
                    <Settings2 className="w-3.5 h-3.5" /> {isEditingLayout ? 'Modo Visualizar' : 'Customizar'}
                  </Button>
                  {isEditingLayout && (
                    <Button variant="ghost" size="sm" onClick={resetLayout} className="rounded-lg h-9 px-3 text-danger hover:bg-danger/10">
                      <RotateCcw className="w-3.5 h-3.5 mr-1" /> Resetar
                    </Button>
                  )}
                </div>
                <Button onClick={() => { setEditingTransaction(undefined); setShowTransactionForm(true); }} className="gap-2 rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                  <Plus className="w-4 h-4" /> Novo Lançamento
                </Button>
              </div>
            </div>

            {/* Editor Bar */}
            {isEditingLayout && (
              <div className="bg-primary/5 border-2 border-primary/20 p-4 rounded-2xl animate-in slide-in-from-top-2 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black uppercase tracking-widest text-primary">Catálogo de Painéis</span>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(WIDGET_CATALOG).filter(id => !activeWidgets.includes(id)).map(id => (
                      <Button key={id} variant="outline" size="sm" onClick={() => addWidget(id)} className="rounded-full text-[10px] font-bold h-7 border-primary/30 text-primary">
                        + {WIDGET_CATALOG[id].name}
                      </Button>
                    ))}
                    {Object.keys(WIDGET_CATALOG).every(id => activeWidgets.includes(id)) && (
                      <span className="text-[10px] italic text-muted-foreground">Todos os painéis já estão na tela.</span>
                    )}
                  </div>
                </div>
                <Button size="sm" onClick={() => setIsEditingLayout(false)} className="bg-success hover:bg-success/90 rounded-xl h-8 text-[10px] font-black uppercase tracking-widest">
                  <Save className="w-3.5 h-3.5 mr-2" /> Salvar Layout
                </Button>
              </div>
            )}

            {/* Grid de Widgets */}
            <div className={cn("dashboard-grid", isEditingLayout && "is-editing")}>
              <ResponsiveGridLayout
                className="layout"
                layouts={layouts}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                rowHeight={30}
                draggableHandle=".widget-drag-handle"
                isDraggable={isEditingLayout}
                isResizable={isEditingLayout}
                margin={[16, 16]}
                onLayoutChange={saveLayout}
              >
                {activeWidgets.map(id => (
                  <div key={id} className={cn("group relative", isEditingLayout ? "cursor-move" : "")}>
                    {/* Alça de Arrastar e Botão Remover (apenas no modo edição) */}
                    {isEditingLayout && (
                      <div className="absolute inset-x-0 top-0 z-30 h-10 flex items-center justify-between px-3 pointer-events-none">
                        <div className="widget-drag-handle flex-1 h-full cursor-move pointer-events-auto" />
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); removeWidget(id); }}
                          className="w-7 h-7 rounded-full shadow-lg pointer-events-auto hover:scale-110 active:scale-95"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}

                    {/* Placeholder visual durante edição */}
                    {isEditingLayout && (
                      <div className="absolute inset-0 border-2 border-dashed border-primary/20 rounded-2xl group-hover:border-primary/40 pointer-events-none transition-colors" />
                    )}

                    <div className="w-full h-full">
                      {WIDGET_CATALOG[id].component}
                    </div>
                  </div>
                ))}
              </ResponsiveGridLayout>
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
        isExpanded ? "md:pl-72" : "md:pl-28"
      )}>
        {renderView()}
      </main>

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
