import { useState, useEffect, useCallback } from 'react';
import { FinanceState, Transaction, Account, CreditCard, Debt, SavingsGoal } from '@/types/finance';

const STORAGE_KEY = 'fluxo-finance-data';

const initialState: FinanceState = {
  transactions: [],
  accounts: [
    { id: '1', name: 'Conta Principal', bank: 'Nubank', balance: 5420.00, color: '#8B5CF6' },
    { id: '2', name: 'Poupança', bank: 'Inter', balance: 12000.00, color: '#F97316' },
  ],
  creditCards: [
    { id: '1', name: 'Nubank', bank: 'Nubank', limit: 8000, closingDay: 15, dueDay: 22, color: '#8B5CF6' },
  ],
  debts: [],
  savingsGoals: [
    { id: '1', name: 'Reserva de Emergência', targetAmount: 30000, currentAmount: 12000, color: '#10B981', icon: 'Shield' },
    { id: '2', name: 'Viagem', targetAmount: 8000, currentAmount: 2500, deadline: '2025-12-01', color: '#3B82F6', icon: 'Plane' },
  ],
};

// Demo transactions for a good first impression
const demoTransactions: Transaction[] = [
  { id: 't1', type: 'income', category: 'salary', description: 'Salário', amount: 8500, date: '2025-02-01', accountId: '1' },
  { id: 't2', type: 'income', category: 'benefits', description: 'Vale Alimentação', amount: 800, date: '2025-02-01', accountId: '1' },
  { id: 't3', type: 'expense', category: 'housing', description: 'Aluguel', amount: 2200, date: '2025-02-05', accountId: '1' },
  { id: 't4', type: 'expense', category: 'food', description: 'Supermercado', amount: 650, date: '2025-02-03', cardId: '1' },
  { id: 't5', type: 'expense', category: 'transport', description: 'Uber', amount: 180, date: '2025-02-04', cardId: '1' },
  { id: 't6', type: 'expense', category: 'subscriptions', description: 'Netflix', amount: 55.90, date: '2025-02-01', cardId: '1' },
  { id: 't7', type: 'expense', category: 'leisure', description: 'Restaurante', amount: 320, date: '2025-02-02', cardId: '1' },
  { id: 't8', type: 'expense', category: 'health', description: 'Farmácia', amount: 89.50, date: '2025-02-04', accountId: '1' },
  { id: 't9', type: 'expense', category: 'bills', description: 'Internet', amount: 120, date: '2025-02-05', accountId: '1' },
  { id: 't10', type: 'income', category: 'extras', description: 'Freelance', amount: 1500, date: '2025-01-28', accountId: '1' },
];

export function useFinanceStore() {
  const [state, setState] = useState<FinanceState>(() => {
    if (typeof window === 'undefined') return { ...initialState, transactions: demoTransactions };
    
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return { ...initialState, transactions: demoTransactions };
      }
    }
    return { ...initialState, transactions: demoTransactions };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Transactions
  const addTransaction = useCallback((transaction: Omit<Transaction, 'id'>) => {
    const newTransaction = { ...transaction, id: crypto.randomUUID() };
    setState(prev => ({
      ...prev,
      transactions: [newTransaction, ...prev.transactions],
    }));
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      transactions: prev.transactions.filter(t => t.id !== id),
    }));
  }, []);

  // Accounts
  const addAccount = useCallback((account: Omit<Account, 'id'>) => {
    const newAccount = { ...account, id: crypto.randomUUID() };
    setState(prev => ({
      ...prev,
      accounts: [...prev.accounts, newAccount],
    }));
  }, []);

  const updateAccount = useCallback((id: string, updates: Partial<Account>) => {
    setState(prev => ({
      ...prev,
      accounts: prev.accounts.map(a => a.id === id ? { ...a, ...updates } : a),
    }));
  }, []);

  const deleteAccount = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      accounts: prev.accounts.filter(a => a.id !== id),
    }));
  }, []);

  // Credit Cards
  const addCreditCard = useCallback((card: Omit<CreditCard, 'id'>) => {
    const newCard = { ...card, id: crypto.randomUUID() };
    setState(prev => ({
      ...prev,
      creditCards: [...prev.creditCards, newCard],
    }));
  }, []);

  const deleteCreditCard = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      creditCards: prev.creditCards.filter(c => c.id !== id),
    }));
  }, []);

  // Debts
  const addDebt = useCallback((debt: Omit<Debt, 'id'>) => {
    const newDebt = { ...debt, id: crypto.randomUUID() };
    setState(prev => ({
      ...prev,
      debts: [...prev.debts, newDebt],
    }));
  }, []);

  const updateDebt = useCallback((id: string, updates: Partial<Debt>) => {
    setState(prev => ({
      ...prev,
      debts: prev.debts.map(d => d.id === id ? { ...d, ...updates } : d),
    }));
  }, []);

  const deleteDebt = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      debts: prev.debts.filter(d => d.id !== id),
    }));
  }, []);

  // Savings Goals
  const addSavingsGoal = useCallback((goal: Omit<SavingsGoal, 'id'>) => {
    const newGoal = { ...goal, id: crypto.randomUUID() };
    setState(prev => ({
      ...prev,
      savingsGoals: [...prev.savingsGoals, newGoal],
    }));
  }, []);

  const updateSavingsGoal = useCallback((id: string, updates: Partial<SavingsGoal>) => {
    setState(prev => ({
      ...prev,
      savingsGoals: prev.savingsGoals.map(g => g.id === id ? { ...g, ...updates } : g),
    }));
  }, []);

  const deleteSavingsGoal = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      savingsGoals: prev.savingsGoals.filter(g => g.id !== id),
    }));
  }, []);

  // Computed values
  const totalBalance = state.accounts.reduce((sum, acc) => sum + acc.balance, 0);
  
  const currentMonthTransactions = state.transactions.filter(t => {
    const transactionDate = new Date(t.date);
    const now = new Date();
    return transactionDate.getMonth() === now.getMonth() && 
           transactionDate.getFullYear() === now.getFullYear();
  });

  const totalIncome = currentMonthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = currentMonthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const getCardExpenses = useCallback((cardId: string) => {
    return currentMonthTransactions
      .filter(t => t.cardId === cardId && t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [currentMonthTransactions]);

  const getCategoryExpenses = useCallback(() => {
    const expenses: Record<string, number> = {};
    currentMonthTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        expenses[t.category] = (expenses[t.category] || 0) + t.amount;
      });
    return expenses;
  }, [currentMonthTransactions]);

  return {
    ...state,
    totalBalance,
    totalIncome,
    totalExpenses,
    currentMonthTransactions,
    getCardExpenses,
    getCategoryExpenses,
    addTransaction,
    deleteTransaction,
    addAccount,
    updateAccount,
    deleteAccount,
    addCreditCard,
    deleteCreditCard,
    addDebt,
    updateDebt,
    deleteDebt,
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
  };
}
