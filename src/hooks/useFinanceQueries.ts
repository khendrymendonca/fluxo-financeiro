import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { Transaction, Account, CreditCard, Debt, SavingsGoal, Category, Subcategory, CategoryGroup } from '@/types/finance';
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
      // Janela expandida: 3 meses antes e 3 meses depois do mês visualizado
      const windowStart = format(startOfMonth(subMonths(viewDate, 3)), 'yyyy-MM-dd');
      const windowEnd = format(endOfMonth(addMonths(viewDate, 3)), 'yyyy-MM-dd');
      const viewDateStr = format(viewDate, 'yyyy-MM');

      // Trazemos:
      // 1. Transações dentro da janela de 3 meses antes/depois (pontuais e compras de cartão)
      // 2. Transações RECORRENTES (independente da data, para Projeção)
      // 3. Transações PARCELADAS (independente da data, para Projeção)
      // 4. Itens da fatura do mês atual (compras de cartão fora da janela de datas)
      // 5. 🚨 NOVO: Todas as despesas de cartão pendentes (não pagas) para cálculo de limite global
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .is('deleted_at', null)
        .or(
          `and(date.gte.${windowStart},date.lte.${windowEnd}),` + // Pontuais e compras na janela
          `is_recurring.eq.true,` +                                // Recorrentes (para Projeção)
          `installment_group_id.not.is.null,` +                    // Parceladas (para Projeção)
          `invoice_month_year.eq.${viewDateStr},` +                // 💳 Fatura do mês atual
          `and(card_id.not.is.null,is_paid.eq.false)`              // 🚨 Histórico de cartão não pago
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
        originalBillId: t.original_bill_id
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
        progressColor: c.progresscolor,
        isClosingDateFixed: c.is_closing_date_fixed ?? false,
        isActive: c.is_active ?? true,
        history: c.history ?? [],
        limit: Number(c.limit || 0)
      })) as CreditCard[];
    }
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return (data || []).map((c: any) => ({
        ...c,
        userId: c.user_id,
        groupId: c.group_id,
        isActive: c.is_active,
        budgetGroup: c.budget_group,
        isFixed: c.is_fixed
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
        totalAmount: Number(d.total_amount) || 0,
        remainingAmount: Number(d.remaining_amount) || 0,
        installmentAmount: Number(d.installment_amount) || 0,
        interestRateMonthly: d.interest_rate_monthly,
        minimumPayment: d.minimum_payment,
        dueDay: d.due_day,
        totalInstallments: d.total_installments,
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


