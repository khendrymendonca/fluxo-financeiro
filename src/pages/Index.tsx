// UTF-8 Integrity Check
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/useIsMobile';
import {
  Home,
  List,
  CreditCard as CardIcon,
  Plus,
  Menu,
  Settings2,
  Database,
  Eye,
  EyeOff,
  History,
  BarChart3,
  Sun,
  Moon,
  Zap,
  Rocket,
  Shield,
  Receipt,
  Wallet,
  Calculator,
  Rabbit,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatureFlag, useIsSuperAdmin, useGlobalFlag } from '@/hooks/useFeatureFlags';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { useTheme } from '@/hooks/useTheme';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { useEmergencyFund } from '@/hooks/useEmergencyFund';
import { todayLocalString, parseLocalDate } from '@/utils/dateUtils';
import { formatCurrency } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';
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
import ProjectionPage from './ProjectionPage';
import MonthPlanPage from './MonthPlanPage';
import { Button } from '@/components/ui/button';
import { Transaction, SavingsGoal } from '@/types/finance';
import { CategoriesManager } from '@/components/settings/CategoriesManager';
import { ProfileSettings } from './ProfileSettings';
import { PageHeader } from '@/components/ui/PageHeader';
import { toast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FloatingNavMenu } from '@/components/layout/FloatingNavMenu';
import EmergencyFund from './EmergencyFund';
import { BillsManager } from '@/components/accounts/BillsManager';
import { HealthScore } from '@/components/dashboard/HealthScore';
import { MonthSelector } from '@/components/dashboard/MonthSelector';
import { ExportManager } from '@/components/dashboard/ExportManager';
import {
  Tooltip,
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

type ViewType = 'dashboard' | 'transactions' | 'bills' | 'cards' | 'accounts' | 'goals' | 'reports' | 'debts' | 'simulator' | 'categories' | 'export' | 'emergency' | 'menu' | 'profile' | 'projection';

// Mapa de views que requerem feature flag
const PROTECTED_VIEWS: Record<string, string> = {
  transactions: 'transactions',
  bills: 'accounts',
  accounts: 'accounts',
  cards: 'cards_dashboard',
  goals: 'goals_manager',
  debts: 'debts_manager',
  emergency: 'emergency_fund',
  reports: 'reports_dashboard',
  simulator: 'simulator',
  projection: 'reports_dashboard',
  export: 'export_data',
};

function ViewGuard({
  view,
  children,
}: {
  view: string;
  children: ReactNode;
}) {
  const featureKey = PROTECTED_VIEWS[view];
  const isEnabled = useFeatureFlag(featureKey ?? '');

  // Se não tem feature key associada (ex: dashboard, profile), sempre libera
  if (!featureKey) return <>{children}</>;

  if (!isEnabled) {
    // Redirecionar para dashboard
    return <Navigate to="/?view=dashboard" replace />;
  }

  return <>{children}</>;
}

export default function Index() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const handleRefreshData = useCallback(() => {
    queryClient.invalidateQueries();
    window.location.reload();
  }, [queryClient]);

  const currentView = (searchParams.get('view') as ViewType) || 'dashboard';
  const viewMode = (searchParams.get('mode') as 'day' | 'month' | 'year' | 'all') || 'month';

  const setCurrentView = (view: ViewType) => {
    setSearchParams({ view, mode: viewMode });
  };

  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);

  const [isExpanded, setIsExpanded] = useState(true);

  const { theme, setTheme } = useTheme();
  const { accentColor, setAccentColor } = useThemeColor();
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | undefined>(undefined);
  const [initialFormTab, setInitialFormTab] = useState<'pontual' | 'transfer' | undefined>(undefined);

  const {
    accounts,
    creditCards,
    debts,
    savingsGoals,
    categories,
    transactions, // Usar a lista total para widgets analíticos
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
    togglePaid,
    depositToGoal,
    totalPendingOutflows,
    viewDate
  } = useFinanceStore();

  const { cashflow, categoryExpenses } = useDashboardMetrics(viewDate, currentMonthTransactions);
  const { ...emergencyData } = useEmergencyFund(currentMonthTransactions);
  const isMobile = useIsMobile();
  const isSuperAdmin = useIsSuperAdmin();
  const easterEnabled = useGlobalFlag('theme_easter');

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

  const handleCopyTransaction = useCallback((item: Transaction) => {
    // 🛡️ REGRA DE NEGÓCIO: Ao copiar, removemos o ID para que seja um novo lançamento
    const { id, ...transactionData } = item;
    setEditingTransaction(transactionData as Transaction);
    setShowTransactionForm(true);
  }, []);

  const handleUndoPayment = useCallback(async (item: Transaction) => {
    await togglePaid({ id: item.id, isPaid: false, isChild: !!item.originalId });
    toast({ title: "Pagamento estornado com sucesso." });
  }, [togglePaid]);

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
    { id: 'transactions', icon: List, label: 'Lançamentos', featureKey: 'transactions' },
    { id: 'cards', icon: CardIcon, label: 'Cartões', featureKey: 'cards_dashboard' },
    { id: 'bills', icon: Receipt, label: 'Gestão de Contas', featureKey: 'accounts' },
    { id: 'accounts', icon: Wallet, label: 'Minhas Contas (Carteira)', featureKey: 'accounts' },
    { id: 'emergency', icon: Shield, label: 'Reserva de Emergência', featureKey: 'emergency_fund' },
    { id: 'goals', icon: Rocket, label: 'Sonhos & Projetos', featureKey: 'goals_manager' },
    { id: 'debts', icon: History, label: 'Acordos', featureKey: 'debts_manager' },
    { id: 'reports', icon: BarChart3, label: 'Relatórios', featureKey: 'reports_dashboard' },
    { id: 'categories', icon: Settings2, label: 'Categorias' },
    { id: 'simulator', icon: Calculator, label: 'Simulador', featureKey: 'simulator' },
    { id: 'export', icon: Database, label: 'Exportar', featureKey: 'export_data' },
    { id: 'profile', icon: Settings2, label: 'Ajustes de Perfil' },
  ];

  function NavItemGuard({
    item,
    children,
  }: {
    item: { featureKey?: string };
    children: ReactNode;
  }) {
    const isEnabled = useFeatureFlag(item.featureKey ?? '');
    if (item.featureKey && !isEnabled) return null;
    return <>{children}</>;
  }

  function SuperAdminLink({ onNavigate }: { onNavigate: () => void }) {
    const isSuperAdmin = useIsSuperAdmin();
    const navigate = useNavigate();

    if (!isSuperAdmin) return null;

    return (
      <button
        onClick={() => {
          navigate('/super');
          onNavigate();
        }}
        className="w-full flex items-center gap-4 px-6 py-4 text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-gray-50 dark:hover:bg-zinc-900 transition-all border-t border-gray-100 dark:border-zinc-900 mt-2"
      >
        <Shield className="w-5 h-5 text-primary" />
        <span>Super</span>
      </button>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <MonthPlanPage
            isBalanceVisible={isBalanceVisible}
            onRefreshData={handleRefreshData}
            onOpenTransactionForm={() => {
              setEditingTransaction(undefined);
              setInitialFormTab(undefined);
              setShowTransactionForm(true);
            }}
            onOpenTransferForm={() => {
              setEditingTransaction(undefined);
              setInitialFormTab('transfer');
              setShowTransactionForm(true);
            }}
            onNavigateToBills={() => setCurrentView('bills')}
            onNavigateToTransactions={() => setCurrentView('transactions')}
          />
        );
      case 'transactions':
        return (
          <ViewGuard view="transactions">
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
                transactions={currentMonthTransactions.filter(t =>
                  t.isPaid ||
                  (t.cardId && !t.isInvoicePayment && !t.isVirtual && !t.originalId)
                )}
                onEdit={handleEditTransaction}
                onCopy={handleCopyTransaction}
                onUndoPayment={handleUndoPayment}
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
          </ViewGuard>
        );
      case 'goals':
        return (
          <ViewGuard view="goals">
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
          </ViewGuard>
        );
      case 'debts':
        return (
          <ViewGuard view="debts">
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
          </ViewGuard>
        );
      case 'simulator':
        return (
          <ViewGuard view="simulator">
            <div className="w-full">
              <WhatIfSimulator
                totalIncome={cashflow.totalIncome}
                totalExpenses={cashflow.totalExpenses}
                categoryExpenses={Object.fromEntries(categoryExpenses.map(c => [c.name, c.value]))}
              />
            </div>
          </ViewGuard>
        );
      case 'categories':
        return <div className="max-w-2xl mx-auto"><CategoriesManager /></div>;
      case 'reports':
        return (
          <ViewGuard view="reports">
            <ReportsDashboard />
          </ViewGuard>
        );
      case 'cards':
        return (
          <ViewGuard view="cards">
            <div className="w-full"><CardsDashboard /></div>
          </ViewGuard>
        );
      case 'accounts':
        return (
          <ViewGuard view="accounts">
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
          </ViewGuard>
        );
      case 'bills':
        return (
          <ViewGuard view="bills">
            <BillsManager />
          </ViewGuard>
        );
      case 'emergency':
        return (
          <ViewGuard view="emergency">
            <EmergencyFund />
          </ViewGuard>
        );
      case 'export':
        return (
          <ViewGuard view="export">
            <ExportManager />
          </ViewGuard>
        );
      case 'profile':
        return <ProfileSettings />;
      case 'projection':
        return (
          <ViewGuard view="projection">
            <ProjectionPage />
          </ViewGuard>
        );
      default:
        return <div className="text-center py-20 text-zinc-500 italic">Em breve...</div>;
    }
  };

  return (
    <AppLayout
      sidebar={
        <NavigationRail
          currentView={currentView}
          onNavigate={(v) => setCurrentView(v as ViewType)}
        />
      }
      headerMobile={
        <div className="flex items-center justify-between w-full">
          {/* Lado esquerdo: Home + Drawer */}
          <div className="flex items-center gap-1">
            {/* Botão Home — volta para dashboard */}
            {currentView !== 'dashboard' && (
              <button
                onClick={() => setCurrentView('dashboard')}
                className="p-2 rounded-xl text-zinc-500 hover:text-primary hover:bg-primary/5 transition-all"
                aria-label="Voltar para início"
              >
                <Home className="w-5 h-5" />
              </button>
            )}
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
                      <SheetTitle className="text-sm font-bold flex items-center gap-2">
                        {userName}
                        {accentColor === 'pascoa' && <Rabbit className="w-4 h-4 text-primary" />}
                      </SheetTitle>
                      <SheetDescription className="text-xs uppercase font-black tracking-widest text-zinc-500">
                        {accentColor === 'pascoa' ? '🐰 Feliz Páscoa!' : 'Menu Principal'}
                      </SheetDescription>
                    </div>
                  </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto py-4 space-y-1 no-scrollbar">
                  {navigationItems.map((item) => (
                    <NavItemGuard key={item.id} item={item}>
                      <button
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
                    </NavItemGuard>
                  ))}

                  {/* Link Super Admin */}
                  <NavItemGuard item={{ featureKey: undefined }}>
                    <SuperAdminLink onNavigate={() => setIsDrawerOpen(false)} />
                  </NavItemGuard>
                </div>

                <div className="mt-auto border-t border-gray-100 dark:border-zinc-900 p-6 space-y-6">
                  {easterEnabled && (
                    <div className="space-y-4">
                      <p className="text-xs uppercase font-black tracking-widest text-zinc-500">Temas Especiais</p>
                      <button
                        onClick={() => setAccentColor(accentColor === 'pascoa' ? 'teal' : 'pascoa')}
                        className={cn(
                          "w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all",
                          accentColor === 'pascoa' ? "bg-primary/10 border-primary text-primary" : "bg-gray-50 dark:bg-zinc-900 border-transparent text-zinc-500"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Rabbit className="w-5 h-5" />
                          <span className="text-sm font-bold">Modo Páscoa</span>
                        </div>
                        {accentColor === 'pascoa' && <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
                      </button>
                    </div>
                  )}

                  <div>
                    <p className="text-xs uppercase font-black tracking-widest text-zinc-500 mb-4">Aparência</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[{ id: 'light', icon: Sun, label: 'Claro' }, { id: 'dark', icon: Moon, label: 'Escuro' }, { id: 'amoled', icon: Zap, label: 'AMOLED' }]
                        .filter(t => isMobile || t.id !== 'amoled')
                        .map((t) => (
                          <button
                            key={t.id}
                            onClick={() => setTheme(t.id as any)}
                            className={cn(
                              "flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all",
                              theme === t.id ? "bg-primary/10 border-primary text-primary" : "bg-gray-50 dark:bg-zinc-900 border-transparent text-zinc-500"
                            )}
                          >
                            <t.icon className="w-4 h-4" />
                            <span className="text-[11px] font-bold">{t.label}</span>
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Lado direito: Avatar + toggle de visibilidade de saldo */}
          <div className="flex items-center gap-3">
            {isSuperAdmin && (
              <button
                onClick={() => navigate('/super')}
                className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                aria-label="Painel Super"
              >
                <Shield className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-gray-100 dark:bg-zinc-900 text-gray-500 dark:text-zinc-400 font-bold text-xs">{userInitials}</AvatarFallback>
              </Avatar>
              <p className="font-bold text-sm">{userName}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsBalanceVisible(!isBalanceVisible)}>
              {isBalanceVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      }
      bottomNav={null}
      fab={
        <>
          {/* FAB de navegação semicircular */}
          <FloatingNavMenu
            activeView={currentView}
            onNavigate={(v) => setCurrentView(v as ViewType)}
          />

          {/* FAB de adicionar transação — só nas views de extrato/dashboard */}
          {['dashboard', 'transactions'].includes(currentView) && (
            <button
              onClick={() => {
                setEditingTransaction(undefined);
                setShowTransactionForm(true);
              }}
              className={cn(
                'fixed bottom-24 right-4 z-50 md:hidden',
                'w-12 h-12 rounded-full',
                'bg-primary text-primary-foreground',
                'shadow-xl shadow-primary/30',
                'flex items-center justify-center',
                'active:scale-95 transition-all duration-200'
              )}
              aria-label="Novo lançamento"
            >
              <Plus className="w-6 h-6" />
            </button>
          )}
        </>
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
            // 🛡️ REGRA DE NEGÓCIO: 
            // 1. Se for VIRTUAL, estamos materializando uma conta fixa/parcelada em um registro real. (INSERT)
            // 2. Se houver um ID real (não virtual), é uma edição de registro existente. (UPDATE)
            // 3. Se não houver ID, é uma nova transação simples ou cópia. (INSERT)
            if (editingTransaction?.isVirtual) {
              await addTransaction({
                ...tx,
                originalId: editingTransaction.originalId || editingTransaction.id.split('-virtual')[0]
              } as any);
            } else if (editingTransaction && editingTransaction.id) {
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
            if (editingTransaction && editingTransaction.id) deleteTransaction(editingTransaction, scope);
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
          key={editingGoal?.id || 'new'}
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

