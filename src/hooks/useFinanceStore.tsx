import { useState, useMemo, createContext, useContext, useCallback } from 'react';
import { FilterMode, Transaction, Bill } from '@/types/finance';
import { addMonths, subMonths, format } from 'date-fns';
import { 
  useAccounts, 
  useTransactions, 
  useBills, 
  useCreditCards, 
  useCategories, 
  useSubcategories, 
  useCategoryGroups, 
  useDebts, 
  useSavingsGoals
} from './useFinanceQueries';
import { useProjectedTransactions } from './useProjectedTransactions';
import { useProjectedBills } from './useProjectedBills';
import { 
  useAddTransaction, 
  useDeleteTransaction, 
  useToggleTransactionPaid 
} from './useTransactionMutations';
import { 
  useAddAccount, 
  useUpdateAccount, 
  useDeleteAccount, 
  useTransferBetweenAccounts 
} from './useAccountMutations';
import { 
  useAddBill, 
  useUpdateBill, 
  useDeleteBill, 
  usePayBill 
} from './useBillMutations';
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

  // --- Data Queries (TanStack Query) ---
  const { data: accounts = [], isLoading: loadingAccounts } = useAccounts();
  const { data: rawTransactions = [], isLoading: loadingTxs } = useTransactions(viewDate);
  const { data: rawBills = [], isLoading: loadingBills } = useBills(viewDate);
  const { data: creditCards = [] } = useCreditCards();
  const { data: categories = [] } = useCategories();
  const { data: subcategories = [] } = useSubcategories();
  const { data: categoryGroups = [] } = useCategoryGroups();
  const { data: debts = [] } = useDebts();
  const { data: savingsGoals = [] } = useSavingsGoals();

  // --- Projections ---
  const transactions = useProjectedTransactions(rawTransactions, viewDate);
  const projectedBills = useProjectedBills(rawBills, viewDate);

  // --- Mutations ---
  const addTransactionMutation = useAddTransaction();
  const deleteTransactionMutation = useDeleteTransaction();
  const togglePaidMutation = useToggleTransactionPaid();
  
  const addAccountMutation = useAddAccount();
  const updateAccountMutation = useUpdateAccount();
  const deleteAccountMutation = useDeleteAccount();
  const transferMutation = useTransferBetweenAccounts();

  const addBillMutation = useAddBill();
  const updateBillMutation = useUpdateBill();
  const deleteBillMutation = useDeleteBill();
  const payBillMutation = usePayBill();

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

  // --- Navigation ---
  const nextMonth = useCallback(() => setViewDate(prev => addMonths(prev, 1)), []);
  const prevMonth = useCallback(() => setViewDate(prev => subMonths(prev, 1)), []);
  const nextDay = useCallback(() => setViewDate(prev => { const d = new Date(prev); d.setDate(d.getDate() + 1); return d; }), []);
  const prevDay = useCallback(() => setViewDate(prev => { const d = new Date(prev); d.setDate(d.getDate() - 1); return d; }), []);
  
  // --- Computed ---
  const currentMonthTransactions = useMemo(() => {
    return transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate.getMonth() === viewDate.getMonth() && tDate.getFullYear() === viewDate.getFullYear();
    });
  }, [transactions, viewDate]);

  const currentMonthBills = useMemo(() => {
    return projectedBills.filter(b => {
      const bDate = new Date(b.dueDate);
      if (viewMode === 'day') return bDate.getDate() === viewDate.getDate() && bDate.getMonth() === viewDate.getMonth() && bDate.getFullYear() === viewDate.getFullYear();
      return bDate.getMonth() === viewDate.getMonth() && bDate.getFullYear() === viewDate.getFullYear();
    }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [projectedBills, viewDate, viewMode]);

  const totalBalance = useMemo(() => accounts.reduce((sum, acc) => sum + Number(acc.balance), 0), [accounts]);
  const totalIncome = useMemo(() => currentMonthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0), [currentMonthTransactions]);
  const totalExpenses = useMemo(() => currentMonthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0), [currentMonthTransactions]);

  const setEmergencyMonths = useCallback((m: number) => {
    localStorage.setItem('emergencyMonths', String(m));
    setEmergencyMonthsLocal(m);
  }, []);

  return {
    transactions,
    accounts,
    creditCards,
    debts,
    savingsGoals,
    categories,
    subcategories,
    categoryGroups,
    bills: projectedBills,
    habits: [],
    habitLogs: [],
    emergencyMonths,
    loading: loadingAccounts || loadingTxs || loadingBills,
    viewDate,
    viewMode,
    setViewDate,
    setViewMode,
    totalBalance,
    totalIncome,
    totalExpenses,
    currentMonthTransactions,
    currentMonthBills,
    nextMonth,
    prevMonth,
    nextDay,
    prevDay,
    setEmergencyMonths,
    
    // Mutations exposed as direct functions for UI compatibility
    addTransaction: addTransactionMutation.mutateAsync,
    deleteTransaction: deleteTransactionMutation.mutateAsync,
    togglePaid: togglePaidMutation.mutateAsync,
    
    addAccount: addAccountMutation.mutateAsync,
    updateAccount: updateAccountMutation.mutateAsync,
    deleteAccount: deleteAccountMutation.mutateAsync,
    transferBetweenAccounts: transferMutation.mutateAsync,
    
    addBill: addBillMutation.mutateAsync,
    updateBill: updateBillMutation.mutateAsync,
    deleteBill: deleteBillMutation.mutateAsync,
    payBill: (bill: Bill, accountId?: string, paymentDate?: string, isPartial?: boolean, partialAmount?: number, cardId?: string) => 
      payBillMutation.mutateAsync({ bill, accountId, paymentDate, isPartial, partialAmount, cardId }),
    
    addCreditCard: addCardMutation.mutateAsync,
    updateCreditCard: updateCardMutation.mutateAsync,
    deleteCreditCard: deleteCardMutation.mutateAsync,
    
    addSavingsGoal: addGoalMutation.mutateAsync,
    updateSavingsGoal: updateGoalMutation.mutateAsync,
    deleteSavingsGoal: deleteGoalMutation.mutateAsync,
    depositToGoal: depositGoalMutation.mutateAsync,
    
    addDebt: addDebtMutation.mutateAsync,
    updateDebt: updateDebtMutation.mutateAsync,
    deleteDebt: deleteDebtMutation.mutateAsync,

    // Placeholders or helpers needed by UI
    fetchInitialData: async () => {},
    getTransactionTargetDate: (t: Transaction) => new Date(t.date),
    getEmergencyFundData: () => ({ monthlyFixed: 0, targetAmount: 0, currentAmount: 0, progress: 0, months: emergencyMonths, reserveAccounts: [] }),
    seedCoach: async () => {},
    createDebtWithInstallments: async () => {}
  };
}
