import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { Debt } from '@/types/finance';
import { useAuth } from '@/contexts/AuthContext';
import { addMonths, format } from 'date-fns';
import { parseLocalDate } from '@/utils/dateUtils';

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
        due_day: debt.dueDay,
        strategy_priority: debt.strategyPriority,
        status: debt.status || 'active',
        total_installments: debt.totalInstallments
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
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.totalInstallments !== undefined) payload.total_installments = updates.totalInstallments;

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

// --- 4. RENEGOCIAR DÍVIDA ---
export function useRenegotiateDebt() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ debt }: { debt: Debt }) => {
      if (!user) throw new Error('Utilizador não autenticado');

      // 1. Atualizar status da dívida
      const { error: debtError } = await supabase
        .from('debts')
        .update({ status: 'renegotiated' })
        .eq('id', debt.id);

      if (debtError) throw debtError;

      // 2. Gerar parcelas na tabela transactions
      const count = debt.totalInstallments || 1;
      const amount = debt.monthlyPayment;
      const groupId = crypto.randomUUID();
      const baseDate = parseLocalDate(debt.startDate);
      const installments: any[] = [];

      for (let i = 0; i < count; i++) {
        const currentInstDate = addMonths(baseDate, i);
        const dateStr = format(currentInstDate, 'yyyy-MM-dd');

        installments.push({
          user_id: user.id,
          type: 'expense',
          transaction_type: 'installment',
          description: `Acordo ${debt.name} (${i + 1}/${count})`,
          amount,
          date: dateStr,
          debt_id: debt.id,
          is_paid: false,
          installment_group_id: groupId,
          installment_number: i + 1,
          installment_total: count
        });
      }

      const { error: txError } = await supabase
        .from('transactions')
        .insert(installments);

      if (txError) throw txError;

      return debt.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({ title: 'Acordo gerado com sucesso!' });
    }
  });
}


