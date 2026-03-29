import { useState, useMemo, createContext, useContext, useCallback } from 'react';
import { FilterMode, Transaction, Account, SavingsGoal, Debt, CreditCard } from '@/types/finance';
import { addMonths, subMonths, format } from 'date-fns';
import {
  useAccounts,
  useTransactions,
  useCreditCards,
  useCategories,
  useSubcategories,
  useCategoryGroups,
  useDebts,
  useSavingsGoals
} from './useFinanceQueries';
import { useProjectedTransactions } from './useProjectedTransactions';
import {
  useAddTransaction,
  useDeleteTransaction,
  useUpdateTransaction,
  useToggleTransactionPaid,
  useBulkDeleteTransactions
} from './useTransactionMutations';
import {
  useAddAccount,
  useUpdateAccount,
  useDeleteAccount,
  useTransferBetweenAccounts
} from './useAccountMutations';
import {
  useAddCreditCard,
  useUpdateCreditCard,
  useDeleteCreditCard
} from './useCreditCardMutations';
import {
  useAddGoal,
  useUpdateGoal,
  useDeleteGoal,
  useDepositToGoal
} from './useGoalMutations';
import {
  useAddDebt,
  useUpdateDebt,
  useDeleteDebt
} from './useDebtMutations';
import { parseLocalDate } from '@/utils/dateUtils';

export type FinanceContextData = ReturnType<typeof useFinanceProvider>;

const FinanceContext = createContext<FinanceContextData | undefined>(undefined);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const data = useFinanceProvider();
  return <FinanceContext.Provider value={data}> {children} </FinanceContext.Provider>;
}

export function useFinanceStore() {
  const context = useContext(FinanceContext);
  if (context === undefined) {
    throw new Error('useFinanceStore must be used within a FinanceProvider');
  }
  return context;
}

function useFinanceProvider() {
  // --- UI State ---
  const [viewDate, setViewDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<FilterMode>('month');
  const [emergencyMonths, setEmergencyMonthsLocal] = useState(Number(localStorage.getItem('emergencyMonths')) || 12);

  // Selection State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // --- Data Queries (TanStack Query) ---
  const { data: accounts = [], isLoading: loadingAccounts } = useAccounts();
  const { data: rawTransactions = [], isLoading: loadingTxs } = useTransactions(viewDate);
  const { data: creditCards = [] } = useCreditCards();
  const { data: categories = [] } = useCategories();
  const { data: subcategories = [] } = useSubcategories();
  const { data: categoryGroups = [] } = useCategoryGroups();
  const { data: debts = [] } = useDebts();
  const { data: savingsGoals = [] } = useSavingsGoals();

  // --- Projections ---
  const transactions = useProjectedTransactions(rawTransactions, viewDate);

  // --- Mutations ---
  const addTransactionMutation = useAddTransaction();
  const updateTransactionMutation = useUpdateTransaction();
  const deleteTransactionMutation = useDeleteTransaction();
  const togglePaidMutation = useToggleTransactionPaid();
  const bulkDeleteMutation = useBulkDeleteTransactions();

  const addAccountMutation = useAddAccount();
  const updateAccountMutation = useUpdateAccount();
  const deleteAccountMutation = useDeleteAccount();
  const transferMutation = useTransferBetweenAccounts();

  const addCardMutation = useAddCreditCard();
  const updateCardMutation = useUpdateCreditCard();
  const deleteCardMutation = useDeleteCreditCard();

  const addGoalMutation = useAddGoal();
  const updateGoalMutation = useUpdateGoal();
  const deleteGoalMutation = useDeleteGoal();
  const depositGoalMutation = useDepositToGoal();

  const addDebtMutation = useAddDebt();
  const updateDebtMutation = useUpdateDebt();
  const deleteDebtMutation = useDeleteDebt();

  // --- Selection Methods ---
  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode(prev => {
      if (prev) setSelectedIds(new Set());
      return !prev;
    });
  }, []);

  const toggleSelectId = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  // --- Navigation ---
  const nextMonth = useCallback(() => setViewDate(prev => addMonths(prev, 1)), []);
  const prevMonth = useCallback(() => setViewDate(prev => subMonths(prev, 1)), []);
  const nextDay = useCallback(() => setViewDate(prev => { const d = new Date(prev); d.setDate(d.getDate() + 1); return d; }), []);
  const prevDay = useCallback(() => setViewDate(prev => { const d = new Date(prev); d.setDate(d.getDate() - 1); return d; }), []);
  const nextYear = useCallback(() => setViewDate(prev => { const d = new Date(prev); d.setFullYear(d.getFullYear() + 1); return d; }), []);
  const prevYear = useCallback(() => setViewDate(prev => { const d = new Date(prev); d.setFullYear(d.getFullYear() - 1); return d; }), []);

  // --- Computed ---
  const currentMonthTransactions = useMemo(() => {
    if (viewMode === 'all') return transactions;
    return transactions.filter(t => {
      const tDate = new Date(t.date);
      if (viewMode === 'day') {
        return tDate.getDate() === viewDate.getDate() && tDate.getMonth() === viewDate.getMonth() && tDate.getFullYear() === viewDate.getFullYear();
      }
      if (viewMode === 'year') {
        return tDate.getFullYear() === viewDate.getFullYear();
      }
      return tDate.getMonth() === viewDate.getMonth() && tDate.getFullYear() === viewDate.getFullYear();
    });
  }, [transactions, viewDate, viewMode]);

  const totalBalance = useMemo(() => accounts.reduce((sum, acc) => sum + Number(acc.balance), 0), [accounts]);
  const totalIncome = useMemo(() => currentMonthTransactions.filter(t => t.type === 'income' && t.isPaid).reduce((s, t) => s + Number(t.amount), 0), [currentMonthTransactions]);
  const totalExpenses = useMemo(() => currentMonthTransactions.filter(t => t.type === 'expense' && t.isPaid && !t.isInvoicePayment).reduce((s, t) => s + Number(t.amount), 0), [currentMonthTransactions]);

  const totalPendingOutflows = useMemo(() => {
    return currentMonthTransactions
      .filter(t => !t.isPaid && t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);
  }, [currentMonthTransactions]);

  const setEmergencyMonths = useCallback((m: number) => {
    localStorage.setItem('emergencyMonths', String(m));
    setEmergencyMonthsLocal(m);
  }, []);

  const getPeriodStartBalance = useCallback(() => {
    const currentTotal = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const adjustments = rawTransactions
      .filter(t => {
        const tDate = parseLocalDate(t.date);
        return t.isPaid && tDate >= viewDate && tDate <= today;
      })
      .reduce((acc, t) => t.type === 'income' ? acc - Number(t.amount) : acc + Number(t.amount), 0);

    return currentTotal + adjustments;
  }, [accounts, rawTransactions, viewDate]);

  return {
    transactions,
    accounts,
    creditCards,
    debts,
    savingsGoals,
    categories,
    subcategories,
    categoryGroups,
    emergencyMonths,
    loading: loadingAccounts || loadingTxs,
    viewDate,
    viewMode,
    setViewDate,
    setViewMode,
    totalBalance,
    totalIncome,
    totalExpenses,
    totalPendingOutflows,
    currentMonthTransactions,
    nextMonth,
    prevMonth,
    nextDay,
    prevDay,
    nextYear,
    prevYear,
    setEmergencyMonths,
    getPeriodStartBalance,

    // Selection
    isSelectionMode,
    selectedIds,
    toggleSelectionMode,
    toggleSelectId,
    clearSelection,
    selectAll,

    addTransaction: addTransactionMutation.mutateAsync,
    updateTransaction: (id: string, updates: Partial<Transaction>, cardClosingDay?: number, cardDueDay?: number, currentCardId?: string | null, applyScope?: 'this' | 'future' | 'all') =>
      updateTransactionMutation.mutateAsync({ id, updates, cardClosingDay, cardDueDay, currentCardId, applyScope } as any),
    deleteTransaction: (transaction: Transaction, scope: 'this' | 'future' | 'all' = 'this') =>
      deleteTransactionMutation.mutateAsync({ transaction, applyScope: scope }),
    togglePaid: togglePaidMutation.mutateAsync,
    bulkDeleteTransactions: bulkDeleteMutation.mutateAsync,

    isDeletingTransaction: deleteTransactionMutation.isPending,
    isBulkDeleting: bulkDeleteMutation.isPending,

    addAccount: addAccountMutation.mutateAsync,
    updateAccount: (id: string, updates: Partial<Account>) => updateAccountMutation.mutateAsync({ id, updates }),
    deleteAccount: deleteAccountMutation.mutateAsync,
    transferBetweenAccounts: (from: string, to: string, amount: number, desc: string, date: string, toType: 'account' | 'card' = 'account') =>
      transferMutation.mutateAsync({ from, to, amount: Number(amount), description: desc, date, type: toType } as any),

    addCreditCard: addCardMutation.mutateAsync,
    updateCreditCard: (id: string, updates: Partial<CreditCard>) => updateCardMutation.mutateAsync({ id, updates }),
    deleteCreditCard: deleteCardMutation.mutateAsync,

    addSavingsGoal: addGoalMutation.mutateAsync,
    updateSavingsGoal: (id: string, updates: Partial<SavingsGoal>) => updateGoalMutation.mutateAsync({ id, updates }),
    deleteSavingsGoal: deleteGoalMutation.mutateAsync,
    depositToGoal: (goalId: string, amount: number, accountId: string) => depositGoalMutation.mutateAsync({ id: goalId, amount, accountId, goalName: '' }),

    addDebt: addDebtMutation.mutateAsync,
    updateDebt: (id: string, updates: Partial<Debt>) => updateDebtMutation.mutateAsync({ id, updates }),
    deleteDebt: deleteDebtMutation.mutateAsync,

    fetchInitialData: async () => { },
    getTransactionTargetDate: (t: Transaction) => new Date(t.date),
    getEmergencyFundData: () => ({ monthlyFixed: 0, targetAmount: 0, currentAmount: 0, progress: 0, months: emergencyMonths, reserveAccounts: [] }),
    seedCoach: async () => { },

    getAccountViewBalance: (id: string) => accounts.find(a => a.id === id)?.balance || 0,
    getCardExpenses: (id: string) => {
      if (viewMode === 'all') {
        return transactions.filter(t => t.cardId === id && t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
      }
      const viewDateStr = format(viewDate, 'yyyy-MM');
      return transactions.filter(t => t.cardId === id && t.type === 'expense' && t.invoiceMonthYear === viewDateStr).reduce((acc, t) => acc + Number(t.amount), 0);
    },
    getCategoryExpenses: () => {
      const categoryMap = new Map<string, number>();
      currentMonthTransactions.filter(t => t.type === 'expense').forEach(t => {
        const cat = categories.find(c => c.id === t.categoryId);
        const name = cat?.name || 'Sem Categoria';
        categoryMap.set(name, (categoryMap.get(name) || 0) + Number(t.amount));
      });
      return Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    },
    getCardUsedLimit: (id: string) => {
      return transactions
        .filter(t =>
          t.cardId === id &&
          t.type === 'expense' &&
          !t.isInvoicePayment &&
          !t.isPaid && // âœ… Apenas transações não pagas consomem limite
          !t.deleted_at
        )
        .reduce((acc, t) => acc + Number(t.amount), 0);
    }
  };
}
