import { useState, useCallback, useEffect, useMemo, createContext, useContext } from 'react';
import { FinanceState, Transaction, Account, CreditCard, Debt, SavingsGoal, Category, Subcategory, Bill, HabitLog, UserHabit, BudgetRule, FilterMode } from '@/types/finance';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { format, subDays, startOfMonth, endOfMonth, isAfter, isBefore, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  const [viewMode, setViewMode] = useState<FilterMode>('month');

  // --- Helper Functions (defined early to avoid ReferenceError) ---

  const getCardSettingsForDate = useCallback((card: CreditCard, targetDate: Date) => {
    if (!card.history || card.history.length === 0) return { dueDay: card.dueDay, closingDay: card.closingDay };
    const sortedHistory = [...card.history].sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());
    const match = sortedHistory.find(h => new Date(h.effectiveDate) <= targetDate);
    if (match) return { dueDay: match.dueDay, closingDay: match.closingDay };
    if (sortedHistory.length > 0) return { dueDay: sortedHistory[sortedHistory.length - 1].dueDay, closingDay: sortedHistory[sortedHistory.length - 1].closingDay };
    return { dueDay: card.dueDay, closingDay: card.closingDay };
  }, []);

  const getTransactionTargetDate = useCallback((transaction: Transaction) => {
    const tDate = new Date(transaction.date);
    if (transaction.type !== 'expense' || !transaction.cardId) return tDate;

    const card = state.creditCards.find(c => c.id === transaction.cardId);
    if (!card) return tDate;

    const { closingDay, dueDay } = getCardSettingsForDate(card, tDate);

    // Data de competência inicial: mesmo mês da compra
    let targetDate = new Date(tDate.getFullYear(), tDate.getMonth(), dueDay);

    // Se a compra foi APÓS o fechamento, joga para o próximo mês
    if (tDate.getDate() > closingDay) {
      targetDate.setMonth(targetDate.getMonth() + 1);
    }

    // Se o dia de vencimento for menor que o de fechamento (ex: fecha 25, vence dia 05 do próximo mês)
    // o targetDate já estaria no mês seguinte se tDate.getDate() > closingDay.
    // Mas precisamos garantir que refletimos o mês do VENCIMENTO da fatura.
    if (dueDay <= closingDay && tDate.getDate() <= closingDay) {
      // Caso específico: compra dia 10, fecha 25, vence dia 05. 
      // Vence dia 05 do MÊS SEGUINTE.
      targetDate.setMonth(targetDate.getMonth() + 1);
    }

    return targetDate;
  }, [state.creditCards, getCardSettingsForDate]);

  // --- Computed ---

  const currentMonthTransactions = state.transactions.filter(t => {
    const targetDate = getTransactionTargetDate(t);
    if (viewMode === 'day') {
      return targetDate.getDate() === viewDate.getDate() &&
        targetDate.getMonth() === viewDate.getMonth() &&
        targetDate.getFullYear() === viewDate.getFullYear();
    }
    if (viewMode === 'month') {
      return targetDate.getMonth() === viewDate.getMonth() &&
        targetDate.getFullYear() === viewDate.getFullYear();
    }
    // year
    return targetDate.getFullYear() === viewDate.getFullYear();
  });

  const currentMonthBills = useMemo(() => {
    const maxDate = new Date(2030, 11, 31);
    const virtualBills: Bill[] = [];

    // 1. Identificar contas fixas únicas que precisam ser projetadas
    // Agrupamos por nome + categoria para evitar que 12 meses reais gerem 12 projeções cada
    const fixedBillTemplates = state.bills
      .filter(b => b.isFixed)
      .reduce((acc, bill) => {
        const key = `${bill.name}-${bill.categoryId}`;
        if (!acc[key]) acc[key] = bill;
        return acc;
      }, {} as Record<string, Bill>);

    Object.values(fixedBillTemplates).forEach(bill => {
      const start = parseISO(bill.startDate || bill.dueDate);

      // Projetar para o período atual (viewDate)
      const [, , dStr] = (bill.dueDate || '').split('T')[0].split('-');
      const targetDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), parseInt(dStr || '1', 10) || 1);

      if (targetDate.getMonth() !== viewDate.getMonth()) {
        targetDate.setDate(0);
      }

      if (targetDate >= start && targetDate <= maxDate) {
        // Verificar se já existe QUALQUER conta real (fixa ou não) para este mês com o mesmo nome
        const exists = state.bills.find(b =>
          b.name === bill.name &&
          new Date(b.dueDate).getMonth() === viewDate.getMonth() &&
          new Date(b.dueDate).getFullYear() === viewDate.getFullYear()
        );

        if (!exists) {
          virtualBills.push({
            ...bill,
            id: `virtual-${bill.id}-${viewDate.getFullYear()}-${viewDate.getMonth()}`,
            dueDate: targetDate.toISOString(),
            status: 'pending',
            isFixed: true,
            isVirtual: true,
            originalBillId: bill.id
          } as Bill);
        }
      }
    });

    const filteredBills = [...state.bills, ...virtualBills].filter(b => {
      const bDate = new Date(b.dueDate);
      let matchesViewDate = false;

      if (viewMode === 'day') {
        matchesViewDate = bDate.getDate() === viewDate.getDate() &&
          bDate.getMonth() === viewDate.getMonth() &&
          bDate.getFullYear() === viewDate.getFullYear();
      } else if (viewMode === 'month') {
        matchesViewDate = bDate.getMonth() === viewDate.getMonth() &&
          bDate.getFullYear() === viewDate.getFullYear();
      } else {
        matchesViewDate = bDate.getFullYear() === viewDate.getFullYear();
      }

      // Filtro por data de cadastro (startDate)
      if (b.startDate) {
        const sDate = new Date(b.startDate);
        const isAtOrAfterStart = bDate.getTime() >= sDate.getTime();
        return matchesViewDate && isAtOrAfterStart;
      }

      return matchesViewDate;
    });

    return filteredBills;
  }, [state.bills, viewDate, viewMode]);

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
          overdraftLimit: a.overdraft_limit || 0,
          monthlyYieldRate: a.monthly_yield_rate || 0
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
          cardId: b.card_id,
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
        emergencyMonths: Number(localStorage.getItem('emergencyMonths')) || 12,
      });

      setLoading(false);

      // --- Reparo Automático de Saldo (Executa uma única vez) ---
      const repairDone = localStorage.getItem('balanceRepair_v20260310_final');
      if (!repairDone && accountsRes.data && transactionsRes.data) {
        const mappedTxs = (transactionsRes.data || []).map((t: any) => ({
          ...t,
          accountId: t.account_id,
          cardId: t.card_id,
          isPaid: t.is_paid,
          amount: Number(t.amount),
          type: t.type
        }));

        for (const account of accountsRes.data) {
          const accountTxs = mappedTxs.filter(t => t.accountId === account.id && t.isPaid && !t.cardId);
          const calculatedBalance = accountTxs.reduce((sum, t) => {
            return sum + (t.type === 'income' ? t.amount : -t.amount);
          }, 0);

          const roundedBalance = Math.round(calculatedBalance * 100) / 100;

          if (Math.abs(roundedBalance - Number(account.balance)) > 0.01) {
            await supabase.from('accounts').update({ balance: roundedBalance }).eq('id', account.id);
            // Atualiza o estado que acabamos de definir
            setState(prev => ({
              ...prev,
              accounts: prev.accounts.map(a => a.id === account.id ? { ...a, balance: roundedBalance } : a)
            }));
          }
        }
        localStorage.setItem('balanceRepair_v20260310_final', 'true');
        toast({ title: 'Saldos reajustados para bater com seus lançamentos!' });
      }
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
        const card = txData.cardId ? state.creditCards.find(c => c.id === txData.cardId) : null;
        let invoiceMonthYear = txData.invoiceMonthYear || null;

        if (card && !txData.isInvoicePayment) {
          // A data original da transação desta parcela específica
          const tDate = new Date(txData.date);
          // Converter para UTC meia-noite para evitar timezone shifts
          const tDateLocal = new Date(tDate.getUTCFullYear(), tDate.getUTCMonth(), tDate.getUTCDate());

          const { closingDay } = getCardSettingsForDate(card, tDateLocal);

          // A fatura de qual mês esta compra pertence?
          // Se o dia da compra for MAIOR ou IGUAL ao dia do fechamento (ex: dia 15, fecha dia 14), 
          // ela entra na fatura do mês *seguinte*.
          // Se for MENOR (ex: dia 10, fecha dia 14), entra na fatura do *próprio* mês.
          let invoiceDate = new Date(tDateLocal.getFullYear(), tDateLocal.getMonth(), 1);
          if (tDateLocal.getDate() > closingDay) {
            invoiceDate.setMonth(invoiceDate.getMonth() + 1);
          }

          invoiceMonthYear = format(invoiceDate, 'yyyy-MM');
        }

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
          invoice_month_year: invoiceMonthYear,
          is_recurring: txData.isRecurring || false,
          installment_group_id: installmentGroupId,
          installment_number: instNum || txData.installmentNumber || null,
          installment_total: instTotal || txData.installmentTotal || null,
          debt_id: txData.debtId || null,
          is_paid: txData.isPaid !== undefined ? txData.isPaid : (new Date(txData.date) <= new Date()),
          payment_date: txData.paymentDate || (txData.isPaid ? txData.date : (new Date(txData.date) <= new Date() ? txData.date : null))
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
          const [yy, mm, dd] = transaction.date.split('-').map(Number);
          const instDate = new Date(yy, mm - 1 + (i - 1), dd);
          pushTx({
            ...transaction,
            date: format(instDate, 'yyyy-MM-dd'),
            amount: val
          }, i, transaction.installmentTotal);
        }
      } else if (transaction.isRecurring) {
        for (let i = 1; i <= 12; i++) {
          const [yy, mm, dd] = transaction.date.split('-').map(Number);
          const instDate = new Date(yy, mm - 1 + (i - 1), dd);

          pushTx({
            ...transaction,
            date: format(instDate, 'yyyy-MM-dd')
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

      // 1. Atualizar transações localmente
      setState(prev => ({
        ...prev,
        transactions: [...prev.transactions, ...newTransactions]
      }));

      // 2. Atualizar Saldos e Dívidas
      for (const tx of newTransactions) {
        if (tx.isPaid && tx.accountId) {
          const change = tx.type === 'income' ? tx.amount : -tx.amount;
          updateAccountBalance(tx.accountId, change); // Agora é otimista
        }
        if (tx.debtId) {
          // Abater saldo da dívida
          const debt = state.debts.find(d => d.id === tx.debtId);
          if (debt) {
            const newRemaining = Math.max(0, (debt.remainingAmount || 0) - tx.amount);
            supabase.from('debts').update({ remaining_amount: newRemaining }).eq('id', tx.debtId).then();
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
        is_paid: updatedTx.isPaid,
        payment_date: updatedTx.paymentDate
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

      // 1. Calcular diferença de saldo se necessário
      const oldTx = state.transactions.find(t => t.id === updatedTx.id);
      if (oldTx) {
        // Estornar antigo
        if (oldTx.isPaid && oldTx.accountId) {
          const reverse = oldTx.type === 'income' ? -oldTx.amount : oldTx.amount;
          updateAccountBalance(oldTx.accountId, reverse);
        }
        // Aplicar novo
        if (updatedTx.isPaid && updatedTx.accountId) {
          const apply = updatedTx.type === 'income' ? updatedTx.amount : -updatedTx.amount;
          updateAccountBalance(updatedTx.accountId, apply);
        }
      }

      setState(prev => ({
        ...prev,
        transactions: prev.transactions.map(t => t.id === updatedTx.id ? updatedTx : t)
      }));

      // Smart Sync: Se for um pagamento de conta, atualiza a bill correspondente
      if (updatedTx.description.startsWith('Pgto: ')) {
        const billName = updatedTx.description.replace('Pgto: ', '');
        const bill = state.bills.find(b => b.name === billName && b.status === 'paid');
        if (bill) {
          updateBill(bill.id, { paymentDate: updatedTx.paymentDate || updatedTx.date });
        }
      }

      toast({ title: 'Atualizado com sucesso' });
    } catch (err) {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' });
    }
  }, [state.transactions, state.categories]);

  const deleteTransaction = useCallback(async (id: string, scope: 'this' | 'future' | 'all' = 'this') => {
    try {
      const txToDelete = state.transactions.find(t => t.id === id);
      if (!txToDelete) return;

      // 1. Atualizar o estado local IMEDIATAMENTE (Otimista)
      if (scope === 'this') {
        setState(prev => ({
          ...prev,
          transactions: prev.transactions.filter(t => t.id !== id)
        }));
      } else if (txToDelete.installmentGroupId) {
        setState(prev => ({
          ...prev,
          transactions: prev.transactions.filter(t => {
            if (t.installmentGroupId !== txToDelete.installmentGroupId) return true;
            if (scope === 'future') return (t.installmentNumber || 0) < (txToDelete.installmentNumber || 0);
            return false;
          })
        }));
      }

      // 2. Estornar saldo se a(s) transação(ões) estava(m) paga(s)
      if (scope !== 'this' && txToDelete.installmentGroupId) {
        const txsToRemove = state.transactions.filter(t => {
          if (t.installmentGroupId !== txToDelete.installmentGroupId) return false;
          if (scope === 'future') return (t.installmentNumber || 0) >= (txToDelete.installmentNumber || 0);
          return true;
        });

        for (const tx of txsToRemove) {
          if (tx.isPaid && tx.accountId) {
            const change = tx.type === 'income' ? -tx.amount : tx.amount;
            updateAccountBalance(tx.accountId, change); // Otimista, não precisa de await aqui para o UI renderizar
          }
        }

        // 3. Persistir no banco
        let query = supabase.from('transactions').delete().eq('installment_group_id', txToDelete.installmentGroupId);
        if (scope === 'future') {
          query = query.gte('installment_number', txToDelete.installmentNumber || 0);
        }
        await query;
        toast({ title: 'Parcelas removidas com sucesso' });
      } else {
        // Estornar saldo se a transação estava paga
        if (txToDelete.isPaid && txToDelete.accountId) {
          const change = txToDelete.type === 'income' ? -txToDelete.amount : txToDelete.amount;
          updateAccountBalance(txToDelete.accountId, change);
        }

        // Smart Sync: Se estiver deletando um pagamento, reabre a bill
        if (txToDelete.description.startsWith('Pgto: ')) {
          const billName = txToDelete.description.replace('Pgto: ', '');
          const bill = state.bills.find(b => b.name === billName && b.status === 'paid');
          if (bill) {
            updateBill(bill.id, { status: 'pending', paymentDate: undefined });
          }
        }

        // 3. Persistir no banco
        await supabase.from('transactions').delete().eq('id', id);
        toast({ title: 'Removido com sucesso' });
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao deletar', variant: 'destructive' });
      // Em um cenário real, poderíamos re-buscar os dados do banco aqui para garantir sincronia em caso de erro
    }
  }, [state.transactions, state.bills]);


  const togglePaid = useCallback(async (id: string, isPaid: boolean, paymentAccountId?: string, paymentDate?: string, paymentCardId?: string) => {
    try {
      const tx = state.transactions.find(t => t.id === id);
      if (!tx) return;

      const effectivePaymentDate = paymentDate || new Date().toISOString().split('T')[0];

      // Determine effective IDs based on the payment method provided
      // If paymentAccountId is passed, it's an account payment (cardId should be null)
      // If paymentCardId is passed, it's a card payment (accountId should be null)
      // If NONE are passed (standard toggle), it uses the transaction's existing IDs
      let effectiveAccountId: string | null | undefined = tx.accountId;
      let effectiveCardId: string | null | undefined = tx.cardId;

      if (paymentAccountId) {
        effectiveAccountId = paymentAccountId;
        effectiveCardId = null; // Clear card if paying from account
      } else if (paymentCardId) {
        effectiveCardId = paymentCardId;
        effectiveAccountId = null; // Clear account if paying from card
      }

      const updatePayload: any = {
        is_paid: isPaid,
        payment_date: isPaid ? effectivePaymentDate : null,
        account_id: isPaid ? (effectiveAccountId || null) : tx.accountId,
        card_id: isPaid ? (effectiveCardId || null) : tx.cardId
      };

      const { error } = await supabase.from('transactions').update(updatePayload).eq('id', id);
      // Even if error (column missing), we update locally

      setState(prev => ({
        ...prev,
        transactions: prev.transactions.map(t => t.id === id ? {
          ...t,
          isPaid,
          paymentDate: isPaid ? effectivePaymentDate : undefined,
          accountId: isPaid ? (effectiveAccountId || undefined) : tx.accountId,
          cardId: isPaid ? (effectiveCardId || undefined) : tx.cardId
        } : t)
      }));

      // Smart Sync: Se estiver desmarcando um pagamento, reabre a bill
      if (!isPaid && tx.description.startsWith('Pgto: ')) {
        const billName = tx.description.replace('Pgto: ', '');
        const bill = state.bills.find(b => b.name === billName && b.status === 'paid');
        if (bill) {
          await updateBill(bill.id, { status: 'pending', paymentDate: undefined });
        }
      }

      if (isPaid && effectiveAccountId) {
        const baseChange = tx.type === 'income' ? tx.amount : -tx.amount;
        updateAccountBalance(effectiveAccountId, baseChange);
      } else if (!isPaid && tx.isPaid && tx.accountId) {
        // Estorno: apenas se estava pago e tinha conta
        const baseChange = tx.type === 'income' ? -tx.amount : tx.amount;
        updateAccountBalance(tx.accountId, baseChange);
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
        overdraft_limit: account.overdraftLimit || 0,
        monthly_yield_rate: account.monthlyYieldRate || 0
      }).select().single();

      if (error) throw error;
      const newAccount = { ...data, accountType: data.account_type, hasOverdraft: data.has_overdraft || false, overdraftLimit: data.overdraft_limit || 0, monthlyYieldRate: data.monthly_yield_rate || 0 };
      setState(prev => ({ ...prev, accounts: [...prev.accounts, newAccount] }));
    } catch (err) { toast({ title: 'Erro ao criar conta', variant: 'destructive' }); }
  }, []);

  const updateAccountBalance = async (id: string, change: number) => {
    try {
      // 1. Otimista: tenta alterar o estado local usando o saldo atual do state
      setState(prev => {
        const acc = prev.accounts.find(a => a.id === id);
        if (!acc) return prev;

        const newBalance = Math.round((Number(acc.balance) + Number(change)) * 100) / 100;

        // 2. Persistência em background
        supabase.from('accounts').update({ balance: newBalance }).eq('id', id).then(({ error }) => {
          if (error) console.error('Erro ao persistir saldo:', error);
        });

        return {
          ...prev,
          accounts: prev.accounts.map(a => a.id === id ? { ...a, balance: newBalance } : a)
        };
      });
    } catch (err) { console.error('Erro em updateAccountBalance:', err); }
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
      if (updates.monthlyYieldRate !== undefined) dbUpdates.monthly_yield_rate = updates.monthlyYieldRate;
      await supabase.from('accounts').update(dbUpdates).eq('id', id);
      setState(prev => ({ ...prev, accounts: prev.accounts.map(a => a.id === id ? { ...a, ...updates } : a) }));
    } catch (err) { toast({ title: 'Erro ao atualizar conta', variant: 'destructive' }); }
  }, []);

  const transferBetweenAccounts = useCallback(async (fromAccountId: string, toAccountId: string, amount: number, description: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const date = new Date().toISOString();
      const groupId = crypto.randomUUID();

      // Transação de Saída (Origem)
      const { data: outTx, error: err1 } = await supabase.from('transactions').insert({
        user_id: user.id,
        description: `[Transferência] Saída - ${description}`,
        amount: amount,
        type: 'expense',
        category_id: '',
        date: date,
        account_id: fromAccountId,
        is_paid: true,
        payment_date: date,
        installment_group_id: groupId
      }).select().single();
      if (err1) throw err1;

      // Transação de Entrada (Destino)
      const { data: inTx, error: err2 } = await supabase.from('transactions').insert({
        user_id: user.id,
        description: `[Transferência] Entrada - ${description}`,
        amount: amount,
        type: 'income',
        category_id: '',
        date: date,
        account_id: toAccountId,
        is_paid: true,
        payment_date: date,
        installment_group_id: groupId
      }).select().single();
      if (err2) throw err2;

      // Update balances
      await updateAccountBalance(fromAccountId, -amount);
      await updateAccountBalance(toAccountId, amount);

      setState(prev => ({
        ...prev,
        transactions: [
          ...prev.transactions,
          { ...outTx, categoryId: outTx.category_id, accountId: outTx.account_id, isPaid: true, paymentDate: outTx.payment_date, installmentGroupId: outTx.installment_group_id },
          { ...inTx, categoryId: inTx.category_id, accountId: inTx.account_id, isPaid: true, paymentDate: inTx.payment_date, installmentGroupId: inTx.installment_group_id }
        ]
      }));

      toast({ title: 'Transferência concluída com sucesso!' });
    } catch (error) { toast({ title: 'Erro na transferência', variant: 'destructive' }); }
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
        is_active: true
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
          card_id: bill.cardId,
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
      if (updates.cardId !== undefined) dbUpdates.card_id = updates.cardId;
      if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
      if (updates.paymentDate !== undefined) dbUpdates.payment_date = updates.paymentDate;
      if (updates.isFixed !== undefined) dbUpdates.is_fixed = updates.isFixed;
      if (updates.recurrenceRule !== undefined) dbUpdates.recurrence_rule = updates.recurrenceRule;

      delete dbUpdates.categoryId;
      delete dbUpdates.accountId;
      delete dbUpdates.cardId;
      delete dbUpdates.dueDate;
      delete dbUpdates.paymentDate;
      delete dbUpdates.isFixed;
      delete dbUpdates.recurrenceRule;
      delete dbUpdates.userId;

      if (applyToFuture && bill.isFixed) {
        try {
          // Busca todas as contas vindouras relacionadas
          const { data: futureBills, error: fetchError } = await supabase
            .from('bills')
            .select('*')
            .eq('name', bill.name)
            .eq('category_id', bill.categoryId)
            .eq('user_id', bill.userId)
            .gte('due_date', bill.dueDate);

          if (fetchError) throw fetchError;
          if (!futureBills || futureBills.length === 0) return;

          // Prepara os dados de atualização para cada conta futura
          const newDayString = updates.dueDate ? updates.dueDate.split('-')[2] : null;

          const updatedBills = futureBills.map(fb => {
            let newDueDate = fb.due_date;

            // Se a data de vencimento foi alterada, atualiza o DIA na conta futura, preservando mês/ano
            if (newDayString && fb.due_date) {
              const [fbYearStr, fbMonthStr] = fb.due_date.split('-');
              const fbYear = parseInt(fbYearStr, 10);
              const fbMonth = parseInt(fbMonthStr, 10); // 1 a 12
              let targetDay = parseInt(newDayString, 10);

              // Handle end of month (e.g., setting day 31 in Feb)
              // We create a Date object just to check validity of the day in that specific month/year at noon
              const testDate = new Date(fbYear, fbMonth - 1, targetDay, 12, 0, 0);
              if (testDate.getMonth() !== (fbMonth - 1)) {
                // The day rolled over to the next month (e.g., Feb 31 -> Mar 3)
                // Find the last day of the target month instead
                const lastDayOfMonth = new Date(fbYear, fbMonth, 0, 12, 0, 0).getDate();
                targetDay = lastDayOfMonth;
              }

              const y = fbYear;
              const m = String(fbMonth).padStart(2, '0');
              const d = String(targetDay).padStart(2, '0');
              newDueDate = `${y}-${m}-${d}`;
            }

            return {
              id: fb.id,
              name: updates.name || fb.name,
              amount: updates.amount !== undefined ? updates.amount : fb.amount,
              category_id: updates.categoryId || fb.category_id,
              account_id: updates.accountId !== undefined ? updates.accountId : fb.account_id,
              card_id: updates.cardId !== undefined ? updates.cardId : fb.card_id,
              due_date: newDueDate,
              is_fixed: true,
              user_id: fb.user_id,
              type: fb.type,
              status: fb.status
            };
          });

          // Atualização em lote (Upsert)
          const { error: upsertError } = await supabase
            .from('bills')
            .upsert(updatedBills);

          if (upsertError) throw upsertError;

          // Refletir no estado local
          setState(prev => ({
            ...prev,
            bills: prev.bills.map(b => {
              const updatedB = updatedBills.find(ub => ub.id === b.id);
              if (updatedB) {
                return {
                  ...b,
                  ...updates, // Aplica nome, amount, categoria
                  dueDate: updatedB.due_date + "T00:00:00.000Z", // Sync com a data calculada
                };
              }
              return b;
            })
          }));
          toast({ title: 'Contas futuras atualizadas' });
          return;
        } catch (err) {
          console.error('Error applying to future:', err);
          throw err;
        }
      }

      const { error } = await supabase.from('bills').update(dbUpdates).eq('id', id);
      if (error) throw error;

      setState(prev => ({
        ...prev,
        bills: prev.bills.map(b => b.id === id ? { ...b, ...updates } : b)
      }));
    } catch (err) { toast({ title: 'Erro ao atualizar conta', variant: 'destructive' }); }
  }, [state.bills]);

  const deleteBill = useCallback(async (id: string, applyToFuture: boolean = false) => {
    console.log('deleteBill chamado:', { id, applyToFuture });
    try {
      const billToDelete = state.bills.find(b => b.id === id);
      console.log('Conta encontrada para deletar:', billToDelete);

      if (!billToDelete) {
        console.warn('Conta não encontrada no estado local:', id);
        return;
      }

      // 1. Otimista / Fallback: remove localmente primeiro
      if (applyToFuture && billToDelete.isFixed) {
        console.log('Removendo todas as ocorrências por nome:', billToDelete.name);
        setState(prev => ({
          ...prev,
          bills: prev.bills.filter(b =>
            !(b.name === billToDelete.name) // Agora remove TUDO (passado e futuro) como solicitado
          )
        }));
      } else {
        console.log('Removendo conta única:', id);
        setState(prev => ({ ...prev, bills: prev.bills.filter(b => b.id !== id) }));
      }

      let error;
      if (applyToFuture && billToDelete.isFixed) {
        console.log('Executando delete em lote no Supabase para:', billToDelete.name);
        const { error: batchErr } = await supabase.from('bills')
          .delete()
          .eq('name', billToDelete.name)
          .eq('user_id', billToDelete.userId);
        error = batchErr;
      } else {
        console.log('Executando delete único no Supabase para ID:', id);
        const { error: singleErr } = await supabase.from('bills').delete().eq('id', id);
        error = singleErr;
      }

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao deletar no Supabase:', error);
      } else {
        console.log('Deleção concluída com sucesso!');
        toast({ title: 'Conta removida' });
      }
    } catch (err) {
      console.error('Erro inesperado no deleteBill:', err);
      toast({ title: 'Conta removida (apenas local)', variant: 'default' });
    }
  }, [state.bills]);

  const payBill = useCallback(async (billId: string, accountId: string | undefined, paymentDate: string, cardId?: string) => {
    try {
      let bill = state.bills.find(b => b.id === billId);

      // Se não for uma conta real, verificar se é virtual
      if (!bill && billId.startsWith('virtual-')) {
        bill = currentMonthBills.find(b => b.id === billId);
      }

      if (!bill) return;

      const isVirtual = billId.startsWith('virtual-');

      // 1. Update the bill status or create a new real record if virtual
      if (isVirtual) {
        // Criar uma nova conta real marcada como paga, vinculada à original
        await addBill({
          name: bill.name,
          amount: bill.amount,
          type: bill.type,
          dueDate: bill.dueDate,
          paymentDate: paymentDate,
          status: 'paid',
          categoryId: bill.categoryId,
          subcategoryId: bill.subcategoryId,
          isFixed: false, // A instância paga não é o template fixo
          accountId: accountId || undefined,
          originalBillId: (bill as any).originalBillId
        }, false);
      } else {
        await updateBill(billId, {
          status: 'paid',
          paymentDate,
          accountId: accountId || undefined
        });
      }

      // 2. Create the associated transaction
      await addTransaction({
        date: bill.dueDate,
        paymentDate: paymentDate,
        description: `Pgto: ${bill.name}`,
        amount: bill.amount,
        type: bill.type === 'payable' ? 'expense' : 'income',
        transactionType: 'punctual',
        categoryId: bill.categoryId,
        subcategoryId: bill.subcategoryId,
        accountId: accountId || undefined,
        cardId: cardId || undefined,
        isPaid: true,
        userId: bill.userId
      });

      // 3. If fixed and NOT virtual, create next month (Legacy mode)
      // Se era uma conta real fixa, ela já criou o 'vínculo'. 
      // Com a virtualização, não precisamos mais criar a próxima manualmente no payBill.
      // Mas vamos manter se o usuário preferir registros físicos.
      if (!isVirtual && bill.isFixed) {
        // Opcional: remover a criação manual do próximo mês para evitar duplicidade com o virtualizador
        // Mas a lógica do virtualizador já ignora se existir uma conta real no mês.
      }

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
          accountId: bill.accountId, // mantém as configurações originais da conta para as próximas
          startDate: bill.startDate
        }, false);
      }

      toast({ title: 'Pagamento registrado e fluxo atualizado!' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao processar pagamento', variant: 'destructive' });
    }
  }, [state.bills, updateBill, addTransaction, addBill, currentMonthBills]);

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
  const addDebt = useCallback(async (debt: Omit<Debt, 'id' | 'userId'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const payload: any = {
        user_id: user.id,
        name: debt.name,
        total_amount: debt.totalAmount,
        remaining_amount: debt.remainingAmount,
        monthly_payment: debt.monthlyPayment,
        interest_rate_monthly: debt.interestRateMonthly || 0,
        start_date: debt.startDate || new Date().toISOString(),
      };

      if (debt.minimumPayment !== undefined && !isNaN(debt.minimumPayment)) payload.minimum_payment = debt.minimumPayment;
      if (debt.dueDay !== undefined && !isNaN(debt.dueDay)) payload.due_day = debt.dueDay;
      if (debt.strategyPriority !== undefined) payload.strategy_priority = debt.strategyPriority;

      const { data, error } = await supabase.from('debts').insert(payload).select().single();
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

  const createDebtWithInstallments = useCallback(async (debt: Omit<Debt, 'id' | 'userId'>, start: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const payload: any = {
        user_id: user.id,
        name: debt.name,
        total_amount: debt.totalAmount,
        remaining_amount: debt.remainingAmount,
        monthly_payment: debt.monthlyPayment,
        interest_rate_monthly: debt.interestRateMonthly || 0,
        start_date: start || new Date().toISOString(),
      };

      if (debt.minimumPayment !== undefined && !isNaN(debt.minimumPayment)) payload.minimum_payment = debt.minimumPayment;
      if (debt.dueDay !== undefined && !isNaN(debt.dueDay)) payload.due_day = debt.dueDay;
      if (debt.strategyPriority !== undefined) payload.strategy_priority = debt.strategyPriority;

      const { data, error } = await supabase.from('debts').insert(payload).select().single();
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
      toast({ title: 'Dívida criada com sucesso' });
    } catch (err) {
      toast({ title: 'Erro ao criar dívida a partir do modal', variant: 'destructive' });
    }
  }, []);

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

  const nextDay = useCallback(() => {
    setViewDate(prev => {
      const next = new Date(prev);
      next.setDate(next.getDate() + 1);
      return next;
    });
  }, []);

  const prevDay = useCallback(() => {
    setViewDate(prev => {
      const next = new Date(prev);
      next.setDate(next.getDate() - 1);
      return next;
    });
  }, []);

  const nextYear = useCallback(() => {
    setViewDate(prev => {
      const next = new Date(prev);
      next.setFullYear(next.getFullYear() + 1);
      return next;
    });
  }, []);

  const prevYear = useCallback(() => {
    setViewDate(prev => {
      const next = new Date(prev);
      next.setFullYear(next.getFullYear() - 1);
      return next;
    });
  }, []);


  const getCardExpenses = useCallback((cardId: string) => {
    return currentMonthTransactions
      .filter(t => t.cardId === cardId && t.type === 'expense' && !t.isInvoicePayment)
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [currentMonthTransactions]);

  const getCardUsedLimit = useCallback((cardId: string) => {
    const cardTransactions = state.transactions.filter(t => t.cardId === cardId);
    const now = new Date();

    const totalSpent = cardTransactions
      .filter(t => t.type === 'expense' && !t.isInvoicePayment)
      .filter(t => {
        // Se for recorrência, só conta se a data já passou ou é hoje
        if (t.isRecurring) {
          const tDate = new Date(t.date);
          return tDate <= now;
        }
        // Se for parcelamento ou pontual, conta tudo (reserva o limite)
        return true;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    const totalPaid = cardTransactions
      .filter(t => t.isInvoicePayment)
      .reduce((sum, t) => sum + t.amount, 0);

    return Math.max(0, totalSpent - totalPaid);
  }, [state.transactions]);

  const getCategoryExpenses = useCallback(() => {
    const expenses: Record<string, number> = {};
    currentMonthTransactions.filter(t => t.type === 'expense').forEach(t => {
      const cat = state.categories.find(c => c.id === t.categoryId);
      const name = cat ? cat.name : 'Outros';
      expenses[name] = (expenses[name] || 0) + t.amount;
    });
    return Object.entries(expenses).map(([name, value]) => ({ name, value }));
  }, [currentMonthTransactions, state.categories]);





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
    const reserveAccounts = state.accounts.filter(acc => ['savings', 'caixinha', 'investment'].includes(acc.accountType));
    const current = reserveAccounts.reduce((sum, acc) => sum + Number(acc.balance), 0);

    return {
      monthlyFixed: fixedExpenses,
      targetAmount: target,
      currentAmount: current,
      progress: target > 0 ? (current / target) * 100 : 0,
      months: state.emergencyMonths,
      reserveAccounts
    };
  }, [currentMonthTransactions, state.accounts, state.emergencyMonths, state.categories, state.categoryGroups]);

  const getViewBalance = useCallback(() => {
    // Encontrar o fim do período selecionado
    let periodEnd: Date;
    if (viewMode === 'day') {
      periodEnd = new Date(viewDate);
      periodEnd.setHours(23, 59, 59, 999);
    } else if (viewMode === 'month') {
      periodEnd = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0, 23, 59, 59, 999);
    } else {
      periodEnd = new Date(viewDate.getFullYear(), 11, 31, 23, 59, 59, 999);
    }

    const totalInitialBalance = state.accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);

    // Sum all transactions that occurred until periodEnd
    // Note: We need to know if the account 'balance' in state is the INITIAL balance or CURRENT balance.
    // Looking at addAccount/updateAccount, it seems 'balance' is the CURRENT balance in the DB.
    // However, for historical views, we need to reconstruct the balance.
    // Let's assume the DB 'balance' is the current real-time balance.

    const now = new Date();
    if (periodEnd >= now) {
      return state.accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
    }

    // Historical Balance = Current Balance - (Sum of all transactions since periodEnd)
    const delta = state.transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate > periodEnd;
    }).reduce((acc, t) => {
      // If it's an income AFTER the period, we subtract it to go back.
      // If it's an expense AFTER the period, we add it back.
      return acc + (t.type === 'income' ? -t.amount : t.amount);
    }, 0);

    return state.accounts.reduce((sum, acc) => sum + Number(acc.balance), 0) + delta;
  }, [state.accounts, state.transactions, viewDate, viewMode]);

  const getPeriodStartBalance = useCallback(() => {
    let periodStart: Date;
    if (viewMode === 'day') {
      periodStart = new Date(viewDate);
      periodStart.setHours(0, 0, 0, 0);
    } else if (viewMode === 'month') {
      periodStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1, 0, 0, 0, 0);
    } else {
      periodStart = new Date(viewDate.getFullYear(), 0, 1, 0, 0, 0, 0);
    }

    const dayBefore = subDays(periodStart, 1);
    dayBefore.setHours(23, 59, 59, 999);

    const now = new Date();
    const currentBalance = state.accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);

    // To find the balance at the exact start of the period (e.g., 01/Mar/2026 00:00:00),
    // we take the CURRENT balance and subtract the net effect of all transactions
    // that happened ON OR AFTER the start of the period and were paid.
    const delta = state.transactions.filter(t => {
      const tDate = new Date(t.date);
      const tDateLocal = new Date(tDate.getFullYear(), tDate.getMonth(), tDate.getDate());
      return tDateLocal >= periodStart;
    }).reduce((acc, t) => {
      if (!t.isPaid && new Date(t.date) > new Date()) return acc; // Exclude unpaid future transactions
      return acc + (t.type === 'income' ? -t.amount : t.amount);
    }, 0);

    return currentBalance + delta;
  }, [state.accounts, state.transactions, viewDate, viewMode]);

  const getAccountViewBalance = useCallback((accountId: string) => {
    const account = state.accounts.find(a => a.id === accountId);
    if (!account) return 0;

    const currentBalance = Number(account.balance);

    let periodEnd: Date;
    if (viewMode === 'day') {
      periodEnd = new Date(viewDate);
      periodEnd.setHours(23, 59, 59, 999);
    } else if (viewMode === 'month') {
      periodEnd = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0, 23, 59, 59, 999);
    } else {
      periodEnd = new Date(viewDate.getFullYear(), 11, 31, 23, 59, 59, 999);
    }

    const now = new Date();
    if (periodEnd >= now) return currentBalance;

    const delta = state.transactions
      .filter(t => t.accountId === accountId)
      .filter(t => new Date(t.date) > periodEnd)
      .reduce((acc, t) => acc + (t.type === 'income' ? -t.amount : t.amount), 0);

    return currentBalance + delta;
  }, [state.accounts, state.transactions, viewDate, viewMode]);

  const viewBalance = getViewBalance();

  return {
    ...state,
    loading,
    viewDate,
    viewMode,
    nextMonth,
    prevMonth,
    nextDay,
    prevDay,
    nextYear,
    prevYear,
    setViewDate,
    setViewMode,
    totalBalance: state.accounts.reduce((sum, acc) => sum + Number(acc.balance), 0),
    viewBalance,
    getAccountViewBalance,
    totalIncome: currentMonthTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0),
    totalExpenses: currentMonthTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0),
    currentMonthTransactions,
    currentMonthBills,
    getCardExpenses,
    getCardUsedLimit,
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
    transferBetweenAccounts,
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
    getPeriodStartBalance,
    seedCoach
  };
}
