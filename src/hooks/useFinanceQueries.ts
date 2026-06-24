import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { format, startOfYear, endOfYear } from 'date-fns';
import { Transaction, Account, CreditCard, Debt, SavingsGoal, Category, Subcategory, CategoryGroup } from '@/types/finance';
import { useAuth } from '@/contexts/AuthContext';

// --- Queries ---

export function useAccounts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['accounts', user?.id],
    queryFn: async () => {
      if (!user) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase.from('accounts').select('*').eq('user_id', user.id).is('deleted_at', null);
      if (error) throw error;
      return (data || []).map((acc: any) => ({
        ...acc,
        userId: acc.user_id,
        accountType: acc.account_type,
        hasOverdraft: acc.has_overdraft || false,
        overdraftLimit: acc.overdraft_limit || 0
      })) as Account[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

export function useTransactions(viewDate: Date) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['transactions', viewDate.getFullYear(), viewDate.getMonth(), user?.id],
    queryFn: async () => {
      if (!user) throw new Error("Usuário não autenticado");
      // Janela anual: garante relatórios completos e comparativos por meses no mesmo ano
      const windowStart = format(startOfYear(viewDate), 'yyyy-MM-dd');
      const windowEnd = format(endOfYear(viewDate), 'yyyy-MM-dd');
      const viewDateStr = format(viewDate, 'yyyy-MM');

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .or(
          `and(deleted_at.is.null,date.gte.${windowStart},date.lte.${windowEnd}),` + 
          `and(deleted_at.is.null,is_recurring.eq.true),` +
          `and(deleted_at.is.null,installment_group_id.not.is.null),` +
          `and(deleted_at.is.null,invoice_month_year.eq.${viewDateStr}),` +
          `and(deleted_at.is.null,card_id.not.is.null,is_invoice_payment.eq.true),` +
          `and(deleted_at.is.null,is_paid.eq.false),` +
          `and(deleted_at.is.null,debt_id.not.is.null),` +
          `and(deleted_at.is.null,original_id.not.is.null),` +
          `and(deleted_at.not.is.null,original_id.not.is.null,is_recurring.eq.false)`
        );
      if (error) throw error;
      return (data || []).map((t: any) => ({
        ...t,
        userId: t.user_id,
        transactionType: t.transaction_type,
        categoryId: t.category_id,
        subcategoryId: t.subcategory_id,
        accountId: t.account_id,
        cardId: t.card_id,
        isPaid: t.is_paid,
        paymentDate: t.payment_date,
        isRecurring: t.is_recurring,
        isAutomatic: t.is_automatic,
        installmentGroupId: t.installment_group_id,
        installmentNumber: t.installment_number,
        installmentTotal: t.installment_total,
        invoiceMonthYear: t.invoice_month_year,
        debtId: t.debt_id,
        originalId: t.original_id,
        originalBillId: t.original_bill_id,
        isTransfer: t.is_transfer || false,
        transferGroupId: t.transfer_group_id,
        isInvoicePayment: t.is_invoice_payment || false
      })) as Transaction[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

export function useCreditCards() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['credit-cards', user?.id],
    queryFn: async () => {
      if (!user) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase.from('credit_cards').select('*').eq('user_id', user.id);
      if (error) throw error;
      return (data || []).map((c: any) => ({
        ...c,
        userId: c.user_id,
        dueDay: c.due_day,
        closingDay: c.closing_day,
        progressColor: c.progresscolor,
        isClosingDateFixed: c.is_closing_date_fixed ?? false,
        isActive: c.is_active ?? true,
        history: c.history ?? [],
        limit: Number(c.limit || 0)
      })) as CreditCard[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

export function useCategories() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['categories', user?.id],
    queryFn: async () => {
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from('categories')
        .select('id, name, type, icon, color, group_id, is_active, budget_group, is_fixed, budget_limit')
        .eq('user_id', user.id);

      if (error) throw error;
      return (data || []).map((c: any) => ({
        ...c,
        userId: c.user_id,
        groupId: c.group_id,
        isActive: c.is_active,
        budgetGroup: c.budget_group,
        isFixed: c.is_fixed,
        budgetLimit: c.budget_limit
      })) as Category[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

export function useSubcategories() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['subcategories', user?.id],
    queryFn: async () => {
      if (!user) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase.from('subcategories').select('*');
      if (error) throw error;
      return (data || []).map((s: any) => ({
        ...s,
        categoryId: s.category_id,
        isActive: s.is_active
      })) as Subcategory[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

export function useDebts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['debts', user?.id],
    queryFn: async () => {
      if (!user) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .eq('user_id', user.id)
        .order('strategy_priority', { ascending: true });
      if (error) throw error;
      return (data || []).map((d: any) => ({
        ...d,
        userId: d.user_id,
        totalAmount: Number(d.total_amount) || 0,
        remainingAmount: Number(d.remaining_amount) || 0,
        installmentAmount: Number(d.installment_amount) || 0,
        interestRateMonthly: d.interest_rate_monthly,
        minimumPayment: d.minimum_payment,
        dueDay: d.due_day,
        totalInstallments: d.total_installments,
        strategyPriority: d.strategy_priority,
        startDate: d.start_date,
        cardId: d.card_id,
        debtType: d.debt_type
      })) as Debt[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

export function useSavingsGoals() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['savings-goals', user?.id],
    queryFn: async () => {
      if (!user) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return (data || []).map((g: any) => ({
        ...g,
        userId: g.user_id,
        targetAmount: Number(g.target_amount) || 0,
        currentAmount: Number(g.current_amount) || 0,
        accountId: g.account_id,
        projectType: g.project_type,
        dreamStartDate: g.dream_start_date
      })) as SavingsGoal[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

export function useCategoryGroups() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['category-groups', user?.id],
    queryFn: async () => {
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase.from('category_groups').select('*');
      if (error) throw error;
      return data as CategoryGroup[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 60 * 24, // 24 horas
  });
}
