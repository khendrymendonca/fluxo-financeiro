import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { Transaction, Account, CreditCard, Bill, Debt, SavingsGoal, Category, Subcategory, CategoryGroup } from '@/types/finance';
import { toast } from '@/components/ui/use-toast';

// --- Queries ---

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('accounts').select('*');
      if (error) throw error;
      return (data || []).map((acc: any) => ({
        ...acc,
        userId: acc.user_id,
        accountType: acc.account_type,
        hasOverdraft: acc.has_overdraft || false,
        overdraftLimit: acc.overdraft_limit || 0
      })) as Account[];
    }
  });
}

export function useTransactions(viewDate: Date) {
  return useQuery({
    queryKey: ['transactions', viewDate.getFullYear(), viewDate.getMonth()],
    queryFn: async () => {
      const start = format(startOfMonth(viewDate), 'yyyy-MM-dd');
      const end = format(endOfMonth(viewDate), 'yyyy-MM-dd');
      const viewDateStr = format(viewDate, 'yyyy-MM');

      // Trazemos:
      // 1. Transações NORMAIS deste mês
      // 2. Transações RECORRENTES que começaram antes/durante este mês
      // 3. Transações que pertencem Ã  FATURA deste mês (mesmo que a data seja do mês anterior)
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .is('deleted_at', null)
        .or(`and(is_recurring.eq.false,date.gte.${start},date.lte.${end}),and(is_recurring.eq.true,date.lte.${end}),invoice_month_year.eq.${viewDateStr}`);

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
        debtId: t.debt_id
      })) as Transaction[];
    }
  });
}


export function useCreditCards() {
  return useQuery({
    queryKey: ['credit-cards'],
    queryFn: async () => {
      const { data, error } = await supabase.from('credit_cards').select('*');
      if (error) throw error;
      return (data || []).map((c: any) => ({
        ...c,
        userId: c.user_id,
        dueDay: c.due_day,
        closingDay: c.closing_day,
        limit: Number(c.limit || 0)
      })) as CreditCard[];
    }
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*');
      if (error) throw error;
      return (data || []).map((c: any) => ({
        ...c,
        userId: c.user_id,
        groupId: c.group_id,
        isActive: c.is_active
      })) as Category[];
    }
  });
}

export function useSubcategories() {
  return useQuery({
    queryKey: ['subcategories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subcategories').select('*');
      if (error) throw error;
      return (data || []).map((s: any) => ({
        ...s,
        categoryId: s.category_id,
        isActive: s.is_active
      })) as Subcategory[];
    }
  });
}

export function useDebts() {
  return useQuery({
    queryKey: ['debts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .order('strategy_priority', { ascending: true });
      if (error) throw error;
      return (data || []).map((d: any) => ({
        ...d,
        userId: d.user_id,
        totalAmount: d.total_amount,
        remainingAmount: d.remaining_amount,
        monthlyPayment: d.monthly_payment,
        interestRateMonthly: d.interest_rate_monthly,
        minimumPayment: d.minimum_payment,
        dueDay: d.due_day,
        strategyPriority: d.strategy_priority
      })) as Debt[];
    }
  });
}

export function useSavingsGoals() {
  return useQuery({
    queryKey: ['savings-goals'],
    queryFn: async () => {
      const { data, error } = await supabase.from('savings_goals').select('*');
      if (error) throw error;
      return (data || []).map((g: any) => ({
        ...g,
        userId: g.user_id,
        targetAmount: g.target_amount,
        currentAmount: g.current_amount
      })) as SavingsGoal[];
    }
  });
}

export function useCategoryGroups() {
  return useQuery({
    queryKey: ['category-groups'],
    queryFn: async () => {
      const { data, error } = await supabase.from('category_groups').select('*');
      if (error) throw error;
      return data as CategoryGroup[];
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 horas
  });
}


