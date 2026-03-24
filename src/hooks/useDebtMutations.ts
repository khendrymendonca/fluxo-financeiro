import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { Debt } from '@/types/finance';
import { useAuth } from '@/contexts/AuthContext';

// --- 1. ADICIONAR DÃVIDA ---
export function useAddDebt() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (debt: Omit<Debt, 'id' | 'userId'>) => {
      if (!user) throw new Error('Utilizador não autenticado');

      const payload = {
        user_id: user.id,
        name: debt.name,
        total_amount: debt.totalAmount,
        remaining_amount: debt.remainingAmount,
        monthly_payment: debt.monthlyPayment,
        interest_rate_monthly: debt.interestRateMonthly,
        minimum_payment: debt.minimumPayment,
        due_day: debt.dueDay,
        strategy_priority: debt.strategyPriority
      };

      const { data, error } = await supabase.from('debts').insert(payload).select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      toast({ title: 'Dívida registada!' });
    }
  });
}

// --- 2. ATUALIZAR DÃVIDA ---
export function useUpdateDebt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<Debt> }) => {
      const payload: any = { ...updates };
      
      if (updates.totalAmount !== undefined) payload.total_amount = updates.totalAmount;
      if (updates.remainingAmount !== undefined) payload.remaining_amount = updates.remainingAmount;
      if (updates.monthlyPayment !== undefined) payload.monthly_payment = updates.monthlyPayment;
      if (updates.interestRateMonthly !== undefined) payload.interest_rate_monthly = updates.interestRateMonthly;
      if (updates.minimumPayment !== undefined) payload.minimum_payment = updates.minimumPayment;
      if (updates.dueDay !== undefined) payload.due_day = updates.dueDay;
      if (updates.strategyPriority !== undefined) payload.strategy_priority = updates.strategyPriority;

      const { error } = await supabase.from('debts').update(payload).eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
    }
  });
}

// --- 3. DELETAR DÃVIDA ---
export function useDeleteDebt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('debts').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      toast({ title: 'Dívida removida.' });
    }
  });
}


