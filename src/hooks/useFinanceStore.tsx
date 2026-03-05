import { useState, useCallback, useEffect, createContext, useContext } from 'react';
import { FinanceState, Transaction, Account, CreditCard, Debt, SavingsGoal, Category, Subcategory, Bill, HabitLog, UserHabit, BudgetRule } from '@/types/finance';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';

const initialState: FinanceState = {
  transactions: [],
  accounts: [],
  creditCards: [],
  debts: [],
  savingsGoals: [],
  categories: [],
  subcategories: [],
  categoryGroups: [],
  bills: [],
  habits: [],
  habitLogs: [],
  emergencyMonths: Number(localStorage.getItem('emergencyMonths')) || 12,
};

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

      const [
        transactionsRes,
        accountsRes,
        cardsRes,
        goalsRes,
        debtsRes,
        categoriesRes,
        subcategoriesRes,
        groupsRes,
        billsRes,
        budgetRes,
        habitsRes,
        habitLogsRes
      ] = await Promise.all([
        supabase.from('transactions').select('*'),
        supabase.from('accounts').select('*'),
        supabase.from('credit_cards').select('*'),
        supabase.from('savings_goals').select('*'),
        supabase.from('debts').select('*').order('strategy_priority', { ascending: true }),
        supabase.from('categories').select('*'),
        supabase.from('subcategories').select('*'),
        supabase.from('category_groups').select('*'),
        supabase.from('bills').select('*'),
        supabase.from('budget_rules').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_habits').select('*'),
        supabase.from('habit_logs').select('*'),
      ]);

      if (transactionsRes.error) throw transactionsRes.error;
      if (accountsRes.error) throw accountsRes.error;
      if (cardsRes.error) throw cardsRes.error;
      if (goalsRes.error) throw goalsRes.error;
      if (debtsRes.error) throw debtsRes.error;

      setState({
        transactions: (transactionsRes.data || []).map((t: any) => ({
          ...t,
          userId: t.user_id,
          transactionType: t.transaction_type,
          categoryId: t.category_id,
          subcategoryId: t.subcategory_id,
          accountId: t.account_id,
          cardId: t.card_id,
          isPaid: new Date(t.date) <= new Date(),
          isRecurring: t.is_recurring,
          installmentGroupId: t.installment_group_id,
          installmentNumber: t.installment_number,
          installmentTotal: t.installment_total,
          invoiceMonthYear: t.invoice_month_year,
          debtId: t.debt_id
        })),
        accounts: (accountsRes.data || []).map((a: any) => ({
          ...a,
          userId: a.user_id,
          accountType: a.account_type
        })),
        creditCards: (cardsRes.data || []).map((c: any) => ({
          ...c,
          userId: c.user_id,
          dueDay: c.due_day,
          closingDay: c.closing_day,
          history: c.history
        })),
        savingsGoals: (goalsRes.data || []).map((g: any) => ({
          ...g,
          userId: g.user_id,
          targetAmount: g.target_amount,
          currentAmount: g.current_amount
        })),
        debts: (debtsRes.data || []).map((d: any) => ({
          ...d,
          userId: d.user_id,
          totalAmount: d.total_amount,
          remainingAmount: d.remaining_amount,
          monthlyPayment: d.monthly_payment,
          interestRateMonthly: d.interest_rate_monthly,
          minimumPayment: d.minimum_payment,
          dueDay: d.due_day,
          strategyPriority: d.strategy_priority
        })),
        categories: (categoriesRes.data || []).map((c: any) => ({
          ...c,
          userId: c.user_id,
          groupId: c.group_id,
          isActive: c.is_active
        })),
        subcategories: (subcategoriesRes.data || []).map((s: any) => ({
          ...s,
          categoryId: s.category_id,
          isActive: s.is_active
        })),
        categoryGroups: (groupsRes.data || []),
        bills: (billsRes.data || []).map((b: any) => ({
          ...b,
          userId: b.user_id,
          categoryId: b.category_id,
          subcategoryId: b.subcategory_id,
          accountId: b.account_id,
          dueDate: b.due_date,
          paymentDate: b.payment_date,
          isFixed: b.is_fixed,
          recurrenceRule: b.recurrence_rule
        })),
        budgetRule: budgetRes.data ? {
          id: budgetRes.data.id,
          userId: budgetRes.data.user_id,
          needsPercent: budgetRes.data.needs_percent,
          wantsPercent: budgetRes.data.wants_percent,
          savingsPercent: budgetRes.data.savings_percent
        } : undefined,
        habits: (habitsRes.data || []).map((h: any) => ({
          ...h,
          userId: h.user_id,
          habitType: h.habit_type,
          isActive: h.is_active
        })),
        habitLogs: (habitLogsRes.data || []).map((l: any) => ({
          ...l,
          habitId: l.habit_id,
          loggedDate: l.logged_date
        })),
        emergencyMonths: Number(localStorage.getItem('emergencyMonths')) || initialState.emergencyMonths,
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
      const installmentGroupId = (transaction.installmentTotal || customInstallments) ? crypto.randomUUID() : null;

      const pushTx = (txData: any, instNum?: number, instTotal?: number) => {
        transactionsToAdd.push({
          user_id: user.id,
          description: txData.description,
          amount: txData.amount,
          type: txData.type,
          transaction_type: txData.transactionType || 'punctual',
          category_id: txData.categoryId || null,
          subcategory_id: txData.subcategoryId || null,
          date: txData.date,
          account_id: txData.accountId || null,
          card_id: txData.cardId || null,
          invoice_month_year: txData.invoiceMonthYear || null,
          is_recurring: txData.isRecurring || false,
          installment_group_id: installmentGroupId,
          installment_number: instNum || txData.installmentNumber || null,
          installment_total: instTotal || txData.installmentTotal || null,
          debt_id: txData.debtId || null
        });
      };

      if (customInstallments && customInstallments.length > 0) {
        customInstallments.forEach((inst, index) => {
          pushTx({
            ...transaction,
            date: inst.date,
            amount: inst.amount
          }, index + 1, customInstallments.length);
        });
      } else if (transaction.installmentTotal && transaction.installmentTotal > 1) {
        const val = transaction.amount / transaction.installmentTotal;
        for (let i = 1; i <= transaction.installmentTotal; i++) {
          const d = new Date(transaction.date);
          d.setMonth(d.getMonth() + (i - 1));
          pushTx({
            ...transaction,
            date: d.toISOString().split('T')[0],
            amount: val
          }, i, transaction.installmentTotal);
        }
      } else {
        pushTx(transaction);
      }

      const { data, error } = await supabase.from('transactions').insert(transactionsToAdd).select();
      if (error) throw error;

      const newTransactions = data.map((t: any) => ({
        ...t,
        userId: t.user_id,
        transactionType: t.transaction_type,
        categoryId: t.category_id,
        subcategoryId: t.subcategory_id,
        accountId: t.account_id,
        cardId: t.card_id,
        installmentGroupId: t.installment_group_id,
        installmentNumber: t.installment_number,
        installmentTotal: t.installment_total,
        invoiceMonthYear: t.invoice_month_year,
        isRecurring: t.is_recurring,
        debtId: t.debt_id,
        isPaid: new Date(t.date) <= new Date(),
      }));

      setState(prev => ({
        ...prev,
        transactions: [...prev.transactions, ...newTransactions]
      }));

      for (const tx of newTransactions) {
        if (tx.isPaid && tx.accountId) {
          const change = tx.type === 'income' ? tx.amount : -tx.amount;
          updateAccountBalance(tx.accountId, change);
        }
        if (tx.debtId) {
          // Abater saldo da dívida
          const debt = state.debts.find(d => d.id === tx.debtId);
          if (debt) {
            const newRemaining = Math.max(0, debt.remainingAmount - tx.amount);
            await supabase.from('debts').update({ remaining_amount: newRemaining }).eq('id', tx.debtId);
            setState(prev => ({
              ...prev,
              debts: prev.debts.map(d => d.id === tx.debtId ? { ...d, remainingAmount: newRemaining } : d)
            }));
          }
        }
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
        transaction_type: updatedTx.transactionType,
        category_id: updatedTx.categoryId || null,
        subcategory_id: updatedTx.subcategoryId || null,
        date: updatedTx.date,
        account_id: updatedTx.accountId || null,
        card_id: updatedTx.cardId || null,
        invoice_month_year: updatedTx.invoiceMonthYear || null,
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


  const togglePaid = useCallback(async (id: string, isPaid: boolean) => {
    try {
      const tx = state.transactions.find(t => t.id === id);
      if (!tx) return;

      // is_paid column does not exist in DB — manage locally only
      setState(prev => ({
        ...prev,
        transactions: prev.transactions.map(t => t.id === id ? { ...t, isPaid } : t)
      }));

      if (tx.accountId) {
        const baseChange = tx.type === 'income' ? tx.amount : -tx.amount;
        const actualChange = isPaid ? baseChange : -baseChange;
        updateAccountBalance(tx.accountId, actualChange);
      }

      toast({ title: isPaid ? 'Conta marcada como paga' : 'Pagamento estornado' });
    } catch (err) {
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' });
    }
  }, [state.transactions]);

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

  const updateSavingsGoal = useCallback(async (id: string, updates: Partial<SavingsGoal>) => {
    try {
      const updatePayload: any = {};
      if (updates.name !== undefined) updatePayload.name = updates.name;
      if (updates.targetAmount !== undefined) updatePayload.target_amount = updates.targetAmount;
      if (updates.currentAmount !== undefined) updatePayload.current_amount = updates.currentAmount;
      if (updates.deadline !== undefined) updatePayload.deadline = updates.deadline;
      if (updates.color !== undefined) updatePayload.color = updates.color;
      if (updates.icon !== undefined) updatePayload.icon = updates.icon;

      await supabase.from('savings_goals').update(updatePayload).eq('id', id);
      setState(prev => ({ ...prev, savingsGoals: prev.savingsGoals.map(g => g.id === id ? { ...g, ...updates } : g) }));
    } catch (err) { toast({ title: 'Erro ao atualizar meta', variant: 'destructive' }); }
  }, []);

  const deleteSavingsGoal = useCallback(async (id: string) => {
    try {
      await supabase.from('savings_goals').delete().eq('id', id);
      setState(prev => ({ ...prev, savingsGoals: prev.savingsGoals.filter(g => g.id !== id) }));
    } catch (err) { toast({ title: 'Erro ao deletar meta', variant: 'destructive' }); }
  }, []);

  const seedCoach = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const needsGroup = state.categoryGroups.find(g => g.name === 'needs');
      const wantsGroup = state.categoryGroups.find(g => g.name === 'wants');
      const savingsGroup = state.categoryGroups.find(g => g.name === 'savings');

      if (!needsGroup || !wantsGroup || !savingsGroup) return;

      const defaultCategories = [
        { user_id: user.id, group_id: needsGroup.id, name: 'Moradia', type: 'expense', icon: 'Home' },
        { user_id: user.id, group_id: needsGroup.id, name: 'Alimentação', type: 'expense', icon: 'Utensils' },
        { user_id: user.id, group_id: needsGroup.id, name: 'Transporte', type: 'expense', icon: 'Car' },
        { user_id: user.id, group_id: needsGroup.id, name: 'Saúde', type: 'expense', icon: 'Heart' },
        { user_id: user.id, group_id: wantsGroup.id, name: 'Lazer', type: 'expense', icon: 'PartyPopper' },
        { user_id: user.id, group_id: wantsGroup.id, name: 'Delivery', type: 'expense', icon: 'ShoppingBag' },
        { user_id: user.id, group_id: wantsGroup.id, name: 'Assinaturas', type: 'expense', icon: 'Repeat' },
        { user_id: user.id, group_id: savingsGroup.id, name: 'Investimentos', type: 'expense', icon: 'TrendingUp' },
        { user_id: user.id, group_id: savingsGroup.id, name: 'Reserva', type: 'expense', icon: 'PiggyBank' },
        { user_id: user.id, group_id: needsGroup.id, name: 'Salário', type: 'income', icon: 'Briefcase' },
      ];

      const defaultHabits = [
        { user_id: user.id, habit_type: 'daily_log', description: 'Registrar gastos do dia', frequency: 'daily' },
        { user_id: user.id, habit_type: 'weekly_review', description: 'Revisão semanal de saldo', frequency: 'weekly' },
        { user_id: user.id, habit_type: 'monthly_savings', description: 'Poupar 20% da renda', frequency: 'monthly' },
      ];

      const [catRes, habRes] = await Promise.all([
        supabase.from('categories').insert(defaultCategories),
        supabase.from('user_habits').insert(defaultHabits)
      ]);

      if (catRes.error) throw catRes.error;
      if (habRes.error) throw habRes.error;

      await fetchInitialData();
      toast({ title: 'Coach Ativado! Categorias e Missões prontas. 🚀' });
    } catch (err) {
      toast({ title: 'Erro ao ativar Coach', variant: 'destructive' });
    }
  }, [state.categoryGroups, fetchInitialData]);

  // Debts (Simplified for now - can be expanded)
  const addDebt = useCallback(async (debt: Omit<Debt, 'id'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.from('debts').insert({
        user_id: user.id,
        name: debt.name,
        total_amount: debt.totalAmount,
        remaining_amount: debt.remainingAmount,
        monthly_payment: debt.monthlyPayment,
        interest_rate_monthly: debt.interestRateMonthly,
        start_date: debt.startDate,
        minimum_payment: debt.minimumPayment,
        due_day: debt.dueDay,
        strategy_priority: debt.strategyPriority
      }).select().single();
      if (error) throw error;
      const newDebt = {
        ...data,
        userId: data.user_id,
        totalAmount: data.total_amount,
        remainingAmount: data.remaining_amount,
        monthlyPayment: data.monthly_payment,
        interestRateMonthly: data.interest_rate_monthly,
        minimumPayment: data.minimum_payment,
        dueDay: data.due_day,
        strategyPriority: data.strategy_priority
      };
      setState(prev => ({ ...prev, debts: [...prev.debts, newDebt] }));
      toast({ title: 'Dívida adicionada' });
    } catch (err) { toast({ title: 'Erro ao adicionar dívida', variant: 'destructive' }); }
  }, []);

  const updateDebt = useCallback(async (id: string, updates: Partial<Debt>) => {
    try {
      const payload: any = {};
      if (updates.remainingAmount !== undefined) payload.remaining_amount = updates.remainingAmount;
      if (updates.monthlyPayment !== undefined) payload.monthly_payment = updates.monthlyPayment;
      if (updates.name !== undefined) payload.name = updates.name;
      await supabase.from('debts').update(payload).eq('id', id);
      setState(prev => ({ ...prev, debts: prev.debts.map(d => d.id === id ? { ...d, ...updates } : d) }));
    } catch (err) { toast({ title: 'Erro ao atualizar dívida', variant: 'destructive' }); }
  }, []);

  const deleteDebt = useCallback(async (id: string) => {
    try {
      await supabase.from('debts').delete().eq('id', id);
      setState(prev => ({ ...prev, debts: prev.debts.filter(d => d.id !== id) }));
      toast({ title: 'Dívida removida' });
    } catch (err) { toast({ title: 'Erro ao remover dívida', variant: 'destructive' }); }
  }, []);

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
      const cat = state.categories.find(c => c.id === t.categoryId);
      const name = cat ? cat.name : 'Outros';
      expenses[name] = (expenses[name] || 0) + t.amount;
    });
    return Object.entries(expenses).map(([name, value]) => ({ name, value }));
  }, [currentMonthTransactions, state.categories]);

  const getCardSettingsForDate = useCallback((card: CreditCard, targetDate: Date) => {
    if (!card.history || card.history.length === 0) return { dueDay: card.dueDay, closingDay: card.closingDay };
    const sortedHistory = [...card.history].sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());
    const match = sortedHistory.find(h => new Date(h.effectiveDate) <= targetDate);
    if (match) return { dueDay: match.dueDay, closingDay: match.closingDay };
    if (sortedHistory.length > 0) return { dueDay: sortedHistory[sortedHistory.length - 1].dueDay, closingDay: sortedHistory[sortedHistory.length - 1].closingDay };
    return { dueDay: card.dueDay, closingDay: card.closingDay };
  }, []);

  const setEmergencyMonths = useCallback((months: number) => {
    localStorage.setItem('emergencyMonths', String(months));
    setState(prev => ({ ...prev, emergencyMonths: months }));
  }, []);

  const getEmergencyFundData = useCallback(() => {
    // Agora o cálculo é baseado no GRUPO 'needs' das categorias criadas dinamicamente
    const needsGroup = state.categoryGroups.find(g => g.name === 'needs');
    const needsCategoryIds = state.categories
      .filter(c => c.groupId === needsGroup?.id)
      .map(c => c.id);

    const fixedExpenses = currentMonthTransactions
      .filter(t => t.type === 'expense' && (t.categoryId && needsCategoryIds.includes(t.categoryId)))
      .reduce((acc, curr) => acc + curr.amount, 0);

    const target = fixedExpenses * state.emergencyMonths;
    const current = state.accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);

    return {
      monthlyFixed: fixedExpenses,
      targetAmount: target,
      currentAmount: current,
      progress: target > 0 ? (current / target) * 100 : 0,
      months: state.emergencyMonths
    };
  }, [currentMonthTransactions, state.accounts, state.emergencyMonths, state.categories, state.categoryGroups]);

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
    getEmergencyFundData,
    setEmergencyMonths,
    fetchInitialData,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    togglePaid,
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
    createDebtWithInstallments,
    seedCoach
  };
}
