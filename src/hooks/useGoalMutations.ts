import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { SavingsGoal } from '@/types/finance';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

// --- 1. ADICIONAR META ---
export function useAddGoal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (goal: Omit<SavingsGoal, 'id' | 'userId'>) => {
      if (!user) throw new Error('Utilizador não autenticado');

      const payload = {
        user_id: user.id,
        name: goal.name,
        target_amount: goal.targetAmount,
        current_amount: goal.currentAmount || 0,
        deadline: goal.deadline,
        color: goal.color,
        icon: goal.icon
      };

      const { data, error } = await supabase.from('savings_goals').insert(payload).select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      toast({ title: 'Meta criada com sucesso!' });
    }
  });
}

// --- 2. ATUALIZAR META ---
export function useUpdateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<SavingsGoal> }) => {
      const payload: any = { ...updates };
      if (updates.targetAmount !== undefined) payload.target_amount = updates.targetAmount;
      if (updates.currentAmount !== undefined) payload.current_amount = updates.currentAmount;

      const { error } = await supabase.from('savings_goals').update(payload).eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
    }
  });
}

// --- 3. DELETAR META ---
export function useDeleteGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('savings_goals').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      toast({ title: 'Meta removida.' });
    }
  });
}

// --- 4. DEPOSITAR NA META ---
export function useDepositToGoal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, amount, accountId, goalName }: { id: string, amount: number, accountId: string, goalName: string }) => {
      if (!user) throw new Error('Utilizador não autenticado');

      // 1. Busca o valor atual da meta
      const { data: goal, error: fetchError } = await supabase
        .from('savings_goals')
        .select('current_amount')
        .eq('id', id)
        .single();
        
      if (fetchError) throw fetchError;

      // 2. Atualiza o valor da meta
      const { error: updateError } = await supabase
        .from('savings_goals')
        .update({ current_amount: Number(goal.current_amount) + amount })
        .eq('id', id);

      if (updateError) throw updateError;

      // 3. Cria a transação de saída
      const today = format(new Date(), 'yyyy-MM-dd');
      const { error: txError } = await supabase.from('transactions').insert({
        user_id: user.id,
        description: `Depósito: Meta ${goalName}`,
        amount: amount,
        type: 'expense',
        date: today,
        account_id: accountId,
        is_paid: true,
        payment_date: today
      });

      if (txError) throw txError;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({ title: 'Depósito realizado!' });
    }
  });
}
