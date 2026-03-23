import { useState, useCallback, useEffect, useMemo, createContext, useContext } from 'react';
import { FinanceState, Transaction, Account, CreditCard, Debt, SavingsGoal, Category, Subcategory, Bill, FilterMode } from '@/types/finance';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { format, addMonths, parseISO } from 'date-fns';

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

  // --- Helper Functions ---

  const parseLocalDate = useCallback((dateStr: string) => {
    if (!dateStr) return new Date();
    const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
    return new Date(year, month - 1, day);
  }, []);

  const todayLocalString = useCallback((): string => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  }, []);

  const getCardSettingsForDate = useCallback((card: CreditCard, targetDate: Date) => {
    if (!card.history || card.history.length === 0) return { dueDay: card.dueDay, closingDay: card.closingDay };
    const sortedHistory = [...card.history].sort(
      (a, b) => parseLocalDate(b.effectiveDate).getTime() - parseLocalDate(a.effectiveDate).getTime()
    );
    const match = sortedHistory.find(h => parseLocalDate(h.effectiveDate) <= targetDate);
    if (match) return { dueDay: match.dueDay, closingDay: match.closingDay };
    return { dueDay: card.dueDay, closingDay: card.closingDay };
  }, [parseLocalDate]);

  const calcInvoiceMonthYear = useCallback((tDate: Date, card: CreditCard): string => {
    const { closingDay, dueDay } = getCardSettingsForDate(card, tDate);
    const invoiceDate = new Date(tDate.getFullYear(), tDate.getMonth(), 1);
    if (tDate.getDate() > closingDay) invoiceDate.setMonth(invoiceDate.getMonth() + 1);
    if (dueDay <= closingDay) invoiceDate.setMonth(invoiceDate.getMonth() + 1);
    return format(invoiceDate, 'yyyy-MM');
  }, [getCardSettingsForDate]);

  const getTransactionTargetDate = useCallback((transaction: Transaction) => {
    if (transaction.isInvoicePayment && transaction.invoiceMonthYear) {
      const [year, month] = transaction.invoiceMonthYear.split('-').map(Number);
      return new Date(year, month - 1, 15);
    }
    const tDate = parseLocalDate(transaction.date);
    if (!transaction.cardId) return tDate;
    if (transaction.invoiceMonthYear) {
      const [year, month] = transaction.invoiceMonthYear.split('-').map(Number);
      const card = state.creditCards.find(c => c.id === transaction.cardId);
      return new Date(year, month - 1, card?.dueDay || 15);
    }
    const card = state.creditCards.find(c => c.id === transaction.cardId);
    if (!card) return tDate;
    const { dueDay } = getCardSettingsForDate(card, tDate);
    const invoiceMonthYear = calcInvoiceMonthYear(tDate, card);
    const [year, month] = invoiceMonthYear.split('-').map(Number);
    return new Date(year, month - 1, dueDay);
  }, [state.creditCards, getCardSettingsForDate, calcInvoiceMonthYear, parseLocalDate]);

  // --- Computed ---

  const currentMonthTransactions = useMemo(() => {
    return state.transactions.filter(t => {
      const tDate = parseLocalDate(t.date);
      const isSameMonth = tDate.getMonth() === viewDate.getMonth() && tDate.getFullYear() === viewDate.getFullYear();
      if (t.isInvoicePayment) {
        const targetDate = getTransactionTargetDate(t);
        return targetDate.getMonth() === viewDate.getMonth() && targetDate.getFullYear() === viewDate.getFullYear();
      }
      return isSameMonth;
    }).sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());
  }, [state.transactions, viewDate, getTransactionTargetDate, parseLocalDate]);

  const currentMonthBills = useMemo(() => {
    const maxDate = new Date(2030, 11, 31);
    const virtualBills: Bill[] = [];
    const fixedBillTemplates = state.bills.filter(b => b.isFixed).reduce((acc, bill) => {
      const key = `${bill.name}-${bill.categoryId}`;
      if (!acc[key]) acc[key] = bill;
      return acc;
    }, {} as Record<string, Bill>);

    Object.values(fixedBillTemplates).forEach(bill => {
      const start = parseISO(bill.startDate || bill.dueDate);
      const [, , dStr] = (bill.dueDate || '').split('T')[0].split('-');
      const targetDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), parseInt(dStr || '1', 10) || 1);
      if (targetDate.getMonth() !== viewDate.getMonth()) targetDate.setDate(0);
      if (targetDate >= start && targetDate <= maxDate) {
        const exists = state.bills.find(b => b.name === bill.name && parseLocalDate(b.dueDate).getMonth() === viewDate.getMonth() && parseLocalDate(b.dueDate).getFullYear() === viewDate.getFullYear());
        if (!exists) {
          virtualBills.push({ ...bill, id: `virtual-${bill.id}-${viewDate.getFullYear()}-${viewDate.getMonth()}`, dueDate: format(targetDate, 'yyyy-MM-dd'), status: 'pending', isFixed: true, isVirtual: true, originalBillId: bill.id } as Bill);
        }
      }
    });

    const filteredBills = [...state.bills, ...virtualBills].filter(b => {
      const bDate = parseLocalDate(b.dueDate);
      let matches = false;
      if (viewMode === 'day') matches = bDate.getDate() === viewDate.getDate() && bDate.getMonth() === viewDate.getMonth() && bDate.getFullYear() === viewDate.getFullYear();
      else if (viewMode === 'month') matches = bDate.getMonth() === viewDate.getMonth() && bDate.getFullYear() === viewDate.getFullYear();
      else matches = bDate.getFullYear() === viewDate.getFullYear();
      return b.startDate ? matches && bDate.getTime() >= parseLocalDate(b.startDate).getTime() : matches;
    });

    state.debts.forEach(debt => {
      const d = new Date(viewDate);
      d.setDate(debt.dueDay || 1);
      const exists = state.bills.find(b => b.name === `Dívida: ${debt.name}` && parseLocalDate(b.dueDate).getMonth() === viewDate.getMonth() && parseLocalDate(b.dueDate).getFullYear() === viewDate.getFullYear());
      if (!exists) filteredBills.push({ id: `debt-${debt.id}-${format(viewDate, 'yyyy-MM')}`, name: `Dívida: ${debt.name}`, amount: debt.monthlyPayment, type: 'payable', dueDate: format(d, 'yyyy-MM-dd'), status: 'pending', isFixed: true, categoryId: 'debt-payment', isVirtual: true, debtId: debt.id, userId: debt.userId } as Bill);
    });

    state.creditCards.forEach(card => {
      const cardTransactions = state.transactions.filter(t => t.cardId === card.id);
      const currentInvoiceMonthYear = format(viewDate, 'yyyy-MM');
      const spentTxs = cardTransactions.filter(t => {
        const targetDate = getTransactionTargetDate(t);
        return !t.isInvoicePayment && targetDate.getMonth() === viewDate.getMonth() && targetDate.getFullYear() === viewDate.getFullYear();
      }).reduce((acc, curr) => acc + (curr.type === 'income' ? -Number(curr.amount) : Number(curr.amount)), 0);

      const spentBills = state.bills.filter(b => b.cardId === card.id && b.status === 'pending' && b.categoryId !== 'card-payment' && parseLocalDate(b.dueDate).getMonth() === viewDate.getMonth() && parseLocalDate(b.dueDate).getFullYear() === viewDate.getFullYear()).reduce((acc, curr) => acc + (curr.type === 'payable' ? curr.amount : -curr.amount), 0);
      const paid = cardTransactions.filter(t => t.isInvoicePayment && t.invoiceMonthYear === currentInvoiceMonthYear).reduce((acc, curr) => acc + curr.amount, 0);
      const amount = Math.max(0, spentTxs + spentBills - paid);
      const d = new Date(viewDate);
      d.setDate(card.dueDay || 1);

      const alreadyPaid = cardTransactions.some(t => t.isInvoicePayment && t.invoiceMonthYear === currentInvoiceMonthYear && t.isPaid);
      const exists = state.bills.find(b => b.cardId === card.id && b.categoryId === 'card-payment' && parseLocalDate(b.dueDate).getMonth() === viewDate.getMonth() && parseLocalDate(b.dueDate).getFullYear() === viewDate.getFullYear());

      if (!exists && amount > 0 && !alreadyPaid) {
        filteredBills.push({ id: `card-${card.id}-${currentInvoiceMonthYear}`, name: `Fatura: ${card.bank} - ${card.name}`, amount, type: 'payable', dueDate: format(d, 'yyyy-MM-dd'), status: 'pending', isFixed: true, categoryId: 'card-payment', isVirtual: true, cardId: card.id, userId: card.userId, invoiceMonthYear: currentInvoiceMonthYear } as Bill);
      }
    });

    return filteredBills.sort((a, b) => parseLocalDate(a.dueDate).getTime() - parseLocalDate(b.dueDate).getTime());
  }, [state.bills, state.debts, state.creditCards, state.transactions, viewDate, viewMode, parseLocalDate, getTransactionTargetDate]);

  const revalidateInvoiceMonths = useCallback(async (allTransactions: Transaction[], allCards: CreditCard[]) => {
    const updates: { id: string, invoice_month_year: string }[] = [];
    const grouped = allTransactions.reduce((acc, t) => {
      if (!t.cardId || t.isInvoicePayment || t.isVirtual) return acc;
      const groupId = t.installmentGroupId || `single-${t.id}`;
      if (!acc[groupId]) acc[groupId] = [];
      acc[groupId].push(t);
      return acc;
    }, {} as Record<string, Transaction[]>);

    Object.values(grouped).forEach(txs => {
      const sorted = [...txs].sort((a, b) => (a.installmentNumber || 0) - (b.installmentNumber || 0));
      const first = sorted[0];
      const card = allCards.find(c => c.id === first.cardId);
      if (!card) return;
      const firstCorrectInv = calcInvoiceMonthYear(parseLocalDate(first.date), card);
      const [year, month] = firstCorrectInv.split('-').map(Number);
      sorted.forEach((t, index) => {
        const correctInv = format(new Date(year, month - 1 + index, 1), 'yyyy-MM');
        if (t.invoiceMonthYear !== correctInv) updates.push({ id: t.id, invoice_month_year: correctInv });
      });
    });

    if (updates.length > 0) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('transactions').upsert(updates.map(u => ({
            id: u.id,
            invoice_month_year: u.invoice_month_year,
            user_id: user.id // Adicionado para satisfazer RLS
          })));
          return true;
        }
      } catch (e) { console.error('Upsert failed', e); }
    }
    return false;
  }, [calcInvoiceMonthYear, parseLocalDate]);

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setState(initialState); return; }

      const [transactionsRes, accountsRes, cardsRes, goalsRes, debtsRes, categoriesRes, subcategoriesRes, groupsRes, billsRes, budgetRes, habitsRes, habitLogsRes] = await Promise.all([
        supabase.from('transactions').select('*').eq('user_id', user.id),
        supabase.from('accounts').select('*').eq('user_id', user.id),
        supabase.from('credit_cards').select('*').eq('user_id', user.id),
        supabase.from('savings_goals').select('*').eq('user_id', user.id),
        supabase.from('debts').select('*').eq('user_id', user.id).order('strategy_priority', { ascending: true }),
        supabase.from('categories').select('*').eq('user_id', user.id),
        supabase.from('subcategories').select('*'), // Depende de categories.user_id, mas subcategories não tem user_id direto no schema 
        supabase.from('category_groups').select('*'), // Global
        supabase.from('bills').select('*').eq('user_id', user.id),
        supabase.from('budget_rules').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_habits').select('*').eq('user_id', user.id),
        supabase.from('habit_logs').select('*'), // Relacionado a habits
      ]);

      const loadedTransactions = (transactionsRes.data || []).map((t: any) => ({
        ...t, userId: t.user_id, transactionType: t.transaction_type, categoryId: t.category_id, subcategoryId: t.subcategory_id, accountId: t.account_id, cardId: t.card_id,
        isPaid: t.card_id ? true : (t.is_paid !== undefined ? t.is_paid : parseLocalDate(t.date) <= new Date()),
        isRecurring: t.is_recurring, isAutomatic: t.is_automatic || false, installmentGroupId: t.installment_group_id, installmentNumber: t.installment_number, installmentTotal: t.installment_total, invoiceMonthYear: t.invoice_month_year, debtId: t.debt_id, date: t.date?.split('T')[0], paymentDate: t.payment_date?.split('T')[0]
      }));

      const today = new Date();
      const txUpdates: any[] = [];
      const accUpdates: Record<string, number> = {};

      loadedTransactions.forEach(t => {
        if (t.isRecurring && t.installmentGroupId && !t.isInvoicePayment) {
          const txDate = parseLocalDate(t.date);
          const shouldBePaid = txDate <= today;
          const target = t.date.split('T')[0];
          if (shouldBePaid && t.paymentDate !== target) { txUpdates.push({ id: t.id, is_paid: true, payment_date: target }); t.isPaid = true; t.paymentDate = target; }
        }
        if (t.isAutomatic && !t.isPaid && parseLocalDate(t.date) <= today && t.accountId) {
          txUpdates.push({ id: t.id, is_paid: true, payment_date: t.date }); t.isPaid = true; t.paymentDate = t.date;
        }
      });

      const finalAccounts = (accountsRes.data || []).map((acc: any) => {
        const balance = loadedTransactions.filter(t => t.accountId === acc.id && t.isPaid && parseLocalDate(t.paymentDate || t.date) <= today)
          .reduce((sum, t) => sum + (t.isInvoicePayment ? -Number(t.amount) : (t.type === 'income' ? Number(t.amount) : -Number(t.amount))), 0);
        if (Math.abs(acc.balance - balance) > 0.01) accUpdates[acc.id] = Math.round(balance * 100) / 100;
        return { ...acc, balance: Math.round(balance * 100) / 100, userId: acc.user_id, accountType: acc.account_type, hasOverdraft: acc.has_overdraft || false, overdraftLimit: acc.overdraft_limit || 0 };
      });

      if (txUpdates.length > 0 && user) await supabase.from('transactions').upsert(txUpdates.map(u => ({
        id: u.id,
        is_paid: u.is_paid,
        user_id: user.id
      })));
      for (const [id, bal] of Object.entries(accUpdates)) await supabase.from('accounts').update({ balance: bal }).eq('id', id);

      setState({
        transactions: loadedTransactions, accounts: finalAccounts, creditCards: (cardsRes.data || []).map((c: any) => ({ ...c, userId: c.user_id, dueDay: c.due_day, closingDay: c.closing_day, history: c.history, limit: Number(c.limit || 0) })),
        savingsGoals: (goalsRes.data || []).map((g: any) => ({ ...g, userId: g.user_id, targetAmount: g.target_amount, currentAmount: g.current_amount })),
        debts: (debtsRes.data || []).map((d: any) => ({ ...d, userId: d.user_id, totalAmount: d.total_amount, remainingAmount: d.remaining_amount, monthlyPayment: d.monthly_payment, interestRateMonthly: d.interest_rate_monthly, minimumPayment: d.minimum_payment, dueDay: d.due_day, strategyPriority: d.strategy_priority })),
        categories: (categoriesRes.data || []).map((c: any) => ({ ...c, userId: c.user_id, groupId: c.group_id, isActive: c.is_active })),
        subcategories: (subcategoriesRes.data || []).map((s: any) => ({ ...s, categoryId: s.category_id, isActive: s.is_active })),
        categoryGroups: groupsRes.data || [],
        bills: (billsRes.data || []).map((b: any) => ({ ...b, userId: b.user_id, categoryId: b.category_id, subcategoryId: b.subcategory_id, accountId: b.account_id, cardId: b.card_id, dueDate: b.due_date, paymentDate: b.payment_date, isFixed: b.is_fixed })),
        budgetRule: budgetRes.data ? { id: budgetRes.data.id, userId: budgetRes.data.user_id, needsPercent: budgetRes.data.needs_percent, wantsPercent: budgetRes.data.wants_percent, savingsPercent: budgetRes.data.savings_percent } : undefined,
        habits: (habitsRes.data || []).map((h: any) => ({ ...h, userId: h.user_id, habitType: h.habit_type, isActive: h.is_active })),
        habitLogs: (habitLogsRes.data || []).map((l: any) => ({ ...l, habitId: l.habit_id, loggedDate: l.logged_date })),
        emergencyMonths: Number(localStorage.getItem('emergencyMonths')) || 12,
      });
      await revalidateInvoiceMonths(loadedTransactions, cardsRes.data || []);
    } catch (error) { console.error('Error:', error); toast({ title: 'Erro ao carregar dados', variant: 'destructive' }); } finally { setLoading(false); }
  }, [parseLocalDate, revalidateInvoiceMonths]);

  useEffect(() => {
    fetchInitialData();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { if (session) fetchInitialData(); else { setState(initialState); setLoading(false); } });
    return () => subscription.unsubscribe();
  }, [fetchInitialData]);

  const updateAccountBalance = useCallback(async (id: string, change: number) => {
    setState(prev => {
      const acc = prev.accounts.find(a => a.id === id);
      if (!acc) return prev;
      const nextBal = Math.round((Number(acc.balance) + Number(change)) * 100) / 100;
      supabase.from('accounts').update({ balance: nextBal }).eq('id', id).then();
      return { ...prev, accounts: prev.accounts.map(a => a.id === id ? { ...a, balance: nextBal } : a) };
    });
  }, []);

  const addBill = useCallback(async (bill: Omit<Bill, 'id' | 'userId'>, project: boolean = true) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validCat = (bill.categoryId && uuidRegex.test(bill.categoryId)) ? bill.categoryId : null;
      const billsToAdd = Array.from({ length: (project && bill.isFixed) ? 12 : 1 }, (_, i) => ({
        user_id: user.id, category_id: validCat, account_id: bill.accountId || null, card_id: bill.cardId || null, name: bill.name, amount: bill.amount, type: bill.type, due_date: format(addMonths(parseLocalDate(bill.dueDate), i), 'yyyy-MM-dd'), payment_date: bill.paymentDate, status: bill.status, is_fixed: bill.isFixed, start_date: (bill.startDate || bill.dueDate)?.split('T')[0]
      }));
      const { data, error } = await supabase.from('bills').insert(billsToAdd).select();
      if (error) throw error;
      const mapped = data.map((b: any) => ({ ...b, userId: b.user_id, categoryId: b.category_id, accountId: b.account_id, cardId: b.card_id, dueDate: b.due_date, paymentDate: b.payment_date, isFixed: b.is_fixed }));
      setState(prev => ({ ...prev, bills: [...prev.bills, ...mapped] }));
    } catch (err) { toast({ title: 'Erro ao agendar conta', variant: 'destructive' }); }
  }, [parseLocalDate]);

  const updateBill = useCallback(async (id: string, updates: Partial<Bill>) => {
    try {
      if (!id) return;
      const dbUpdates: any = {};

      // Mapeamento manual para garantir snake_case e evitar erros 400 (Bad Request)
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.paymentDate !== undefined) dbUpdates.payment_date = updates.paymentDate;
      if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId;
      if (updates.accountId !== undefined) dbUpdates.account_id = updates.accountId;
      if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
      if (updates.cardId !== undefined) dbUpdates.card_id = updates.cardId;

      const { error } = await supabase.from('bills').update(dbUpdates).eq('id', id);
      if (error) throw error;
      setState(prev => ({ ...prev, bills: prev.bills.map(b => b.id === id ? { ...b, ...updates } : b) }));
    } catch (err) {
      console.error('Update bill error:', err);
      toast({ title: 'Erro ao atualizar conta', variant: 'destructive' });
    }
  }, []);

  const deleteBill = useCallback(async (id: string, future: boolean = false) => {
    try {
      if (!id) return;
      const bill = state.bills.find(b => b.id === id);
      if (!bill) return;
      if (future && bill.isFixed) {
        setState(prev => ({ ...prev, bills: prev.bills.filter(b => !(b.name === bill.name && parseLocalDate(b.dueDate) >= parseLocalDate(bill.dueDate))) }));
        await supabase.from('bills').delete().eq('name', bill.name).eq('user_id', bill.userId).gte('due_date', bill.dueDate.split('T')[0]);
      } else {
        setState(prev => ({ ...prev, bills: prev.bills.filter(b => b.id !== id) }));
        await supabase.from('bills').delete().eq('id', id);
      }
    } catch (err) { toast({ title: 'Erro ao remover conta', variant: 'destructive' }); }
  }, [state.bills, parseLocalDate]);

  const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id' | 'userId'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validCat = (transaction.categoryId && uuidRegex.test(transaction.categoryId)) ? transaction.categoryId : null;
      const groupId = (transaction.installmentTotal || transaction.isRecurring) ? crypto.randomUUID() : null;
      const txs = [];
      const count = transaction.isRecurring ? 12 : (transaction.installmentTotal || 1);
      const baseDate = parseLocalDate(transaction.date);
      const card = transaction.cardId ? state.creditCards.find(c => c.id === transaction.cardId) : null;

      for (let i = 0; i < count; i++) {
        const date = format(addMonths(baseDate, i), 'yyyy-MM-dd');
        const isPaid = transaction.cardId ? true : (parseLocalDate(date) <= new Date());
        txs.push({
          user_id: user.id, description: transaction.description, amount: transaction.amount / (transaction.installmentTotal || 1), type: transaction.type, date, category_id: validCat, account_id: transaction.accountId || null, card_id: transaction.cardId || null, is_paid: isPaid, installment_group_id: groupId, installment_number: (transaction.installmentTotal ? i + 1 : null), installment_total: transaction.installmentTotal || null, is_recurring: transaction.isRecurring, is_automatic: transaction.isAutomatic, is_invoice_payment: transaction.isInvoicePayment,
          invoice_month_year: (card && !transaction.isInvoicePayment) ? calcInvoiceMonthYear(parseLocalDate(date), card) : transaction.invoiceMonthYear
        });
      }
      const { data, error } = await supabase.from('transactions').insert(txs).select();
      if (error) throw error;
      const mapped = data.map((t: any) => ({ ...t, userId: t.user_id, transactionType: t.transaction_type, categoryId: t.category_id, accountId: t.account_id, cardId: t.card_id, installmentGroupId: t.installment_group_id, installmentNumber: t.installment_number, installmentTotal: t.installment_total, invoiceMonthYear: t.invoice_month_year, isRecurring: t.is_recurring, isPaid: t.is_paid, paymentDate: t.payment_date }));
      setState(prev => ({ ...prev, transactions: [...prev.transactions, ...mapped] }));
      for (const t of mapped) if (t.isPaid && t.accountId && parseLocalDate(t.paymentDate || t.date) <= new Date()) await updateAccountBalance(t.accountId, t.isInvoicePayment ? -t.amount : (t.type === 'income' ? t.amount : -t.amount));
    } catch (err) { toast({ title: 'Erro ao salvar', variant: 'destructive' }); }
  }, [state.creditCards, calcInvoiceMonthYear, parseLocalDate, updateAccountBalance]);

  const updateTransaction = useCallback(async (tx: Transaction, scope: 'this' | 'future' | 'all' = 'this') => {
    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validCat = (tx.categoryId && uuidRegex.test(tx.categoryId)) ? tx.categoryId : null;
      const payload = { description: tx.description, amount: tx.amount, category_id: validCat, account_id: tx.accountId, card_id: tx.cardId, is_paid: tx.isPaid, is_automatic: tx.isAutomatic };
      await supabase.from('transactions').update(payload).eq('id', tx.id);
      await fetchInitialData();
    } catch (err) { toast({ title: 'Erro ao atualizar', variant: 'destructive' }); }
  }, [fetchInitialData]);

  const deleteTransaction = useCallback(async (id: string) => {
    try {
      await supabase.from('transactions').delete().eq('id', id);
      setState(prev => ({ ...prev, transactions: prev.transactions.filter(t => t.id !== id) }));
    } catch (err) { toast({ title: 'Erro ao deletar', variant: 'destructive' }); }
  }, []);

  const togglePaid = useCallback(async (id: string, isPaid: boolean, accId?: string, date?: string, cardId?: string) => {
    try {
      const tx = state.transactions.find(t => t.id === id);
      if (!tx) return;
      const payload: any = {
        is_paid: isPaid,
        account_id: cardId ? null : (accId || tx.accountId),
        card_id: cardId || tx.cardId
      };
      await supabase.from('transactions').update(payload).eq('id', id);
      await fetchInitialData();
    } catch (err) { toast({ title: 'Erro ao alterar status', variant: 'destructive' }); }
  }, [state.transactions, todayLocalString, fetchInitialData]);

  const payBill = useCallback(async (bill: Bill, accountId?: string, paymentDate?: string, isPartial?: boolean, partialAmount?: number, cardId?: string) => {
    try {
      const cleanPaymentDate = (paymentDate ?? todayLocalString()).split('T')[0];
      const payAmount = isPartial && partialAmount ? partialAmount : (bill.amount ?? 0);
      const isCardBill = !!(bill as any).cardId && bill.categoryId === 'card-payment';
      const isDebtBill = !!(bill as any).debtId && bill.categoryId === 'debt-payment';
      const safeInv = isCardBill ? ((bill as any).invoiceMonthYear ?? format(viewDate, 'yyyy-MM')) : undefined;

      await addTransaction({
        description: isPartial ? `Abatimento: ${bill.name}` : `Pgto: ${bill.name}`,
        amount: payAmount, type: 'expense', date: cleanPaymentDate, accountId: accountId ?? undefined,
        cardId: cardId || (bill as any).cardId || undefined, isPaid: true, paymentDate: cleanPaymentDate,
        isInvoicePayment: isCardBill, invoiceMonthYear: safeInv, debtId: isDebtBill ? (bill as any).debtId : undefined, transactionType: 'punctual'
      } as any);

      if (!bill.isVirtual && bill.id) await updateBill(bill.id, { status: 'paid', paymentDate: cleanPaymentDate });
      else if (isCardBill) {
        setState(prev => {
          if (prev.transactions.some(t => t.isInvoicePayment && t.invoiceMonthYear === safeInv && t.isPaid && t.cardId === (bill as any).cardId)) return prev;
          return { ...prev, transactions: [...prev.transactions, { id: crypto.randomUUID(), description: `Pgto: ${bill.name}`, amount: payAmount, type: 'expense', date: cleanPaymentDate, accountId, cardId: cardId || (bill as any).cardId, isPaid: true, paymentDate: cleanPaymentDate, isInvoicePayment: true, invoiceMonthYear: safeInv, transactionType: 'punctual', userId: prev.transactions[0]?.userId || '' } as any] };
        });
        return;
      } else if (!isPartial) {
        await addBill({ name: bill.name, amount: payAmount, type: bill.type, dueDate: (bill.dueDate ?? '').split('T')[0] || cleanPaymentDate, paymentDate: cleanPaymentDate, status: 'paid', categoryId: bill.categoryId, subcategoryId: bill.subcategoryId, isFixed: false, accountId: accountId ?? undefined, originalBillId: (bill as any).originalBillId }, false);
      }
      toast({ title: 'Pagamento concluído!' });
    } catch (err) { toast({ title: 'Erro ao baixar conta', variant: 'destructive' }); }
  }, [todayLocalString, addTransaction, addBill, updateBill, viewDate]);

  const addAccount = useCallback(async (acc: any) => { await supabase.from('accounts').insert({ ...acc, user_id: (await supabase.auth.getUser()).data.user?.id }); await fetchInitialData(); }, [fetchInitialData]);
  const deleteAccount = useCallback(async (id: string) => { await supabase.from('accounts').delete().eq('id', id); await fetchInitialData(); }, [fetchInitialData]);
  const updateAccount = useCallback(async (id: string, upd: any) => { await supabase.from('accounts').update(upd).eq('id', id); await fetchInitialData(); }, [fetchInitialData]);
  const transferBetweenAccounts = useCallback(async (from: string, to: string, amt: number, desc: string, date?: string, type: string = 'account') => {
    const d = date || todayLocalString();
    await supabase.from('transactions').insert([{ description: `[Saída] ${desc}`, amount: amt, type: 'expense', account_id: from, date: d, is_paid: true, payment_date: d }, { description: `[Entrada] ${desc}`, amount: amt, type: 'income', account_id: type === 'account' ? to : null, card_id: type === 'card' ? to : null, date: d, is_paid: true, payment_date: d, is_invoice_payment: type === 'card' }]);
    await fetchInitialData();
  }, [todayLocalString, fetchInitialData]);

  const addCreditCard = useCallback(async (c: any) => { await supabase.from('credit_cards').insert({ ...c, user_id: (await supabase.auth.getUser()).data.user?.id }); await fetchInitialData(); }, [fetchInitialData]);
  const updateCreditCard = useCallback(async (c: CreditCard) => { await supabase.from('credit_cards').update(c).eq('id', c.id); await fetchInitialData(); }, [fetchInitialData]);
  const deleteCreditCard = useCallback(async (id: string) => { await supabase.from('credit_cards').delete().eq('id', id); await fetchInitialData(); }, [fetchInitialData]);

  const addSavingsGoal = useCallback(async (g: any) => { await supabase.from('savings_goals').insert({ ...g, user_id: (await supabase.auth.getUser()).data.user?.id }); await fetchInitialData(); }, [fetchInitialData]);
  const depositToGoal = useCallback(async (id: string, amt: number, accId: string) => {
    const { data: goal } = await supabase.from('savings_goals').select('current_amount').eq('id', id).single();
    await supabase.from('savings_goals').update({ current_amount: Number(goal.current_amount) + amt }).eq('id', id);
    await updateAccountBalance(accId, -amt);
    await fetchInitialData();
  }, [updateAccountBalance, fetchInitialData]);

  const getCardExpenses = useCallback((cardId: string) => {
    const cardTransactions = state.transactions.filter(t => t.cardId === cardId);
    const currentInvoiceMonthYear = format(viewDate, 'yyyy-MM');
    const paid = cardTransactions.filter(t =>
      t.isInvoicePayment && t.invoiceMonthYear === currentInvoiceMonthYear
    ).reduce((acc, curr) => acc + curr.amount, 0);

    const totalSpent = cardTransactions.filter(t => {
      const targetDate = getTransactionTargetDate(t);
      return !t.isInvoicePayment &&
        targetDate.getMonth() === viewDate.getMonth() &&
        targetDate.getFullYear() === viewDate.getFullYear();
    }).reduce((acc, curr) => acc + (curr.type === 'expense' ? curr.amount : -curr.amount), 0);

    return Math.max(0, totalSpent - paid);
  }, [state.transactions, viewDate, getTransactionTargetDate]);

  const getCardUsedLimit = useCallback((cardId: string): number => {
    if (!cardId) return 0;
    const card = state.creditCards.find(c => c.id === cardId);
    if (!card) return 0;
    const paidInvoices = new Set(
      state.transactions
        .filter(t => t.cardId === cardId && t.isInvoicePayment === true && !!t.invoiceMonthYear)
        .map(t => t.invoiceMonthYear as string)
    );
    return state.transactions
      .filter(t => {
        if (t.cardId !== cardId) return false;
        if (t.isInvoicePayment === true) return false;
        if (t.isVirtual) return false;
        const desc = (t.description || '').toLowerCase();
        const categoryName = state.categories.find(c => c.id === t.categoryId)?.name?.toLowerCase() || '';
        if (desc.includes('saldo anterior') || categoryName.includes('ajuste') || desc.includes('ajuste')) return false;
        const isInstallment = t.installmentTotal && t.installmentTotal > 1;
        const isFuture = parseLocalDate(t.date) > new Date();
        if (t.isRecurring && isFuture && !isInstallment) return false;
        const competence = t.invoiceMonthYear || calcInvoiceMonthYear(parseLocalDate(t.date), card);
        return !paidInvoices.has(competence);
      })
      .reduce((sum, t) => sum + (t.type === 'expense' ? Number(t.amount) : -Number(t.amount)), 0);
  }, [state.transactions, state.creditCards, state.categories, calcInvoiceMonthYear, parseLocalDate]);

  const getCardAvailableLimit = useCallback((cardId: string): number => {
    const card = state.creditCards.find((c) => c.id === cardId);
    if (!card) return 0;
    const used = getCardUsedLimit(cardId);
    return Math.max(0, Number(card.limit || 0) - used);
  }, [state.creditCards, getCardUsedLimit]);

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
    const needsGroup = state.categoryGroups.find(g => g.name === 'needs');
    const needsCategoryIds = state.categories.filter(c => c.groupId === needsGroup?.id).map(c => c.id);
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
    const delta = state.transactions
      .filter(t => t.accountId === accountId && t.isPaid)
      .filter(t => parseLocalDate(t.paymentDate || t.date) > periodEnd)
      .reduce((acc, t) => acc + (t.type === 'income' ? -Number(t.amount) : Number(t.amount)), 0);
    return currentBalance + delta;
  }, [state.accounts, state.transactions, viewDate, viewMode, parseLocalDate]);

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
    const currentBalance = state.accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
    const delta = state.transactions
      .filter(t => t.isPaid && t.accountId)
      .filter(t => parseLocalDate(t.paymentDate || t.date).getTime() >= periodStart.getTime())
      .reduce((acc, t) => acc + (t.type === 'income' ? -t.amount : t.amount), 0);
    return currentBalance + delta;
  }, [state.accounts, state.transactions, viewDate, viewMode, parseLocalDate]);

  const nextMonth = useCallback(() => setViewDate(prev => addMonths(prev, 1)), []);
  const prevMonth = useCallback(() => setViewDate(prev => addMonths(prev, -1)), []);
  const nextDay = useCallback(() => setViewDate(prev => { const d = new Date(prev); d.setDate(d.getDate() + 1); return d; }), []);
  const prevDay = useCallback(() => setViewDate(prev => { const d = new Date(prev); d.setDate(d.getDate() - 1); return d; }), []);
  const nextYear = useCallback(() => setViewDate(prev => { const d = new Date(prev); d.setFullYear(d.getFullYear() + 1); return d; }), []);
  const prevYear = useCallback(() => setViewDate(prev => { const d = new Date(prev); d.setFullYear(d.getFullYear() - 1); return d; }), []);

  const addCategory = useCallback(async (cat: any) => { await supabase.from('categories').insert({ ...cat, user_id: (await supabase.auth.getUser()).data.user?.id }); await fetchInitialData(); }, [fetchInitialData]);
  const updateCategory = useCallback(async (id: string, upd: any) => { await supabase.from('categories').update(upd).eq('id', id); await fetchInitialData(); }, [fetchInitialData]);
  const deleteCategory = useCallback(async (id: string) => { await supabase.from('categories').delete().eq('id', id); await fetchInitialData(); }, [fetchInitialData]);
  const addSubcategory = useCallback(async (sub: any) => { await supabase.from('subcategories').insert(sub); await fetchInitialData(); }, [fetchInitialData]);
  const deleteSubcategory = useCallback(async (id: string) => { await supabase.from('subcategories').delete().eq('id', id); await fetchInitialData(); }, [fetchInitialData]);

  const addDebt = useCallback(async (debt: any) => { await supabase.from('debts').insert({ ...debt, user_id: (await supabase.auth.getUser()).data.user?.id }); await fetchInitialData(); }, [fetchInitialData]);
  const updateDebt = useCallback(async (id: string, upd: any) => { await supabase.from('debts').update(upd).eq('id', id); await fetchInitialData(); }, [fetchInitialData]);
  const deleteDebt = useCallback(async (id: string) => { await supabase.from('debts').delete().eq('id', id); await fetchInitialData(); }, [fetchInitialData]);

  const seedCoach = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const needsGroup = state.categoryGroups.find(g => g.name === 'needs');
      const wantsGroup = state.categoryGroups.find(g => g.name === 'wants');
      const savingsGroup = state.categoryGroups.find(g => g.name === 'savings');
      if (!needsGroup || !wantsGroup || !savingsGroup) {
        toast({ title: 'Grupos de categorias não encontrados. Verifique a configuração do banco.', variant: 'destructive' });
        return;
      }
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
      await supabase.from('categories').insert(defaultCategories);
      await fetchInitialData();
      toast({ title: 'Coach Ativado! Categorias prontas. 🚀' });
    } catch (err) { toast({ title: 'Erro ao ativar Coach', variant: 'destructive' }); }
  }, [state.categoryGroups, fetchInitialData]);

  const updateSavingsGoal = useCallback(async (id: string, updates: Partial<SavingsGoal>) => {
    try {
      const payload: any = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.targetAmount !== undefined) payload.target_amount = updates.targetAmount;
      if (updates.currentAmount !== undefined) payload.current_amount = updates.currentAmount;
      if (updates.deadline !== undefined) payload.deadline = updates.deadline;
      if (updates.color !== undefined) payload.color = updates.color;
      if (updates.icon !== undefined) payload.icon = updates.icon;
      await supabase.from('savings_goals').update(payload).eq('id', id);
      setState(prev => ({ ...prev, savingsGoals: prev.savingsGoals.map(g => g.id === id ? { ...g, ...updates } : g) }));
    } catch (err) { toast({ title: 'Erro ao atualizar meta', variant: 'destructive' }); }
  }, []);

  const deleteSavingsGoal = useCallback(async (id: string) => {
    try {
      await supabase.from('savings_goals').delete().eq('id', id);
      setState(prev => ({ ...prev, savingsGoals: prev.savingsGoals.filter(g => g.id !== id) }));
    } catch (err) { toast({ title: 'Erro ao deletar meta', variant: 'destructive' }); }
  }, []);

  const totalNetWorth = state.accounts
    .filter(a => a.accountType === 'checking' || a.accountType.startsWith('benefit_'))
    .reduce((sum, acc) => sum + Number(acc.balance), 0);

  const getViewBalance = useCallback(() => {
    let periodEnd: Date;
    if (viewMode === 'day') {
      periodEnd = new Date(viewDate);
      periodEnd.setHours(23, 59, 59, 999);
    } else if (viewMode === 'month') {
      periodEnd = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0, 23, 59, 59, 999);
    } else {
      periodEnd = new Date(viewDate.getFullYear(), 11, 31, 23, 59, 59, 999);
    }
    const walletAccounts = state.accounts.filter(a => a.accountType === 'checking' || a.accountType.startsWith('benefit_'));
    const currentRealBalance = walletAccounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
    const delta = state.transactions.filter(t => {
      if (!t.isPaid || !t.accountId) return false;
      const isWallet = walletAccounts.some(acc => acc.id === t.accountId);
      if (!isWallet) return false;
      const tDate = parseLocalDate(t.paymentDate || t.date);
      return tDate > periodEnd;
    }).reduce((acc, t) => acc + (t.type === 'income' ? -Number(t.amount) : Number(t.amount)), 0);
    return currentRealBalance + delta;
  }, [state.accounts, state.transactions, viewDate, viewMode, parseLocalDate]);

  const viewBalance = getViewBalance();

  const totalPendingOutflows = currentMonthBills
    .filter(b => b.status === 'pending' && b.type === 'payable')
    .reduce((sum, b) => sum + b.amount, 0);

  const pendingTransactionsAmount = currentMonthTransactions
    .filter(t => !t.isPaid && t.type === 'expense' && !t.cardId)
    .reduce((sum, t) => sum + t.amount, 0);

  const projectedBalance = totalNetWorth - totalPendingOutflows - pendingTransactionsAmount;

  const totalIncome = currentMonthTransactions
    .filter(t => t.type === 'income' && (t.isPaid || parseLocalDate(t.date) <= new Date()))
    .reduce((s, t) => s + Number(t.amount), 0);

  const totalExpenses = currentMonthTransactions
    .filter(t => t.type === 'expense' && (t.isPaid || parseLocalDate(t.date) <= new Date()))
    .reduce((s, t) => s + Number(t.amount), 0);

  return {
    ...state,
    loading,
    viewDate,
    viewMode,
    setViewDate,
    setViewMode,
    totalBalance: state.accounts.reduce((sum, acc) => sum + Number(acc.balance), 0),
    totalNetWorth,
    projectedBalance,
    totalIncome,
    totalExpenses,
    currentMonthTransactions,
    currentMonthBills,
    nextMonth,
    prevMonth,
    nextDay,
    prevDay,
    nextYear,
    prevYear,
    getCardExpenses,
    getCardUsedLimit,
    getCardAvailableLimit,
    getCategoryExpenses,
    getCardSettingsForDate,
    getEmergencyFundData,
    setEmergencyMonths,
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
    getTransactionTargetDate,
    getAccountViewBalance,
    getPeriodStartBalance,
    seedCoach,
    createDebtWithInstallments: addDebt
  };
}
