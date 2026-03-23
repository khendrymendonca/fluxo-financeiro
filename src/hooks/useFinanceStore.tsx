import { useState, useCallback, useEffect, useMemo, createContext, useContext } from 'react';
import { FinanceState, Transaction, Account, CreditCard, Debt, SavingsGoal, Category, Subcategory, Bill, HabitLog, UserHabit, BudgetRule, FilterMode } from '@/types/finance';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { format, subDays, parseISO, addMonths } from 'date-fns';

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

  const toLocalDateString = useCallback((year: number, month: number, day: number): string =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`, []);

  const getCardSettingsForDate = useCallback((card: CreditCard, targetDate: Date) => {
    if (!card.history || card.history.length === 0) return { dueDay: card.dueDay, closingDay: card.closingDay };
    const sortedHistory = [...card.history].sort(
      (a, b) => parseLocalDate(b.effectiveDate).getTime() - parseLocalDate(a.effectiveDate).getTime()
    );
    const match = sortedHistory.find(h => parseLocalDate(h.effectiveDate) <= targetDate);
    if (match) return { dueDay: match.dueDay, closingDay: match.closingDay };
    if (sortedHistory.length > 0) return { dueDay: sortedHistory[sortedHistory.length - 1].dueDay, closingDay: sortedHistory[sortedHistory.length - 1].closingDay };
    return { dueDay: card.dueDay, closingDay: card.closingDay };
  }, [parseLocalDate]);

  // ✅ FIX: Lógica de competência de cartão centralizada numa única função helper
  const calcInvoiceMonthYear = useCallback((tDate: Date, card: CreditCard): string => {
    const { closingDay, dueDay } = getCardSettingsForDate(card, tDate);
    const invoiceDate = new Date(tDate.getFullYear(), tDate.getMonth(), 1);

    // Se a compra foi feita após o fechamento, ela pula para a próxima fatura
    if (tDate.getDate() > closingDay) {
      invoiceDate.setMonth(invoiceDate.getMonth() + 1);
    }

    // Se o vencimento é num dia menor que o fechamento, significa que a fatura
    // sempre vence no mês seguinte ao ciclo de compras.
    if (dueDay <= closingDay) {
      invoiceDate.setMonth(invoiceDate.getMonth() + 1);
    }

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
      // ✅ REGRA DE OURO ABSOLUTA: 
      // O registro físico manda. Se a data do registro é Março, ele SÓ aparece em Março.
      // Isso impede que lançamentos de outros meses "vazem" para o mês atual.
      const tDate = parseLocalDate(t.date);
      const isSameMonth = tDate.getMonth() === viewDate.getMonth() && tDate.getFullYear() === viewDate.getFullYear();

      // Única exceção: Pagamentos de fatura que são lançados em um mês mas pertencem a outro (competência)
      if (t.isInvoicePayment) {
        const targetDate = getTransactionTargetDate(t);
        return targetDate.getMonth() === viewDate.getMonth() && targetDate.getFullYear() === viewDate.getFullYear();
      }

      return isSameMonth;
    }).sort((a, b) => 
      parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime()
    );
  }, [state.transactions, viewDate, getTransactionTargetDate, parseLocalDate]);
  const currentMonthBills = useMemo(() => {
    const maxDate = new Date(2030, 11, 31);
    const virtualBills: Bill[] = [];

    const fixedBillTemplates = state.bills
      .filter(b => b.isFixed)
      .reduce((acc, bill) => {
        const key = `${bill.name}-${bill.categoryId}`;
        if (!acc[key]) acc[key] = bill;
        return acc;
      }, {} as Record<string, Bill>);

    Object.values(fixedBillTemplates).forEach(bill => {
      const start = parseISO(bill.startDate || bill.dueDate);
      const [, , dStr] = (bill.dueDate || '').split('T')[0].split('-');
      const targetDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), parseInt(dStr || '1', 10) || 1);

      if (targetDate.getMonth() !== viewDate.getMonth()) {
        targetDate.setDate(0);
      }

      if (targetDate >= start && targetDate <= maxDate) {
        const exists = state.bills.find(b =>
          b.name === bill.name &&
          parseLocalDate(b.dueDate).getMonth() === viewDate.getMonth() &&
          parseLocalDate(b.dueDate).getFullYear() === viewDate.getFullYear()
        );

        if (!exists) {
          virtualBills.push({
            ...bill,
            id: `virtual-${bill.id}-${viewDate.getFullYear()}-${viewDate.getMonth()}`,
            dueDate: format(targetDate, 'yyyy-MM-dd'),
            status: 'pending',
            isFixed: true,
            isVirtual: true,
            originalBillId: bill.id
          } as Bill);
        }
      }
    });

    const filteredBills = [...state.bills, ...virtualBills].filter(b => {
      const bDate = parseLocalDate(b.dueDate);
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

      if (b.startDate) {
        const sDate = parseLocalDate(b.startDate);
        return matchesViewDate && bDate.getTime() >= sDate.getTime();
      }

      return matchesViewDate;
    });

    state.debts.forEach(debt => {
      const d = new Date(viewDate);
      d.setDate(debt.dueDay || 1);
      const invoiceMonthYear = format(viewDate, 'yyyy-MM');

      const exists = state.bills.find(b =>
        b.name === `Dívida: ${debt.name}` &&
        parseLocalDate(b.dueDate).getMonth() === viewDate.getMonth() &&
        parseLocalDate(b.dueDate).getFullYear() === viewDate.getFullYear()
      );

      if (!exists) {
        filteredBills.push({
          id: `debt-${debt.id}-${invoiceMonthYear}`,
          name: `Dívida: ${debt.name}`,
          amount: debt.monthlyPayment,
          type: 'payable',
          dueDate: format(d, 'yyyy-MM-dd'),
          status: 'pending',
          isFixed: true,
          categoryId: 'debt-payment',
          isVirtual: true,
          debtId: debt.id,
          userId: debt.userId
        } as Bill);
      }
    });

    state.creditCards.forEach(card => {
      const cardTransactions = state.transactions.filter(t => t.cardId === card.id);
      const spentTxs = cardTransactions.filter(t => {
        const targetDate = getTransactionTargetDate(t);
        return !t.isInvoicePayment &&
          targetDate.getMonth() === viewDate.getMonth() &&
          targetDate.getFullYear() === viewDate.getFullYear();
      }).reduce((acc, curr) => {
        const amt = Number(curr.amount);
        return acc + (curr.type === 'income' ? -amt : amt);
      }, 0);

      const spentBills = state.bills.filter(b =>
        b.cardId === card.id &&
        b.status === 'pending' &&
        b.categoryId !== 'card-payment' &&
        parseLocalDate(b.dueDate).getMonth() === viewDate.getMonth() &&
        parseLocalDate(b.dueDate).getFullYear() === viewDate.getFullYear()
      ).reduce((acc, curr) => acc + (curr.type === 'payable' ? curr.amount : -curr.amount), 0);

      const spent = spentTxs + spentBills;
      const currentInvoiceMonthYear = format(viewDate, 'yyyy-MM');
      const paid = cardTransactions.filter(t =>
        t.isInvoicePayment && t.invoiceMonthYear === currentInvoiceMonthYear
      ).reduce((acc, curr) => acc + curr.amount, 0);

      const amount = Math.max(0, spent - paid);
      const d = new Date(viewDate);
      d.setDate(card.dueDay || 1);

      const exists = state.bills.find(b =>
        b.cardId === card.id &&
        b.categoryId === 'card-payment' &&
        parseLocalDate(b.dueDate).getMonth() === viewDate.getMonth() &&
        parseLocalDate(b.dueDate).getFullYear() === viewDate.getFullYear()
      );

      if (!exists) {
        filteredBills.push({
          id: `card-${card.id}-${currentInvoiceMonthYear}`,
          name: `Fatura: ${card.bank} - ${card.name}`,
          amount: amount,
          type: 'payable',
          dueDate: format(d, 'yyyy-MM-dd'),
          status: 'pending',
          isFixed: true,
          categoryId: 'card-payment',
          isVirtual: true,
          cardId: card.id,
          userId: card.userId
        } as Bill);
      }
    });

    return filteredBills.sort((a, b) => parseLocalDate(a.dueDate).getTime() - parseLocalDate(b.dueDate).getTime());
  }, [state.bills, state.debts, state.creditCards, state.transactions, viewDate, viewMode, parseLocalDate, getTransactionTargetDate]);

  // ✅ FIX: Sincronização Silenciosa e Automática (Backend-Style)
  // Garante que todas as faturas (antigas e novas) estejam 100% corretas no banco
  const revalidateInvoiceMonths = useCallback(async (allTransactions: Transaction[], allCards: CreditCard[]) => {
    const updates: { id: string, invoice_month_year: string }[] = [];

    // Agrupar por grupo de parcelamento para manter a sequência correta
    const grouped = allTransactions.reduce((acc, t) => {
      if (!t.cardId || t.isInvoicePayment || t.isVirtual) return acc;

      const groupId = t.installmentGroupId || `single-${t.id}`;
      if (!acc[groupId]) acc[groupId] = [];
      acc[groupId].push(t);
      return acc;
    }, {} as Record<string, Transaction[]>);

    Object.values(grouped).forEach(txs => {
      // Ordenar parcelas pelo número
      const sorted = [...txs].sort((a, b) => (a.installmentNumber || 0) - (b.installmentNumber || 0));
      const first = sorted[0];
      const card = allCards.find(c => c.id === first.cardId);
      if (!card) return;

      // Calcular a fatura da primeira parcela (ou compra única)
      const firstCorrectInv = calcInvoiceMonthYear(parseLocalDate(first.date), card);
      const [year, month] = firstCorrectInv.split('-').map(Number);

      sorted.forEach((t, index) => {
        // Para parcelamentos, a fatura progride mês a mês a partir da primeira
        const invoiceDate = new Date(year, month - 1 + index, 1);
        const correctInv = format(invoiceDate, 'yyyy-MM');

        if (t.invoiceMonthYear !== correctInv) {
          updates.push({ id: t.id, invoice_month_year: correctInv });
        }
      });
    });

    if (updates.length > 0) {
      console.log(`[Sync] Sincronizando faturas de ${updates.length} lançamentos...`);
      // Dividir e Conquistar: Atualizar o banco silenciosamente
      for (const upd of updates) {
        await supabase.from('transactions').update({ invoice_month_year: upd.invoice_month_year }).eq('id', upd.id);
      }
      return true; // Indica que houve mudanças
    }
    return false;
  }, [calcInvoiceMonthYear, parseLocalDate]);

  // ✅ FIX: setLoading(false) duplicado removido — apenas o finally garante o estado
  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setState(initialState);
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

      const loadedTransactions = (transactionsRes.data || []).map((t: any) => ({
        ...t,
        userId: t.user_id,
        transactionType: t.transaction_type,
        categoryId: t.category_id,
        subcategoryId: t.subcategory_id,
        accountId: t.account_id,
        cardId: t.card_id,
        // ✅ REGRA DE BOM SENSO: Se tem cardId e não é pagamento de fatura, já está "pago" (abateu limite)
        // Se for débito em conta, segue a regra da data ou status de pago.
        isPaid: (t.card_id && !t.is_invoice_payment) ? true : (t.is_paid !== undefined ? t.is_paid : parseLocalDate(t.date) <= new Date()),
        isRecurring: t.is_recurring,
        isAutomatic: t.is_automatic || false,
        installmentGroupId: t.installment_group_id,
        installmentNumber: t.installment_number,
        installmentTotal: t.installment_total,
        invoiceMonthYear: t.invoice_month_year,
        debtId: t.debt_id,
        date: t.date?.split('T')[0],
        paymentDate: t.payment_date?.split('T')[0]
      }));

      const loadedCards = (cardsRes.data || []).map((c: any) => ({
        ...c,
        userId: c.user_id,
        dueDay: c.due_day,
        closingDay: c.closing_day,
        history: c.history,
        limit: Number(c.limit || 0),
      }));

      // --- MÁQUINA DE SINCRONIZAÇÃO SMART (Requisição Única) ---
      const today = new Date();
      const transactionsToUpdate: any[] = [];
      const accountsToUpdate: Record<string, number> = {};

      // 1. Identificar reparos necessários em transações
      loadedTransactions.forEach(t => {
        let modified = false;
        let updatePayload: any = {};

        // Fix payment_date em recorrentes
        if (t.isRecurring && t.installmentGroupId && !t.isInvoicePayment) {
          const txDate = parseLocalDate(t.date);
          const shouldBePaid = txDate <= today;
          const targetPaymentDate = t.date.split('T')[0];
          if (shouldBePaid && t.paymentDate !== targetPaymentDate) {
            updatePayload.is_paid = true;
            updatePayload.payment_date = targetPaymentDate;
            modified = true;
          }
        }

        // Baixa Automática
        if ((t.isAutomatic || (t as any).is_automatic) && !t.isPaid && parseLocalDate(t.date) <= today && t.accountId) {
          updatePayload.is_paid = true;
          updatePayload.payment_date = t.date;
          modified = true;
        }

        if (modified) {
          transactionsToUpdate.push({ id: t.id, ...updatePayload });
          t.isPaid = updatePayload.is_paid ?? t.isPaid;
          t.paymentDate = updatePayload.payment_date ?? t.paymentDate;
        }
      });

      // 2. AUTO-HEALING: Recalcular saldos de contas baseado na HISTÓRIA REAL
      const finalAccounts = (accountsRes.data || []).map((acc: any) => {
        const accountTransactions = loadedTransactions.filter(t => 
          t.accountId === acc.id && 
          t.isPaid && 
          parseLocalDate(t.paymentDate || t.date) <= today
        );

        const realBalance = accountTransactions.reduce((sum, t) => {
          const amount = Number(t.amount);
          if (t.isInvoicePayment) return sum - amount;
          return sum + (t.type === 'income' ? amount : -amount);
        }, 0);

        if (Math.abs(acc.balance - realBalance) > 0.01) {
          accountsToUpdate[acc.id] = Math.round(realBalance * 100) / 100;
        }

        return {
          ...acc,
          balance: Math.round(realBalance * 100) / 100,
          userId: acc.user_id,
          accountType: acc.account_type,
          hasOverdraft: acc.has_overdraft || false,
          overdraftLimit: acc.overdraft_limit || 0,
          monthlyYieldRate: acc.monthly_yield_rate || 0
        };
      });

      // 3. Persistir tudo em background (Dividir e Conquistar)
      if (transactionsToUpdate.length > 0) {
        console.log(`[Sync] Persistindo ${transactionsToUpdate.length} correções...`);
        // ✅ FIX: Envia apenas campos básicos para evitar erro 400 caso colunas novas não existam
        await supabase.from('transactions').upsert(transactionsToUpdate.map(t => ({
          id: t.id,
          is_paid: t.is_paid,
          payment_date: t.payment_date
        })));
      }

      for (const [accId, balance] of Object.entries(accountsToUpdate)) {
        await supabase.from('accounts').update({ balance }).eq('id', accId);
      }

      setState({
        transactions: loadedTransactions,
        accounts: finalAccounts,
        creditCards: loadedCards,
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

      await revalidateInvoiceMonths(loadedTransactions, loadedCards);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Erro ao carregar dados', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [parseLocalDate, revalidateInvoiceMonths]);

  useEffect(() => {
    fetchInitialData();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchInitialData();
      } else {
        setState(initialState);
        setLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchInitialData]);

  // --- Utilities & Accounts ---

  const updateAccountBalance = useCallback(async (id: string, change: number) => {
    try {
      setState(prev => {
        const acc = prev.accounts.find(a => a.id === id);
        if (!acc) return prev;
        const newBalance = Math.round((Number(acc.balance) + Number(change)) * 100) / 100;

        // Mover a persistência para fora do loop de renderização/setState seria o ideal,
        // mas como o setState do React (useState) não retorna o novo valor imediatamente,
        // vamos manter a lógica de persistência disparada aqui, mas de forma que o lint não reclame
        // e que seja mais previsível.

        supabase.from('accounts').update({ balance: newBalance }).eq('id', id).then(({ error }) => {
          if (error) console.error('Erro ao persistir saldo:', error);
        });

        return {
          ...prev,
          accounts: prev.accounts.map(a => a.id === id ? { ...a, balance: newBalance } : a)
        };
      });
    } catch (err) { console.error('Erro em updateAccountBalance:', err); }
  }, []);

  // --- Bills ---

  const addBill = useCallback(async (bill: Omit<Bill, 'id' | 'userId'>, project: boolean = true) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const billsToAdd = [];
      const count = (project && bill.isFixed) ? 12 : 1;

      // ✅ FIX: Garante que IDs sejam UUIDs válidos ou null
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validCategoryId = (bill.categoryId && uuidRegex.test(bill.categoryId)) ? bill.categoryId : null;
      const validAccountId = (bill.accountId && uuidRegex.test(bill.accountId)) ? bill.accountId : null;
      const validCardId = (bill.cardId && uuidRegex.test(bill.cardId)) ? bill.cardId : null;

      for (let i = 0; i < count; i++) {
        const baseDate = parseLocalDate(bill.dueDate);
        const instDate = addMonths(baseDate, i);
        const dueStr = format(instDate, 'yyyy-MM-dd');

        billsToAdd.push({
          user_id: user.id,
          category_id: validCategoryId,
          account_id: validAccountId,
          card_id: validCardId,
          name: bill.name,
          amount: bill.amount,
          type: bill.type,
          due_date: dueStr,
          payment_date: bill.paymentDate,
          status: bill.status,
          is_fixed: bill.isFixed,
          recurrence_rule: bill.recurrenceRule,
          start_date: (bill.startDate || bill.dueDate)?.split('T')[0]
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
    } catch (err) { toast({ title: 'Erro ao agendar conta', variant: 'destructive' }); }
  }, [parseLocalDate]);

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
          const { data: futureBills, error: fetchError } = await supabase
            .from('bills')
            .select('*')
            .eq('name', bill.name)
            .eq('category_id', bill.categoryId)
            .eq('user_id', bill.userId)
            .gte('due_date', bill.dueDate);

          if (fetchError) throw fetchError;
          if (!futureBills || futureBills.length === 0) return;

          const newDayString = updates.dueDate ? updates.dueDate.split('-')[2] : null;

          const updatedBills = futureBills.map(fb => {
            let newDueDate = fb.due_date;

            if (newDayString && fb.due_date) {
              const [fbYearStr, fbMonthStr] = fb.due_date.split('-');
              const fbYear = parseInt(fbYearStr, 10);
              const fbMonth = parseInt(fbMonthStr, 10);
              let targetDay = parseInt(newDayString, 10);

              const testDate = new Date(fbYear, fbMonth - 1, targetDay, 12, 0, 0);
              if (testDate.getMonth() !== (fbMonth - 1)) {
                targetDay = new Date(fbYear, fbMonth, 0, 12, 0, 0).getDate();
              }

              newDueDate = `${fbYear}-${String(fbMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
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

          const { error: upsertError } = await supabase.from('bills').upsert(updatedBills);
          if (upsertError) throw upsertError;

          setState(prev => ({
            ...prev,
            bills: prev.bills.map(b => {
              const updatedB = updatedBills.find(ub => ub.id === b.id);
              if (updatedB) {
                return {
                  ...b,
                  ...updates,
                  dueDate: updatedB.due_date + 'T00:00:00.000Z',
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

      if (updates.paymentDate && bill.status === 'paid') {
        const paymentTx = state.transactions.find(t =>
          t.description === `Pgto: ${bill.name}` &&
          Math.abs(t.amount - bill.amount) < 0.01 &&
          t.isPaid
        );

        if (paymentTx) {
          const newDate = updates.paymentDate;
          setState(prev => ({
            ...prev,
            transactions: prev.transactions.map(t =>
              t.id === paymentTx.id ? { ...t, date: newDate, paymentDate: newDate } : t
            )
          }));
          supabase.from('transactions')
            .update({ date: newDate, payment_date: newDate })
            .eq('id', paymentTx.id)
            .then();
        }
      }
    } catch (err) { toast({ title: 'Erro ao atualizar conta', variant: 'destructive' }); }
  }, [state.bills, state.transactions]);

  const deleteBill = useCallback(async (id: string, applyToFuture: boolean = false) => {
    try {
      const billToDelete = state.bills.find(b => b.id === id);
      if (!billToDelete) return;

      if (billToDelete.status === 'paid') {
        const paymentTx = state.transactions.find(t =>
          t.description === `Pgto: ${billToDelete.name}` &&
          Math.abs(t.amount - billToDelete.amount) < 0.01 &&
          t.isPaid
        );
        if (paymentTx) {
          setState(prev => ({
            ...prev,
            transactions: prev.transactions.filter(t => t.id !== paymentTx.id)
          }));
          if (paymentTx.accountId) {
            const change = paymentTx.type === 'income' ? -paymentTx.amount : paymentTx.amount;
            updateAccountBalance(paymentTx.accountId, change);
          }
          supabase.from('transactions').delete().eq('id', paymentTx.id).then();
        }
      }

      // ✅ FIX: applyToFuture agora só remove a partir da data da conta, preservando histórico
      if (applyToFuture && billToDelete.isFixed) {
        setState(prev => ({
          ...prev,
          bills: prev.bills.filter(b =>
            !(b.name === billToDelete.name && parseLocalDate(b.dueDate) >= parseLocalDate(billToDelete.dueDate))
          )
        }));
        await supabase.from('bills')
          .delete()
          .eq('name', billToDelete.name)
          .eq('user_id', billToDelete.userId)
          .gte('due_date', billToDelete.dueDate.split('T')[0]);
      } else {
        setState(prev => ({ ...prev, bills: prev.bills.filter(b => b.id !== id) }));
        await supabase.from('bills').delete().eq('id', id);
      }

      toast({ title: 'Conta removida' });
    } catch (err) {
      console.error('Erro inesperado no deleteBill:', err);
      toast({ title: 'Erro ao remover conta', variant: 'destructive' });
    }
  }, [state.bills, state.transactions, parseLocalDate, updateAccountBalance]);

  // --- Transactions ---

  const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id'>, customInstallments?: { date: string, amount: number }[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const transactionsToAdd: any[] = [];
      const installmentGroupId = (transaction.installmentTotal || customInstallments || transaction.isRecurring) ? crypto.randomUUID() : null;

      // ✅ FIX: usa calcInvoiceMonthYear centralizado
      const pushTx = (txData: any, instNum?: number, instTotal?: number) => {
        const categoryName = state.categories.find(c => c.id === txData.categoryId)?.name || 'Outros';
        const card = txData.cardId ? state.creditCards.find(c => c.id === txData.cardId) : null;
        let invoiceMonthYear = txData.invoiceMonthYear || null;

        // ✅ FIX: só calcula se não foi explicitamente passado (importante para parcelamentos)
        if (card && !txData.isInvoicePayment && !invoiceMonthYear) {
          invoiceMonthYear = calcInvoiceMonthYear(parseLocalDate(txData.date), card);
        }

        // ✅ FIX: Garante que category_id seja um UUID válido ou null
        // O banco de dados quebra se enviarmos strings como 'card-payment' ou 'others'
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const validCategoryId = (txData.categoryId && uuidRegex.test(txData.categoryId)) ? txData.categoryId : null;

        transactionsToAdd.push({
          user_id: user.id,
          description: txData.description,
          amount: txData.amount,
          type: txData.type,
          transaction_type: txData.transactionType || 'punctual',
          category_id: validCategoryId,
          category: categoryName,
          subcategory_id: txData.subcategoryId || null,
          date: txData.date,
          account_id: txData.accountId || null,
          card_id: txData.cardId || null,
          invoice_month_year: invoiceMonthYear,
          is_recurring: txData.isRecurring || false,
          is_automatic: txData.isAutomatic || false,
          installment_group_id: installmentGroupId,
          installment_number: instNum || txData.installmentNumber || null,
          installment_total: instTotal || txData.installmentTotal || null,
          debt_id: txData.debtId || null,
          is_paid: txData.isPaid !== undefined ? txData.isPaid : (parseLocalDate(txData.date) <= new Date()),
          payment_date: txData.isPaid
            ? (txData.paymentDate || txData.date)
            : null,
          is_invoice_payment: txData.isInvoicePayment || false
        });
      };

      if (customInstallments && customInstallments.length > 0) {
        // Para parcelas customizadas, se for cartão, tentamos projetar o invoiceMonthYear
        // baseado no primeiro, para garantir que sigam meses subsequentes se as datas forem próximas
        const baseCard = transaction.cardId ? state.creditCards.find(c => c.id === transaction.cardId) : null;
        let firstInv: string | null = null;

        customInstallments.forEach((inst, index) => {
          let instInv = undefined;
          if (baseCard) {
            if (!firstInv) {
              firstInv = calcInvoiceMonthYear(parseLocalDate(inst.date), baseCard);
              instInv = firstInv;
            } else {
              const [y, m] = firstInv.split('-').map(Number);
              instInv = format(new Date(y, m - 1 + index, 1), 'yyyy-MM');
            }
          }
          pushTx({ ...transaction, date: inst.date, amount: inst.amount, invoiceMonthYear: instInv }, index + 1, customInstallments.length);
        });
      } else if (transaction.installmentTotal && transaction.installmentTotal > 1) {
        const amountPerInstallment = Math.round((transaction.amount / transaction.installmentTotal) * 100) / 100;
        const lastInstallmentAmount = Math.round((transaction.amount - (amountPerInstallment * (transaction.installmentTotal - 1))) * 100) / 100;

        const baseDate = parseLocalDate(transaction.date);
        const baseCard = transaction.cardId ? state.creditCards.find(c => c.id === transaction.cardId) : null;
        let firstInv: string | null = null;
        if (baseCard) firstInv = calcInvoiceMonthYear(baseDate, baseCard);

        for (let i = 1; i <= transaction.installmentTotal; i++) {
          const currentAmount = i === transaction.installmentTotal ? lastInstallmentAmount : amountPerInstallment;
          const instDate = addMonths(baseDate, i - 1);

          let instInv = undefined;
          if (firstInv) {
            const [y, m] = firstInv.split('-').map(Number);
            instInv = format(new Date(y, m - 1 + i - 1, 1), 'yyyy-MM');
          }

          pushTx({ ...transaction, date: format(instDate, 'yyyy-MM-dd'), amount: currentAmount, invoiceMonthYear: instInv }, i, transaction.installmentTotal);
        }
      } else if (transaction.isRecurring) {
        const baseDate = parseLocalDate(transaction.date);

        for (let i = 1; i <= 12; i++) {
          const instDate = addMonths(baseDate, i - 1);
          const instDateStr = format(instDate, 'yyyy-MM-dd');
          // ✅ FIX: Calcula isPaid e paymentDate individualmente por instância!
          // Sem isso, todas as 12 instâncias herdavam o isPaid/paymentDate do mês original,
          // fazendo com que todas aparecessem com a data do primeiro lançamento.
          const instIsPaid = parseLocalDate(instDateStr) <= new Date();
          pushTx({
            ...transaction,
            date: instDateStr,
            isPaid: instIsPaid,
            paymentDate: instIsPaid ? instDateStr : undefined,
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

      setState(prev => ({ ...prev, transactions: [...prev.transactions, ...newTransactions] }));

      const now = new Date();
      for (const tx of newTransactions) {
        if (tx.isPaid && tx.accountId) {
          const tDate = parseLocalDate(tx.paymentDate || tx.date);
          if (tDate <= now) {
            const change = tx.isInvoicePayment ? -tx.amount : (tx.type === 'income' ? tx.amount : -tx.amount);
            updateAccountBalance(tx.accountId, change);
          }
        }
        if (tx.debtId) {
          setState(prev => {
            const debt = prev.debts.find(d => d.id === tx.debtId);
            if (!debt) return prev;
            const newRemaining = Math.max(0, (Number(debt.remainingAmount) || 0) - Number(tx.amount));
            supabase.from('debts').update({ remaining_amount: newRemaining }).eq('id', tx.debtId).then();
            return {
              ...prev,
              debts: prev.debts.map(d => d.id === tx.debtId ? { ...d, remainingAmount: newRemaining } : d)
            };
          });
        }
      }

      toast({ title: 'Lançamento salvo com sucesso' });
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    }
  }, [state.categories, state.creditCards, calcInvoiceMonthYear, parseLocalDate, updateAccountBalance]);

  const updateTransaction = useCallback(async (updatedTx: Transaction, applyScope: 'this' | 'future' | 'all' = 'this') => {
    try {
      // ✅ FIX: Se for cartão, recalcular a fatura se a data ou o cartão mudarem
      if (updatedTx.cardId && !updatedTx.isInvoicePayment) {
        const card = state.creditCards.find(c => c.id === updatedTx.cardId);
        if (card) {
          updatedTx.invoiceMonthYear = calcInvoiceMonthYear(parseLocalDate(updatedTx.date), card);
        }
      }

      const categoryName = state.categories.find(c => c.id === updatedTx.categoryId)?.name || 'Outros';

      // ✅ FIX: Garante UUID válido no update
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validCategoryId = (updatedTx.categoryId && uuidRegex.test(updatedTx.categoryId)) ? updatedTx.categoryId : null;

      const updateData = {
        description: updatedTx.description,
        amount: updatedTx.amount,
        type: updatedTx.type,
        transaction_type: updatedTx.transactionType,
        category_id: validCategoryId,
        category: categoryName,
        subcategory_id: updatedTx.subcategoryId || null,
        date: updatedTx.date,
        account_id: updatedTx.accountId || null,
        card_id: updatedTx.cardId || null,
        invoice_month_year: updatedTx.invoiceMonthYear || null,
        is_paid: updatedTx.isPaid,
        payment_date: updatedTx.paymentDate,
        is_automatic: updatedTx.isAutomatic || false,
        is_recurring: updatedTx.isRecurring || false,
        installment_total: updatedTx.installmentTotal || null,
        recurrence: updatedTx.recurrence || null,
        debt_id: updatedTx.debtId || null,
        installment_group_id: updatedTx.installmentGroupId || null
      };

      if (applyScope !== 'this' && updatedTx.installmentGroupId) {
        const currentTx = state.transactions.find(t => t.id === updatedTx.id);
        if (currentTx) {
          let query = supabase
            .from('transactions')
            .update({
              description: updatedTx.description,
              amount: updatedTx.amount,
              category_id: validCategoryId,
              category: categoryName,
              subcategory_id: updatedTx.subcategoryId,
              account_id: updatedTx.accountId,
              card_id: updatedTx.cardId,
              transaction_type: updatedTx.transactionType
            })
            .eq('installment_group_id', updatedTx.installmentGroupId);

          if (applyScope === 'future') {
            query = query.gte('installment_number', updatedTx.installmentNumber || 0);
          }

          await query;

          setState(prev => ({
            ...prev,
            transactions: prev.transactions.map(t => {
              if (t.installmentGroupId === updatedTx.installmentGroupId) {
                if (applyScope === 'all' || (applyScope === 'future' && (t.installmentNumber || 0) >= (updatedTx.installmentNumber || 0))) {
                  return {
                    ...t,
                    description: updatedTx.description,
                    amount: updatedTx.amount,
                    categoryId: updatedTx.categoryId,
                    subcategoryId: updatedTx.subcategoryId,
                    accountId: updatedTx.accountId,
                    cardId: updatedTx.cardId,
                    transactionType: updatedTx.transactionType
                  };
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

      const oldTx = state.transactions.find(t => t.id === updatedTx.id);
      if (oldTx) {
        const now = new Date();
        if (oldTx.isPaid && oldTx.accountId) {
          // ✅ FIX: usa paymentDate para calcular impacto no saldo
          const oldDate = parseLocalDate(oldTx.paymentDate || oldTx.date);
          if (oldDate <= now) {
            const reverse = oldTx.isInvoicePayment ? oldTx.amount : (oldTx.type === 'income' ? -oldTx.amount : oldTx.amount);
            updateAccountBalance(oldTx.accountId, reverse);
          }
        }
        if (updatedTx.isPaid && updatedTx.accountId) {
          const newDate = parseLocalDate(updatedTx.paymentDate || updatedTx.date);
          if (newDate <= now) {
            const apply = updatedTx.isInvoicePayment ? -updatedTx.amount : (updatedTx.type === 'income' ? updatedTx.amount : -updatedTx.amount);
            updateAccountBalance(updatedTx.accountId, apply);
          }
        }

        // Atualizar saldo da dívida se necessário
        if (oldTx.debtId) {
          setState(prev => {
            const debt = prev.debts.find(d => d.id === oldTx.debtId);
            if (!debt) return prev;
            const newRemaining = (Number(debt.remainingAmount) || 0) + Number(oldTx.amount);
            supabase.from('debts').update({ remaining_amount: newRemaining }).eq('id', oldTx.debtId).then();
            return {
              ...prev,
              debts: prev.debts.map(d => d.id === oldTx.debtId ? { ...d, remainingAmount: newRemaining } : d)
            };
          });
        }
        if (updatedTx.debtId) {
          setState(prev => {
            const debt = prev.debts.find(d => d.id === updatedTx.debtId);
            if (!debt) return prev;
            const newRemaining = Math.max(0, (Number(debt.remainingAmount) || 0) - Number(updatedTx.amount));
            supabase.from('debts').update({ remaining_amount: newRemaining }).eq('id', updatedTx.debtId).then();
            return {
              ...prev,
              debts: prev.debts.map(d => d.id === updatedTx.debtId ? { ...d, remainingAmount: newRemaining } : d)
            };
          });
        }
      }

      setState(prev => ({
        ...prev,
        transactions: prev.transactions.map(t => t.id === updatedTx.id ? updatedTx : t)
      }));

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
  }, [state.transactions, state.categories, state.bills, parseLocalDate, updateAccountBalance, updateBill]);

  const deleteTransaction = useCallback(async (id: string, scope: 'this' | 'future' | 'all' = 'this') => {
    try {
      const txToDelete = state.transactions.find(t => t.id === id);
      if (!txToDelete) return;

      if (scope === 'this') {
        setState(prev => ({ ...prev, transactions: prev.transactions.filter(t => t.id !== id) }));
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

      if (scope !== 'this' && txToDelete.installmentGroupId) {
        const txsToRemove = state.transactions.filter(t => {
          if (t.installmentGroupId !== txToDelete.installmentGroupId) return false;
          if (scope === 'future') return (t.installmentNumber || 0) >= (txToDelete.installmentNumber || 0);
          return true;
        });

        for (const tx of txsToRemove) {
          if (tx.isPaid && tx.accountId) {
            const change = tx.type === 'income' ? -tx.amount : tx.amount;
            updateAccountBalance(tx.accountId, change);
          }
        }

        let query = supabase.from('transactions').delete().eq('installment_group_id', txToDelete.installmentGroupId);
        if (scope === 'future') {
          query = query.gte('installment_number', txToDelete.installmentNumber || 0);
        }
        await query;

        // Estornar saldo da dívida para as parcelas removidas
        for (const tx of txsToRemove) {
          if (tx.debtId) {
            setState(prev => {
              const debt = prev.debts.find(d => d.id === tx.debtId);
              if (!debt) return prev;
              const newRemaining = (Number(debt.remainingAmount) || 0) + Number(tx.amount);
              supabase.from('debts').update({ remaining_amount: newRemaining }).eq('id', tx.debtId).then();
              return {
                ...prev,
                debts: prev.debts.map(d => d.id === tx.debtId ? { ...d, remainingAmount: newRemaining } : d)
              };
            });
          }
        }

        toast({ title: 'Parcelas removidas com sucesso' });
      } else {
        if (txToDelete.isPaid && txToDelete.accountId) {
          const change = txToDelete.type === 'income' ? -txToDelete.amount : txToDelete.amount;
          updateAccountBalance(txToDelete.accountId, change);
        }

        if (txToDelete.debtId) {
          setState(prev => {
            const debt = prev.debts.find(d => d.id === txToDelete.debtId);
            if (!debt) return prev;
            const newRemaining = (Number(debt.remainingAmount) || 0) + Number(txToDelete.amount);
            supabase.from('debts').update({ remaining_amount: newRemaining }).eq('id', txToDelete.debtId).then();
            return {
              ...prev,
              debts: prev.debts.map(d => d.id === txToDelete.debtId ? { ...d, remainingAmount: newRemaining } : d)
            };
          });
        }

        if (txToDelete.description.startsWith('Pgto: ')) {
          const billName = txToDelete.description.replace('Pgto: ', '');
          const bill = state.bills.find(b => b.name === billName && b.status === 'paid');
          if (bill) {
            updateBill(bill.id, { status: 'pending', paymentDate: undefined });
          }
        }

        await supabase.from('transactions').delete().eq('id', id);
        toast({ title: 'Removido com sucesso' });
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao deletar', variant: 'destructive' });
    }
  }, [state.transactions, state.bills, updateAccountBalance, updateBill]);

  const togglePaid = useCallback(async (id: string, isPaid: boolean, paymentAccountId?: string, paymentDate?: string, paymentCardId?: string) => {
    try {
      const tx = state.transactions.find(t => t.id === id);
      if (!tx) return;

      const effectivePaymentDate = paymentDate || todayLocalString();

      let effectiveAccountId: string | null | undefined = tx.accountId;
      let effectiveCardId: string | null | undefined = tx.cardId;

      if (paymentAccountId) {
        effectiveAccountId = paymentAccountId;
        effectiveCardId = null;
      } else if (paymentCardId) {
        effectiveCardId = paymentCardId;
        effectiveAccountId = null;
      }

      const updatePayload: any = {
        is_paid: isPaid,
        payment_date: isPaid ? effectivePaymentDate : null,
        account_id: isPaid ? (effectiveAccountId || null) : tx.accountId,
        card_id: isPaid ? (effectiveCardId || null) : tx.cardId
      };

      await supabase.from('transactions').update(updatePayload).eq('id', id);

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

      if (!isPaid && tx.description.startsWith('Pgto: ')) {
        const billName = tx.description.replace('Pgto: ', '');
        const bill = state.bills.find(b => b.name === billName && b.status === 'paid');
        if (bill) {
          await updateBill(bill.id, { status: 'pending', paymentDate: undefined });
        }
      }

      const now = new Date();
      // Reverter saldo da conta antiga se já estava paga
      if (tx.isPaid && tx.accountId) {
        const oldDate = parseLocalDate(tx.paymentDate || tx.date);
        if (oldDate <= now) {
          const reverseChange = tx.isInvoicePayment ? tx.amount : (tx.type === 'income' ? -tx.amount : tx.amount);
          await updateAccountBalance(tx.accountId, reverseChange);
        }
      }

      // Aplicar saldo na nova conta (ou na mesma) se estiver sendo marcada como paga
      if (isPaid && effectiveAccountId) {
        const tDate = parseLocalDate(effectivePaymentDate);
        if (tDate <= now) {
          const applyChange = tx.isInvoicePayment ? -tx.amount : (tx.type === 'income' ? tx.amount : -tx.amount);
          await updateAccountBalance(effectiveAccountId, applyChange);
        }
      }
      const label = tx.type === 'income' ? 'Recebimento' : 'Pagamento';
      toast({ title: isPaid ? `${label} registrado` : `${label} estornado` });
    } catch (err) {
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' });
    }
  }, [state.transactions, state.bills, parseLocalDate, todayLocalString, updateAccountBalance, updateBill]);

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

  const transferBetweenAccounts = useCallback(async (fromAccountId: string, toId: string, amount: number, description: string, customDate?: string, toType: 'account' | 'card' = 'account') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const date = customDate || todayLocalString();
      const groupId = crypto.randomUUID();

      const { data: outTx, error: err1 } = await supabase.from('transactions').insert({
        user_id: user.id,
        description: `[Transferência] Saída - ${description}`,
        amount: amount,
        type: 'expense',
        category_id: null,
        category: 'Transferência',
        date: date,
        account_id: fromAccountId,
        is_paid: true,
        payment_date: date,
        installment_group_id: groupId
      }).select().single();
      if (err1) throw err1;

      const { data: inTx, error: err2 } = await supabase.from('transactions').insert({
        user_id: user.id,
        description: `[${toType === 'card' ? 'Pagamento Cartão' : 'Transferência'}] Entrada - ${description}`,
        amount: amount,
        type: 'income',
        category_id: null,
        category: toType === 'card' ? 'Pagamento de Fatura' : 'Transferência',
        date: date,
        account_id: toType === 'account' ? toId : null,
        card_id: toType === 'card' ? toId : null,
        is_paid: true,
        payment_date: date,
        is_invoice_payment: toType === 'card',
        installment_group_id: groupId
      }).select().single();
      if (err2) throw err2;

      const now = new Date();
      const tDate = parseLocalDate(date);
      if (tDate <= now) {
        await updateAccountBalance(fromAccountId, -amount);
        if (toType === 'account') {
          await updateAccountBalance(toId, amount);
        }
      }

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
  }, [parseLocalDate, todayLocalString, updateAccountBalance]);

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
      const { error: goalError } = await supabase.from('savings_goals').update({ current_amount: newAmount }).eq('id', goalId);
      if (goalError) throw goalError;
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
      const newCategory: Category = { ...data, userId: data.user_id, groupId: data.group_id, isActive: data.is_active };
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
      setState(prev => ({ ...prev, categories: prev.categories.map(c => c.id === id ? { ...c, ...updates } : c) }));
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
        subcategories: [...prev.subcategories, { ...data, categoryId: data.category_id, isActive: data.is_active }]
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

  // ✅ FIX: payBill agora busca corretamente contas virtuais (virtual-, card-, debt-)
  const payBill = useCallback(async (billId: string, accountId: string | undefined, paymentDate: string, cardId?: string, customAmount?: number) => {
    try {
      let bill = state.bills.find(b => b.id === billId);
      if (!bill) {
        bill = currentMonthBills.find(b => b.id === billId);
      }
      if (!bill) {
        console.warn(`Conta não encontrada: ${billId}`);
        return;
      }

      const isVirtual = billId.startsWith('virtual-') || billId.startsWith('card-') || billId.startsWith('debt-');
      const finalAmount = customAmount !== undefined ? customAmount : bill.amount;
      const isPartial = customAmount !== undefined && Math.abs(customAmount - bill.amount) > 0.01;
      const cleanPaymentDate = paymentDate.split('T')[0];

      if (isVirtual) {
        if (!isPartial) {
          await addBill({
            name: bill.name,
            amount: bill.amount,
            type: bill.type,
            dueDate: bill.dueDate.split('T')[0],
            paymentDate: cleanPaymentDate,
            status: 'paid',
            categoryId: bill.categoryId,
            subcategoryId: bill.subcategoryId,
            isFixed: false,
            accountId: accountId || undefined,
            originalBillId: (bill as any).originalBillId
          }, false);
        }
      } else {
        if (!isPartial) {
          await updateBill(billId, { status: 'paid', paymentDate: cleanPaymentDate, accountId: accountId || undefined });
        }
      }

      const isCardBill = bill.id.startsWith('card-') || !!bill.cardId;

      await addTransaction({
        date: bill.dueDate.split('T')[0],
        paymentDate: cleanPaymentDate,
        description: isPartial ? `Abatimento: ${bill.name}` : `Pgto: ${bill.name}`,
        amount: finalAmount,
        type: bill.type === 'payable' ? 'expense' : 'income',
        transactionType: 'punctual',
        categoryId: bill.categoryId,
        subcategoryId: bill.subcategoryId,
        accountId: accountId || undefined,
        cardId: isCardBill ? undefined : (bill.cardId || cardId || undefined), // se for pgto de fatura, sai da conta
        isPaid: true,
        userId: bill.userId,
        isInvoicePayment: isCardBill,
        invoiceMonthYear: isCardBill ? format(parseLocalDate(bill.dueDate), 'yyyy-MM') : undefined
      });

      toast({ title: isPartial ? 'Abatimento registrado' : 'Pagamento concluído!' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao processar pagamento', variant: 'destructive' });
    }
  }, [state.bills, currentMonthBills, addBill, updateBill, addTransaction, parseLocalDate]);

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

  // --- Debts ---

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

  // ✅ FIX: createDebtWithInstallments removida — era idêntica a addDebt.
  // Qualquer chamada a createDebtWithInstallments deve ser substituída por addDebt.

  // --- View Control ---

  const nextMonth = useCallback(() => setViewDate(prev => { const d = new Date(prev); d.setMonth(d.getMonth() + 1); return d; }), []);
  const prevMonth = useCallback(() => setViewDate(prev => { const d = new Date(prev); d.setMonth(d.getMonth() - 1); return d; }), []);
  const nextDay = useCallback(() => setViewDate(prev => { const d = new Date(prev); d.setDate(d.getDate() + 1); return d; }), []);
  const prevDay = useCallback(() => setViewDate(prev => { const d = new Date(prev); d.setDate(d.getDate() - 1); return d; }), []);
  const nextYear = useCallback(() => setViewDate(prev => { const d = new Date(prev); d.setFullYear(d.getFullYear() + 1); return d; }), []);
  const prevYear = useCallback(() => setViewDate(prev => { const d = new Date(prev); d.setFullYear(d.getFullYear() - 1); return d; }), []);

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

    // Faturas deste cartão que já foram quitadas (invoiceMonthYear pago)
    const paidInvoices = new Set(
      state.transactions
        .filter(t =>
          t.cardId === cardId &&
          t.isInvoicePayment === true &&
          !!t.invoiceMonthYear
        )
        .map(t => t.invoiceMonthYear as string)
    );

    return state.transactions
      .filter(t => {
        // Só deste cartão
        if (t.cardId !== cardId) return false;

        // Removido: if (t.type !== 'expense') return false; 
        // Agora permitimos 'income' para processar abatimentos/créditos

        if (t.isInvoicePayment === true) return false;
        // Ignora projeções virtuais de meses futuros (recorrentes ainda não cobradas)
        if (t.isVirtual) return false;

        // ✅ REGRA DE LIMITE: 
        // 1. Ignora ajustes de saldo (como Saldo Anterior) para não duplicar consumo de limite
        const desc = (t.description || '').toLowerCase();
        const categoryName = state.categories.find(c => c.id === t.categoryId)?.name?.toLowerCase() || '';
        if (desc.includes('saldo anterior') || categoryName.includes('ajuste') || desc.includes('ajuste')) {
          return false;
        }

        // 2. Se for um lançamento recorrente (fixo) e a data for futura, NÃO consome limite ainda.
        // 3. Se for um parcelamento (installmentTotal > 1), o valor total futuro DEVE consumir limite (comportamento padrão de cartão).
        const isInstallment = t.installmentTotal && t.installmentTotal > 1;
        const isFuture = parseLocalDate(t.date) > new Date();

        if (t.isRecurring && isFuture && !isInstallment) {
          return false;
        }

        // Determina a competência (usando o campo ou calculando on-the-fly)
        const competence = t.invoiceMonthYear || calcInvoiceMonthYear(parseLocalDate(t.date), card);

        // Consome limite SÓ se a fatura correspondente ainda não foi paga
        return !paidInvoices.has(competence);
      })
      .reduce((sum, t) => {
        const amt = Number(t.amount || 0);
        // expense soma, income (estorno) subtrai
        return sum + (t.type === 'expense' ? amt : -amt);
      }, 0);
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

  // ✅ FIX: getViewBalance agora segue a definição do usuário: apenas carteiras (corrente/benefícios)
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

    // Apenas contas que o usuário considera "Carteira" (Corrente e Benefícios)
    const walletAccounts = state.accounts.filter(a =>
      a.accountType === 'checking' || a.accountType.startsWith('benefit_')
    );
    const currentRealBalance = walletAccounts.reduce((sum, acc) => sum + Number(acc.balance), 0);

    const delta = state.transactions.filter(t => {
      if (!t.isPaid || !t.accountId) return false;
      // Verifica se a conta da transação é uma carteira
      const isWallet = walletAccounts.some(acc => acc.id === t.accountId);
      if (!isWallet) return false;

      const tDate = parseLocalDate(t.paymentDate || t.date);
      return tDate > periodEnd;
    }).reduce((acc, t) => {
      const amt = Number(t.amount);
      return acc + (t.type === 'income' ? -amt : amt);
    }, 0);

    return currentRealBalance + delta;
  }, [state.accounts, state.transactions, viewDate, viewMode, parseLocalDate]);

  // ✅ FIX: useEffect do hard-code do Itaú REMOVIDO

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
      .filter(t => {
        const tDate = parseLocalDate(t.paymentDate || t.date);
        return tDate.getTime() >= periodStart.getTime();
      })
      .reduce((acc, t) => acc + (t.type === 'income' ? -t.amount : t.amount), 0);

    return currentBalance + delta;
  }, [state.accounts, state.transactions, viewDate, viewMode, parseLocalDate]);

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
      .reduce((acc, t) => {
        const amt = Number(t.amount);
        return acc + (t.type === 'income' ? -amt : amt);
      }, 0);

    return currentBalance + delta;
  }, [state.accounts, state.transactions, viewDate, viewMode, parseLocalDate]);

  const viewBalance = getViewBalance();

  // ✅ NOVO: Patrimônio é a soma das carteiras (conforme definição do usuário)
  const totalNetWorth = state.accounts
    .filter(a => a.accountType === 'checking' || a.accountType.startsWith('benefit_'))
    .reduce((sum, acc) => sum + Number(acc.balance), 0);

  // ✅ NOVO: Saldo Projetado = Carteiras - Saídas Programadas (Contas Pendentes)
  const totalPendingOutflows = currentMonthBills
    .filter(b => b.status === 'pending' && b.type === 'payable')
    .reduce((sum, b) => sum + b.amount, 0);

  // Também considera transações de saída não pagas do mês (que não são cartão)
  const pendingTransactionsAmount = currentMonthTransactions
    .filter(t => !t.isPaid && t.type === 'expense' && !t.cardId)
    .reduce((sum, t) => sum + t.amount, 0);

  const projectedBalance = totalNetWorth - totalPendingOutflows - pendingTransactionsAmount;

  // ✅ FIX: totalIncome e totalExpenses consideram APENAS o que pertence ao mês de visualização
  // seguindo a mesma regra estrita do currentMonthTransactions.
  const totalIncome = currentMonthTransactions
    .filter(t => t.type === 'income' && (t.isPaid || parseLocalDate(t.date) <= new Date()))
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const totalExpenses = currentMonthTransactions
    .filter(t => t.type === 'expense' && (t.isPaid || parseLocalDate(t.date) <= new Date()))
    .reduce((acc, t) => acc + Number(t.amount), 0);

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
    totalNetWorth,
    projectedBalance, // ✅ Exportando Saldo Projetado
    getAccountViewBalance,
    totalIncome,
    totalExpenses,
    currentMonthTransactions,
    currentMonthBills,
    getCardExpenses,
    getCardUsedLimit,
    getCardAvailableLimit,
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
    transactions: state.transactions,
    getTransactionTargetDate,
    // ✅ createDebtWithInstallments substituída por addDebt
    createDebtWithInstallments: addDebt,
    getPeriodStartBalance,
    seedCoach
  };
}
