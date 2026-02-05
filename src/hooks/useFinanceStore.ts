import { useState, useCallback, useEffect } from 'react';
import { FinanceState, Transaction, Account, CreditCard, Debt, SavingsGoal } from '@/types/finance';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';

const initialState: FinanceState = {
  transactions: [],
  accounts: [],
  creditCards: [],
  debts: [],
  savingsGoals: [],
};

export function useFinanceStore() {
  const [state, setState] = useState<FinanceState>(initialState);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(new Date());

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setState(initialState);
        setLoading(false);
        return;
      }

      const [transactionsRes, accountsRes, cardsRes, goalsRes, debtsRes] = await Promise.all([
        supabase.from('transactions').select('*'),
        supabase.from('accounts').select('*'),
        supabase.from('credit_cards').select('*'),
        supabase.from('savings_goals').select('*'),
        supabase.from('debts').select('*'),
      ]);

      if (transactionsRes.error) throw transactionsRes.error;
      if (accountsRes.error) throw accountsRes.error;
      if (cardsRes.error) throw cardsRes.error;
      if (goalsRes.error) throw goalsRes.error;
      if (debtsRes.error) throw debtsRes.error;

      setState({
        transactions: transactionsRes.data.map((t: any) => ({
          ...t,
          accountId: t.account_id,
          cardId: t.card_id,
          isRecurring: t.is_recurring,
          isInvoicePayment: t.is_invoice_payment,
          invoiceDate: t.invoice_date,
          savingsGoalId: t.savings_goal_id,
          installments: t.installments,
          debtId: t.debt_id
        })),
        accounts: accountsRes.data,
        creditCards: cardsRes.data.map((c: any) => ({
          ...c,
          dueDay: c.due_day,
          closingDay: c.closing_day,
          history: c.history
        })),
        savingsGoals: goalsRes.data.map((g: any) => ({
          ...g,
          targetAmount: g.target_amount,
          currentAmount: g.current_amount
        })),
        debts: debtsRes.data.map((d: any) => ({
          ...d,
          totalAmount: d.total_amount,
          remainingAmount: d.remaining_amount,
          monthlyPayment: d.monthly_payment,
          interestRate: d.interest_rate,
          installmentsLeft: d.installments_left,
          dueDay: d.due_day
        })),
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Erro ao carregar dados', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
    // Listen for auth changes to reload
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) fetchInitialData();
      else setState(initialState);
    });
    return () => subscription.unsubscribe();
  }, [fetchInitialData]);

  // --- Transactions ---

  const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id'>, customInstallments?: { date: string, amount: number }[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const transactionsToAdd: any[] = [];
      const groupId = (transaction.installments || customInstallments) ? crypto.randomUUID() : null;

      const pushTx = (txData: any) => {
        transactionsToAdd.push({
          user_id: user.id,
          description: txData.description,
          amount: txData.amount,
          type: txData.type,
          category: txData.category,
          date: txData.date,
          account_id: txData.accountId,
          card_id: txData.cardId,
          savings_goal_id: txData.savingsGoalId,
          invoice_date: txData.invoiceDate,
          is_invoice_payment: txData.isInvoicePayment || false,
          is_recurring: txData.isRecurring || false,
          installments: txData.installments,
          recurrence: txData.recurrence,
          debt_id: txData.debtId
        });
      };

      if (customInstallments && customInstallments.length > 0) {
        customInstallments.forEach((inst, index) => {
          pushTx({
            ...transaction,
            date: inst.date,
            amount: inst.amount,
            installments: groupId ? { current: index + 1, total: customInstallments.length, id: groupId } : undefined
          });
        });
      } else if (transaction.installments && transaction.installments.total > 1) {
        const val = transaction.amount / transaction.installments.total;
        for (let i = 1; i <= transaction.installments.total; i++) {
          const d = new Date(transaction.date);
          d.setMonth(d.getMonth() + (i - 1));
          pushTx({
            ...transaction,
            date: d.toISOString().split('T')[0],
            amount: val,
            installments: groupId ? { current: i, total: transaction.installments.total, id: groupId } : undefined
          });
        }
      } else if (transaction.recurrence === 'monthly') {
        for (let i = 0; i < 12; i++) {
          const d = new Date(transaction.date);
          d.setMonth(d.getMonth() + i);
          pushTx({ ...transaction, date: d.toISOString().split('T')[0] });
        }
      } else {
        pushTx(transaction);
      }

      const { data, error } = await supabase.from('transactions').insert(transactionsToAdd).select();
      if (error) throw error;

      const newTransactions = data.map((t: any) => ({
        ...t,
        accountId: t.account_id,
        cardId: t.card_id,
        isRecurring: t.is_recurring,
        isInvoicePayment: t.is_invoice_payment,
        invoiceDate: t.invoice_date,
        savingsGoalId: t.savings_goal_id,
        installments: t.installments,
        debtId: t.debt_id
      }));

      setState(prev => ({
        ...prev,
        transactions: [...prev.transactions, ...newTransactions]
      }));

      if (transaction.accountId) {
        const totalChange = transactionsToAdd.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
        updateAccountBalance(transaction.accountId, totalChange);
      }

      if (transaction.savingsGoalId) {
        const totalSaved = transactionsToAdd.reduce((sum, t) => sum + t.amount, 0); // Assuming saving is always positive alloc
        updateGoalProgress(transaction.savingsGoalId, totalSaved);
      }

      toast({ title: 'Lançamento salvo com sucesso' });

    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    }
  }, []);

  const updateTransaction = useCallback(async (updatedTx: Transaction) => {
    try {
      const { error } = await supabase.from('transactions').update({
        description: updatedTx.description,
        amount: updatedTx.amount,
        type: updatedTx.type,
        category: updatedTx.category,
        date: updatedTx.date,
        account_id: updatedTx.accountId,
        card_id: updatedTx.cardId,
        savings_goal_id: updatedTx.savingsGoalId,
        invoice_date: updatedTx.invoiceDate,
      }).eq('id', updatedTx.id);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        transactions: prev.transactions.map(t => t.id === updatedTx.id ? updatedTx : t)
      }));
      toast({ title: 'Atualizado com sucesso' });
    } catch (err) {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' });
    }
  }, []);

  const deleteTransaction = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      setState(prev => ({ ...prev, transactions: prev.transactions.filter(t => t.id !== id) }));
      toast({ title: 'Removido com sucesso' });
    } catch (err) {
      toast({ title: 'Erro ao deletar', variant: 'destructive' });
    }
  }, []);


  const addAccount = useCallback(async (account: Omit<Account, 'id'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.from('accounts').insert({
        user_id: user.id, ...account
      }).select().single();

      if (error) throw error;
      setState(prev => ({ ...prev, accounts: [...prev.accounts, data] }));
    } catch (err) { toast({ title: 'Erro ao criar conta', variant: 'destructive' }); }
  }, []);

  const updateAccountBalance = async (id: string, change: number) => {
    try {
      const { data: acc } = await supabase.from('accounts').select('balance').eq('id', id).single();
      if (acc) {
        const newBalance = Number(acc.balance) + Number(change);
        await supabase.from('accounts').update({ balance: newBalance }).eq('id', id);
        setState(prev => ({
          ...prev,
          accounts: prev.accounts.map(a => a.id === id ? { ...a, balance: newBalance } : a)
        }));
      }
    } catch (err) { console.error(err); }
  };

  const deleteAccount = useCallback(async (id: string) => {
    try {
      await supabase.from('accounts').delete().eq('id', id);
      setState(prev => ({ ...prev, accounts: prev.accounts.filter(a => a.id !== id) }));
    } catch (err) { toast({ title: 'Erro ao deletar conta', variant: 'destructive' }); }
  }, []);

  const updateAccount = useCallback(async (id: string, updates: Partial<Account>) => {
    try {
      await supabase.from('accounts').update(updates).eq('id', id);
      setState(prev => ({ ...prev, accounts: prev.accounts.map(a => a.id === id ? { ...a, ...updates } : a) }));
    } catch (err) { toast({ title: 'Erro ao atualizar conta', variant: 'destructive' }); }
  }, []);


  const addCreditCard = useCallback(async (card: Omit<CreditCard, 'id'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.from('credit_cards').insert({
        user_id: user.id,
        name: card.name,
        bank: card.bank,
        "limit": card.limit,
        due_day: card.dueDay,
        closing_day: card.closingDay,
        color: card.color,
        history: card.history || []
      }).select().single();
      if (error) throw error;
      const newCard = { ...data, dueDay: data.due_day, closingDay: data.closing_day };
      setState(prev => ({ ...prev, creditCards: [...prev.creditCards, newCard] }));
    } catch (err) { toast({ title: 'Erro ao criar cartão', variant: 'destructive' }); }
  }, []);

  const updateCreditCard = useCallback(async (card: CreditCard) => {
    try {
      await supabase.from('credit_cards').update({
        name: card.name,
        bank: card.bank,
        "limit": card.limit,
        due_day: card.dueDay,
        closing_day: card.closingDay,
        color: card.color,
        history: card.history
      }).eq('id', card.id);
      setState(prev => ({ ...prev, creditCards: prev.creditCards.map(c => c.id === card.id ? card : c) }));
    } catch (err) { toast({ title: 'Erro ao atualizar cartão', variant: 'destructive' }); }
  }, []);

  const deleteCreditCard = useCallback(async (id: string) => {
    try {
      await supabase.from('credit_cards').delete().eq('id', id);
      setState(prev => ({ ...prev, creditCards: prev.creditCards.filter(c => c.id !== id) }));
    } catch (err) { toast({ title: 'Erro ao deletar cartão', variant: 'destructive' }); }
  }, []);


  const addSavingsGoal = useCallback(async (goal: Omit<SavingsGoal, 'id'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.from('savings_goals').insert({
        user_id: user.id,
        name: goal.name,
        target_amount: goal.targetAmount,
        deadline: goal.deadline,
        color: goal.color,
        icon: goal.icon
      }).select().single();
      if (error) throw error;
      const newGoal = { ...data, targetAmount: data.target_amount, currentAmount: data.current_amount };
      setState(prev => ({ ...prev, savingsGoals: [...prev.savingsGoals, newGoal] }));
    } catch (err) { toast({ title: 'Erro ao criar meta', variant: 'destructive' }); }
  }, []);

  const updateGoalProgress = async (id: string, amountAdded: number) => {
    try {
      const { data: goal } = await supabase.from('savings_goals').select('current_amount').eq('id', id).single();
      if (goal) {
        const newAmount = Number(goal.current_amount) + Number(amountAdded);
        await supabase.from('savings_goals').update({ current_amount: newAmount }).eq('id', id);
        setState(prev => ({
          ...prev,
          savingsGoals: prev.savingsGoals.map(g => g.id === id ? { ...g, currentAmount: newAmount } : g)
        }));
      }
    } catch (err) { console.error(err); }
  };

  const updateSavingsGoal = useCallback(async (goal: SavingsGoal) => {
    try {
      await supabase.from('savings_goals').update({
        name: goal.name,
        target_amount: goal.targetAmount,
        current_amount: goal.currentAmount,
        deadline: goal.deadline,
        color: goal.color,
        icon: goal.icon
      }).eq('id', goal.id);
      setState(prev => ({ ...prev, savingsGoals: prev.savingsGoals.map(g => g.id === goal.id ? goal : g) }));
    } catch (err) { toast({ title: 'Erro ao atualizar meta', variant: 'destructive' }); }
  }, []);

  const deleteSavingsGoal = useCallback(async (id: string) => {
    try {
      await supabase.from('savings_goals').delete().eq('id', id);
      setState(prev => ({ ...prev, savingsGoals: prev.savingsGoals.filter(g => g.id !== id) }));
    } catch (err) { toast({ title: 'Erro ao deletar meta', variant: 'destructive' }); }
  }, []);

  // Debts (Simplified for now - can be expanded)
  const addDebt = useCallback(async (debt: Omit<Debt, 'id'>) => { }, []);
  const updateDebt = useCallback(async (debt: Debt) => { }, []);
  const deleteDebt = useCallback(async (id: string) => { }, []);
  const createDebtWithInstallments = useCallback(async (debt: Omit<Debt, 'id'>, start: string) => { }, []);

  // --- View Control ---
  const nextMonth = useCallback(() => {
    setViewDate(prev => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + 1);
      return next;
    });
  }, []);

  const prevMonth = useCallback(() => {
    setViewDate(prev => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() - 1);
      return next;
    });
  }, []);

  // --- Computed ---

  const currentMonthTransactions = state.transactions.filter(t => {
    const tDate = new Date(t.date);
    return tDate.getMonth() === viewDate.getMonth() && tDate.getFullYear() === viewDate.getFullYear();
  });

  const getCardExpenses = useCallback((cardId: string) => {
    return currentMonthTransactions
      .filter(t => t.cardId === cardId && t.type === 'expense' && !t.isInvoicePayment)
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [currentMonthTransactions]);

  const getCategoryExpenses = useCallback(() => {
    const expenses: Record<string, number> = {};
    currentMonthTransactions.filter(t => t.type === 'expense').forEach(t => {
      expenses[t.category] = (expenses[t.category] || 0) + t.amount;
    });
    return Object.entries(expenses).map(([name, value]) => ({ name, value }));
  }, [currentMonthTransactions]);

  const getCardSettingsForDate = useCallback((card: CreditCard, targetDate: Date) => {
    if (!card.history || card.history.length === 0) return { dueDay: card.dueDay, closingDay: card.closingDay };
    const sortedHistory = [...card.history].sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());
    const match = sortedHistory.find(h => new Date(h.effectiveDate) <= targetDate);
    if (match) return { dueDay: match.dueDay, closingDay: match.closingDay };
    if (sortedHistory.length > 0) return { dueDay: sortedHistory[sortedHistory.length - 1].dueDay, closingDay: sortedHistory[sortedHistory.length - 1].closingDay };
    return { dueDay: card.dueDay, closingDay: card.closingDay };
  }, []);

  return {
    ...state,
    loading,
    viewDate,
    nextMonth,
    prevMonth,
    setViewDate,
    totalBalance: state.accounts.reduce((sum, acc) => sum + Number(acc.balance), 0),
    totalIncome: currentMonthTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0),
    totalExpenses: currentMonthTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0),
    currentMonthTransactions,
    getCardExpenses,
    getCategoryExpenses,
    getCardSettingsForDate,
    fetchInitialData,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addAccount,
    updateAccount,
    deleteAccount,
    addCreditCard,
    updateCreditCard,
    deleteCreditCard,
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    addDebt,
    updateDebt,
    deleteDebt,
    createDebtWithInstallments
  };
}
