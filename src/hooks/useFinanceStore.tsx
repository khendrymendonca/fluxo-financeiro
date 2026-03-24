import { useState, useMemo, createContext, useContext, useCallback } from 'react';
import { FilterMode, Transaction, Bill, Account, SavingsGoal, Debt, CreditCard } from '@/types/finance';
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
  useUpdateTransaction,
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
import { useBudgetRule } from './useBudgetCoach';
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
  const updateTransactionMutation = useUpdateTransaction();
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
  const updateCardMutation_REAL = useUpdateCreditCard();
  const deleteCardMutation = useDeleteCreditCard();

  const addGoalMutation = useAddGoal();
  const updateGoalMutation = useUpdateGoal();
  const deleteGoalMutation = useDeleteGoal();
  const depositGoalMutation = useDepositToGoal();

  const addDebtMutation = useAddDebt();
  const updateDebtMutation = useUpdateDebt();
  const deleteDebtMutation = useDeleteDebt();
  const { data: budgetRule } = useBudgetRule();

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
    const realBills = rawBills.filter(b => {
      if (b.isVirtual) return false;
      const bDate = parseLocalDate(b.dueDate);
      if (viewMode === 'day') return bDate.getDate() === viewDate.getDate() && bDate.getMonth() === viewDate.getMonth() && bDate.getFullYear() === viewDate.getFullYear();
      return bDate.getMonth() === viewDate.getMonth() && bDate.getFullYear() === viewDate.getFullYear();
    });

    const filteredVirtual = projectedBills.filter(v => {
      if (!v.isVirtual) return false;
      return !realBills.some(r =>
        r.originalBillId === v.originalBillId ||
        (r.name === v.name && Math.abs(Number(r.amount) - Number(v.amount)) < 0.01)
      );
    });

    return [...realBills, ...filteredVirtual].sort(
      (a, b) => parseLocalDate(a.dueDate).getTime() - parseLocalDate(b.dueDate).getTime()
    );
  }, [rawBills, projectedBills, viewDate, viewMode]);

  const totalBalance = useMemo(() => accounts.reduce((sum, acc) => sum + Number(acc.balance), 0), [accounts]);
  const totalIncome = useMemo(() => currentMonthTransactions.filter(t => t.type === 'income' && t.isPaid).reduce((s, t) => s + Number(t.amount), 0), [currentMonthTransactions]);
  const totalExpenses = useMemo(() => currentMonthTransactions.filter(t => t.type === 'expense' && t.isPaid && !t.isInvoicePayment).reduce((s, t) => s + Number(t.amount), 0), [currentMonthTransactions]);

  const totalPendingOutflows = useMemo(() => {
    return currentMonthTransactions
      .filter(t => !t.isPaid && t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0) +
      currentMonthBills
        .filter(b => b.status === 'pending' && b.type === 'payable')
        .reduce((sum, b) => sum + Number(b.amount), 0);
  }, [currentMonthTransactions, currentMonthBills]);

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
    budgetRule,
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
    totalPendingOutflows,
    currentMonthTransactions,
    currentMonthBills,
    nextMonth,
    prevMonth,
    nextDay,
    prevDay,
    setEmergencyMonths,
    getPeriodStartBalance,

    addTransaction: addTransactionMutation.mutateAsync,
    updateTransaction: (id: string, updates: Partial<Transaction>, cardClosingDay?: number, cardDueDay?: number, currentCardId?: string | null) =>
      updateTransactionMutation.mutateAsync({ id, updates, cardClosingDay, cardDueDay, currentCardId } as any),
    deleteTransaction: (id: string, scope: 'this' | 'future' | 'all' = 'this') =>
      deleteTransactionMutation.mutateAsync({ id, applyScope: scope }),
    togglePaid: togglePaidMutation.mutateAsync,

    addAccount: addAccountMutation.mutateAsync,
    updateAccount: (id: string, updates: Partial<Account>) => updateAccountMutation.mutateAsync({ id, updates }),
    deleteAccount: deleteAccountMutation.mutateAsync,
    transferBetweenAccounts: (from: string, to: string, amount: number, desc: string, date: string, toType: 'account' | 'card' = 'account') =>
      transferMutation.mutateAsync({ fromAccountId: from, [toType === 'account' ? 'toAccountId' : 'toCardId']: to, amount: Number(amount), description: desc, date } as any),

    addCreditCard: addCardMutation.mutateAsync,
    updateCreditCard: (id: string, updates: Partial<CreditCard>) => updateCardMutation_REAL.mutateAsync({ id, updates }),
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
    createDebtWithInstallments: async (debt: Omit<Debt, 'id' | 'userId'>, firstPaymentDate: string) => {
      const [newDebt] = await addDebtMutation.mutateAsync(debt);
      if (!newDebt) return;
      const numInstallments = Math.ceil(debt.totalAmount / debt.monthlyPayment);
      const baseDate = parseLocalDate(firstPaymentDate);
      for (let i = 0; i < numInstallments; i++) {
        const currentDate = addMonths(baseDate, i);
        const installmentAmount = i === numInstallments - 1
          ? debt.totalAmount - (debt.monthlyPayment * (numInstallments - 1))
          : debt.monthlyPayment;
        if (installmentAmount <= 0) continue;
        await addTransactionMutation.mutateAsync({
          type: 'expense',
          transactionType: 'installment',
          description: `${debt.name} (${i + 1}/${numInstallments})`,
          amount: installmentAmount,
          date: format(currentDate, 'yyyy-MM-dd'),
          debtId: newDebt.id,
          installmentNumber: i + 1,
          installmentTotal: numInstallments,
          isPaid: false,
          userId: newDebt.user_id
        } as any);
      }
    },

    getAccountViewBalance: (id: string) => accounts.find(a => a.id === id)?.balance || 0,
    getCardExpenses: (id: string) => {
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
      // Limite usado = despesas no cartão que NÃO são pagamentos da fatura
      // Ignoramos a flag isPaid aqui para evitar o bug do limite zerado
      return transactions
        .filter(t =>
          t.cardId === id &&
          t.type === 'expense' &&
          !t.isInvoicePayment
        )
        .reduce((acc, t) => acc + Number(t.amount), 0);
    }
  };
}


