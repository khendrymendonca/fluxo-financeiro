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
          isPaid: t.is_paid !== undefined ? t.is_paid : new Date(t.date) <= new Date(),
          isRecurring: t.is_recurring,
          installmentGroupId: t.installment_group_id,
          installmentNumber: t.installment_number,
          installmentTotal: t.installment_total,
          invoiceMonthYear: t.invoice_month_year,
          debtId: t.debt_id,
          paymentDate: t.payment_date
        })),
        accounts: (accountsRes.data || []).map((a: any) => ({
          ...a,
          userId: a.user_id,
          accountType: a.account_type,
          hasOverdraft: a.has_overdraft || false,
          overdraftLimit: a.overdraft_limit || 0
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
          recurrenceRule: b.recurrence_rule,
          startDate: b.start_date
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
      const installmentGroupId = (transaction.installmentTotal || customInstallments || transaction.isRecurring) ? crypto.randomUUID() : null;

      const pushTx = (txData: any, instNum?: number, instTotal?: number) => {
        const categoryName = state.categories.find(c => c.id === txData.categoryId)?.name || 'Outros';

        transactionsToAdd.push({
          user_id: user.id,
          description: txData.description,
          amount: txData.amount,
          type: txData.type,
          transaction_type: txData.transactionType || 'punctual',
          category_id: txData.categoryId || null,
          category: categoryName,
          subcategory_id: txData.subcategoryId || null,
          date: txData.date,
          account_id: txData.accountId || null,
          card_id: txData.cardId || null,
          invoice_month_year: txData.invoiceMonthYear || null,
          is_recurring: txData.isRecurring || false,
          installment_group_id: installmentGroupId,
          installment_number: instNum || txData.installmentNumber || null,
          installment_total: instTotal || txData.installmentTotal || null,
          debt_id: txData.debtId || null,
          is_paid: txData.is_paid !== undefined ? txData.is_paid : (new Date(txData.date) <= new Date())
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
      } else if (transaction.isRecurring) {
        for (let i = 1; i <= 12; i++) {
          const d = new Date(transaction.date);
          const targetDay = d.getDate();
          d.setMonth(d.getMonth() + (i - 1));
          // Simple day preservation
          if (d.getDate() !== targetDay && targetDay > 28) d.setDate(0);

          pushTx({
            ...transaction,
            date: d.toISOString().split('T')[0]
          }, i, undefined);
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
        isPaid: t.is_paid,
        paymentDate: t.payment_date,
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

  const updateTransaction = useCallback(async (updatedTx: Transaction, applyScope: 'this' | 'future' | 'all' = 'this') => {
    try {
      const categoryName = state.categories.find(c => c.id === updatedTx.categoryId)?.name || 'Outros';

      const updateData = {
        description: updatedTx.description,
        amount: updatedTx.amount,
        type: updatedTx.type,
        transaction_type: updatedTx.transactionType,
        category_id: updatedTx.categoryId || null,
        category: categoryName,
        subcategory_id: updatedTx.subcategoryId || null,
        date: updatedTx.date,
        account_id: updatedTx.accountId || null,
        card_id: updatedTx.cardId || null,
        invoice_month_year: updatedTx.invoiceMonthYear || null,
        is_paid: updatedTx.isPaid
      };

      if (applyScope !== 'this' && updatedTx.installmentGroupId) {
        const currentTx = state.transactions.find(t => t.id === updatedTx.id);
        if (currentTx) {
          let query = supabase
            .from('transactions')
            .update({
              description: updatedTx.description,
              amount: updatedTx.amount,
              category_id: updatedTx.categoryId,
              category: categoryName,
              subcategory_id: updatedTx.subcategoryId,
              account_id: updatedTx.accountId,
              card_id: updatedTx.cardId,
            })
            .eq('installment_group_id', updatedTx.installmentGroupId);

          if (applyScope === 'future') {
            query = query.gte('installment_number', updatedTx.installmentNumber || 0);
          }

          const { error } = await query;

          setState(prev => ({
            ...prev,
            transactions: prev.transactions.map(t => {
              if (t.installmentGroupId === updatedTx.installmentGroupId) {
                if (applyScope === 'all' || (applyScope === 'future' && (t.installmentNumber || 0) >= (updatedTx.installmentNumber || 0))) {
                  return { ...t, ...updatedTx, id: t.id, installmentNumber: t.installmentNumber, date: t.date };
                }
              }
              return t;
            })
          }));
          toast({ title: 'Parcelas atualizadas com sucesso' });
          return;
        }
      }

      const { error } = await supabase.from('transactions').update(updateData).eq('id', updatedTx.id);
      if (error) throw error;

      setState(prev => ({
        ...prev,
        transactions: prev.transactions.map(t => t.id === updatedTx.id ? updatedTx : t)
      }));
      toast({ title: 'Atualizado com sucesso' });
    } catch (err) {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' });
    }
  }, [state.transactions, state.categories]);

  const deleteTransaction = useCallback(async (id: string, scope: 'this' | 'future' | 'all' = 'this') => {
    try {
      const txToDelete = state.transactions.find(t => t.id === id);
      if (!txToDelete) return;

      if (scope !== 'this' && txToDelete.installmentGroupId) {
        let query = supabase.from('transactions').delete().eq('installment_group_id', txToDelete.installmentGroupId);
        if (scope === 'future') {
          query = query.gte('installment_number', txToDelete.installmentNumber || 0);
        }
        const { error } = await query;
        if (error) throw error;

        setState(prev => ({
          ...prev,
          transactions: prev.transactions.filter(t => {
            if (t.installmentGroupId !== txToDelete.installmentGroupId) return true;
            if (scope === 'future') return (t.installmentNumber || 0) < (txToDelete.installmentNumber || 0);
            return false;
          })
        }));
        toast({ title: 'Parcelas removidas com sucesso' });
        return;
      }

      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      setState(prev => ({ ...prev, transactions: prev.transactions.filter(t => t.id !== id) }));
      toast({ title: 'Removido com sucesso' });
    } catch (err) {
      toast({ title: 'Erro ao deletar', variant: 'destructive' });
    }
  }, [state.transactions]);


  const togglePaid = useCallback(async (id: string, isPaid: boolean, paymentAccountId?: string, paymentDate?: string) => {
    try {
      const tx = state.transactions.find(t => t.id === id);
      if (!tx) return;

      const effectivePaymentDate = paymentDate || new Date().toISOString().split('T')[0];
      const effectiveAccountId = paymentAccountId || tx.accountId;

      const updatePayload: any = {
        is_paid: isPaid,
        payment_date: isPaid ? effectivePaymentDate : null
      };

      const { error } = await supabase.from('transactions').update(updatePayload).eq('id', id);
      // Even if error (column missing), we update locally

      setState(prev => ({
        ...prev,
        transactions: prev.transactions.map(t => t.id === id ? {
          ...t,
          isPaid,
          paymentDate: isPaid ? effectivePaymentDate : undefined
        } : t)
      }));

      if (effectiveAccountId) {
        const baseChange = tx.type === 'income' ? tx.amount : -tx.amount;
        const actualChange = isPaid ? baseChange : -baseChange;
        updateAccountBalance(effectiveAccountId, actualChange);
      }

      const label = tx.type === 'income' ? 'Recebimento' : 'Pagamento';
      toast({ title: isPaid ? `${label} registrado` : `${label} estornado` });
    } catch (err) {
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' });
    }
  }, [state.transactions]);

  const addAccount = useCallback(async (account: Omit<Account, 'id' | 'userId'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.from('accounts').insert({
        user_id: user.id,
        name: account.name,
        bank: account.bank,
        balance: account.balance,
        color: account.color,
        account_type: account.accountType,
        has_overdraft: account.hasOverdraft || false,
        overdraft_limit: account.overdraftLimit || 0
      }).select().single();

      if (error) throw error;
      const newAccount = { ...data, accountType: data.account_type, hasOverdraft: data.has_overdraft || false, overdraftLimit: data.overdraft_limit || 0 };
      setState(prev => ({ ...prev, accounts: [...prev.accounts, newAccount] }));
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
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.bank !== undefined) dbUpdates.bank = updates.bank;
      if (updates.balance !== undefined) dbUpdates.balance = updates.balance;
      if (updates.color !== undefined) dbUpdates.color = updates.color;
      if (updates.accountType !== undefined) dbUpdates.account_type = updates.accountType;
      if (updates.hasOverdraft !== undefined) dbUpdates.has_overdraft = updates.hasOverdraft;
      if (updates.overdraftLimit !== undefined) dbUpdates.overdraft_limit = updates.overdraftLimit;
      await supabase.from('accounts').update(dbUpdates).eq('id', id);
      setState(prev => ({ ...prev, accounts: prev.accounts.map(a => a.id === id ? { ...a, ...updates } : a) }));
    } catch (err) { toast({ title: 'Erro ao atualizar conta', variant: 'destructive' }); }
  }, []);


  const addCreditCard = useCallback(async (card: Omit<CreditCard, 'id' | 'userId'>) => {
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
        is_closing_date_fixed: card.isClosingDateFixed,
        is_active: true,
        history: (card as any).history || []
      }).select().single();
      if (error) throw error;
      const newCard = { ...data, dueDay: data.due_day, closingDay: data.closing_day, isClosingDateFixed: data.is_closing_date_fixed, isActive: data.is_active };
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
        is_closing_date_fixed: card.isClosingDateFixed,
        is_active: card.isActive,
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


  const addSavingsGoal = useCallback(async (goal: Omit<SavingsGoal, 'id' | 'userId'>) => {
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

  const depositToGoal = useCallback(async (goalId: string, amount: number, accountId: string) => {
    try {
      const { data: goal } = await supabase.from('savings_goals').select('current_amount, name').eq('id', goalId).single();
      if (!goal) return;

      const newAmount = Number(goal.current_amount) + Number(amount);

      // Update Goal
      const { error: goalError } = await supabase.from('savings_goals').update({ current_amount: newAmount }).eq('id', goalId);
      if (goalError) throw goalError;

      // Update Account Balance (Debit)
      await updateAccountBalance(accountId, -amount);

      setState(prev => ({
        ...prev,
        savingsGoals: prev.savingsGoals.map(g => g.id === goalId ? { ...g, currentAmount: newAmount } : g)
      }));

      toast({ title: `R$ ${amount.toFixed(2)} guardados na meta ${goal.name}` });
    } catch (err) {
      toast({ title: 'Erro ao processar depósito', variant: 'destructive' });
    }
  }, [updateAccountBalance]);

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

  // --- Categories & Budget Rules ---
  const addCategory = useCallback(async (category: Omit<Category, 'id' | 'userId' | 'isActive'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.from('categories').insert({
        user_id: user.id,
        group_id: category.groupId,
        name: category.name,
        type: category.type,
        icon: category.icon,
        color: category.color,
        is_active: true
      }).select().single();

      if (error) throw error;

      const newCategory: Category = {
        ...data,
        userId: data.user_id,
        groupId: data.group_id,
        isActive: data.is_active
      };

      setState(prev => ({ ...prev, categories: [...prev.categories, newCategory] }));
      toast({ title: 'Categoria criada com sucesso' });
    } catch (err) { toast({ title: 'Erro ao criar categoria', variant: 'destructive' }); }
  }, []);

  const updateCategory = useCallback(async (id: string, updates: Partial<Category>) => {
    try {
      const dbUpdates: any = { ...updates };
      if (updates.groupId !== undefined) dbUpdates.group_id = updates.groupId;
      if (updates.userId !== undefined) delete dbUpdates.userId;
      delete dbUpdates.groupId;

      const { error } = await supabase.from('categories').update(dbUpdates).eq('id', id);
      if (error) throw error;

      setState(prev => ({
        ...prev,
        categories: prev.categories.map(c => c.id === id ? { ...c, ...updates } : c)
      }));
    } catch (err) { toast({ title: 'Erro ao atualizar categoria', variant: 'destructive' }); }
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      setState(prev => ({
        ...prev,
        categories: prev.categories.filter(c => c.id !== id),
        subcategories: prev.subcategories.filter(s => s.categoryId !== id)
      }));
      toast({ title: 'Categoria removida' });
    } catch (err) { toast({ title: 'Erro ao deletar categoria', variant: 'destructive' }); }
  }, []);

  const addSubcategory = useCallback(async (subcategory: Omit<Subcategory, 'id' | 'isActive'>) => {
    try {
      const { data, error } = await supabase.from('subcategories').insert({
        category_id: subcategory.categoryId,
        name: subcategory.name,
        is_active: true
      }).select().single();

      if (error) throw error;

      setState(prev => ({
        ...prev,
        subcategories: [...prev.subcategories, {
          ...data,
          categoryId: data.category_id,
          isActive: data.is_active
        }]
      }));
    } catch (err) { toast({ title: 'Erro ao adicionar subcategoria', variant: 'destructive' }); }
  }, []);

  const deleteSubcategory = useCallback(async (id: string) => {
    try {
      await supabase.from('subcategories').delete().eq('id', id);
      setState(prev => ({ ...prev, subcategories: prev.subcategories.filter(s => s.id !== id) }));
    } catch (err) { toast({ title: 'Erro ao deletar subcategoria', variant: 'destructive' }); }
  }, []);

  const updateBudgetRule = useCallback(async (needs: number, wants: number, savings: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const ruleId = state.budgetRule?.id;

      if (ruleId) {
        await supabase.from('budget_rules').update({
          needs_percent: needs,
          wants_percent: wants,
          savings_percent: savings
        }).eq('id', ruleId);
      } else {
        const { data } = await supabase.from('budget_rules').insert({
          user_id: user.id,
          needs_percent: needs,
          wants_percent: wants,
          savings_percent: savings
        }).select().single();
        if (data) {
          setState(prev => ({ ...prev, budgetRule: { ...data, userId: data.user_id, needsPercent: data.needs_percent, wantsPercent: data.wants_percent, savingsPercent: data.savings_percent } }));
          return;
        }
      }

      setState(prev => prev.budgetRule ? ({
        ...prev,
        budgetRule: { ...prev.budgetRule, needsPercent: needs, wantsPercent: wants, savingsPercent: savings }
      }) : prev);

      toast({ title: 'Regra de orçamento atualizada!' });
    } catch (err) {
      toast({ title: 'Erro ao atualizar regra', variant: 'destructive' });
    }
  }, [state.budgetRule]);

  // --- Bills ---
  const addBill = useCallback(async (bill: Omit<Bill, 'id' | 'userId'>, project: boolean = true) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const billsToAdd = [];
      const count = (project && bill.isFixed) ? 12 : 1;

      for (let i = 0; i < count; i++) {
        const d = new Date(bill.dueDate);
        const targetDay = d.getDate();
        d.setMonth(d.getMonth() + i);
        if (d.getDate() !== targetDay && targetDay > 28) d.setDate(0);

        billsToAdd.push({
          user_id: user.id,
          category_id: bill.categoryId,
          account_id: bill.accountId,
          name: bill.name,
          amount: bill.amount,
          type: bill.type,
          due_date: d.toISOString().split('T')[0],
          payment_date: bill.paymentDate,
          status: bill.status,
          is_fixed: bill.isFixed,
          recurrence_rule: bill.recurrenceRule,
          start_date: bill.startDate || bill.dueDate
        });
      }

      const { data, error } = await supabase.from('bills').insert(billsToAdd).select();

      if (error) throw error;

      const newBills = (data || []).map((b: any) => ({
        ...b,
        userId: b.user_id,
        categoryId: b.category_id,
        subcategoryId: b.subcategory_id,
        accountId: b.account_id,
        dueDate: b.due_date,
        paymentDate: b.payment_date,
        isFixed: b.is_fixed,
        recurrenceRule: b.recurrence_rule,
        startDate: b.start_date
      }));

      setState(prev => ({ ...prev, bills: [...prev.bills, ...newBills] }));
      if (project) toast({ title: bill.isFixed ? 'Conta fixa configurada para os próximos 12 meses' : 'Conta adicionada com sucesso' });
    } catch (err) { toast({ title: 'Erro ao adicionar conta', variant: 'destructive' }); }
  }, []);

  const updateBill = useCallback(async (id: string, updates: Partial<Bill>, applyToFuture: boolean = false) => {
    try {
      const bill = state.bills.find(b => b.id === id);
      if (!bill) return;

      const dbUpdates: any = { ...updates };
      if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId;
      if (updates.accountId !== undefined) dbUpdates.account_id = updates.accountId;
      if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
      if (updates.paymentDate !== undefined) dbUpdates.payment_date = updates.paymentDate;
      if (updates.isFixed !== undefined) dbUpdates.is_fixed = updates.isFixed;
      if (updates.recurrenceRule !== undefined) dbUpdates.recurrence_rule = updates.recurrenceRule;

      delete dbUpdates.categoryId;
      delete dbUpdates.accountId;
      delete dbUpdates.dueDate;
      delete dbUpdates.paymentDate;
      delete dbUpdates.isFixed;
      delete dbUpdates.recurrenceRule;
      delete dbUpdates.userId;

      if (applyToFuture && bill.isFixed) {
        // Update all future bills with the same name and category
        const { error } = await supabase.from('bills')
          .update({
            name: updates.name || bill.name,
            amount: updates.amount !== undefined ? updates.amount : bill.amount,
            category_id: updates.categoryId || bill.categoryId,
            account_id: updates.accountId || bill.accountId,
            is_fixed: true
          })
          .eq('name', bill.name)
          .eq('user_id', bill.userId)
          .gte('due_date', bill.dueDate);

        if (error) throw error;

        setState(prev => ({
          ...prev,
          bills: prev.bills.map(b =>
            (b.name === bill.name && b.dueDate >= bill.dueDate)
              ? { ...b, ...updates }
              : b
          )
        }));
        toast({ title: 'Contas futuras atualizadas' });
        return;
      }

      const { error } = await supabase.from('bills').update(dbUpdates).eq('id', id);
      if (error) throw error;

      setState(prev => ({
        ...prev,
        bills: prev.bills.map(b => b.id === id ? { ...b, ...updates } : b)
      }));
    } catch (err) { toast({ title: 'Erro ao atualizar conta', variant: 'destructive' }); }
  }, [state.bills]);

  const deleteBill = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('bills').delete().eq('id', id);
      if (error) throw error;
      setState(prev => ({ ...prev, bills: prev.bills.filter(b => b.id !== id) }));
      toast({ title: 'Conta removida' });
    } catch (err) { toast({ title: 'Erro ao remover conta', variant: 'destructive' }); }
  }, []);

  const payBill = useCallback(async (billId: string, accountId: string, paymentDate: string) => {
    try {
      const bill = state.bills.find(b => b.id === billId);
      if (!bill) return;

      // 1. Update the bill status
      await updateBill(billId, {
        status: 'paid',
        paymentDate,
        accountId
      });

      // 2. Create the associated transaction
      await addTransaction({
        date: paymentDate,
        description: `Pgto: ${bill.name}`,
        amount: bill.amount,
        type: bill.type === 'payable' ? 'expense' : 'income',
        transactionType: 'punctual',
        categoryId: bill.categoryId,
        subcategoryId: bill.subcategoryId,
        accountId: accountId,
        isPaid: true,
        userId: bill.userId
      });

      // 3. If fixed, create next month
      if (bill.isFixed) {
        const nextDate = new Date(bill.dueDate);
        nextDate.setMonth(nextDate.getMonth() + 1);

        await addBill({
          name: bill.name,
          amount: bill.amount,
          type: bill.type,
          dueDate: nextDate.toISOString().split('T')[0],
          status: 'pending',
          categoryId: bill.categoryId,
          subcategoryId: bill.subcategoryId,
          isFixed: true,
          accountId: accountId,
          startDate: bill.startDate
        }, false);
      }

      toast({ title: 'Pagamento registrado e fluxo atualizado!' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao processar pagamento', variant: 'destructive' });
    }
  }, [state.bills, updateBill, addTransaction, addBill]);

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

  const currentMonthBills = state.bills.filter(b => {
    const bDate = new Date(b.dueDate);
    const matchesViewDate = bDate.getMonth() === viewDate.getMonth() && bDate.getFullYear() === viewDate.getFullYear();

    // Filtro por data de cadastro (startDate)
    if (b.startDate) {
      const sDate = new Date(b.startDate);
      // Garantir que a conta só apareça se o mês de vencimento for igual ou posterior ao mês de cadastro
      const isAtOrAfterStart = (bDate.getFullYear() > sDate.getFullYear()) ||
        (bDate.getFullYear() === sDate.getFullYear() && bDate.getMonth() >= sDate.getMonth());
      return matchesViewDate && isAtOrAfterStart;
    }

    return matchesViewDate;
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
    currentMonthBills,
    getCardExpenses,
    getCategoryExpenses,
    getCardSettingsForDate,
    getEmergencyFundData,
    setEmergencyMonths,
    updateBudgetRule,
    addCategory,
    updateCategory,
    deleteCategory,
    addSubcategory,
    deleteSubcategory,
    addBill,
    updateBill,
    deleteBill,
    payBill,
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
    depositToGoal,
    addDebt,
    updateDebt,
    deleteDebt,
    createDebtWithInstallments,
    seedCoach
  };
}
