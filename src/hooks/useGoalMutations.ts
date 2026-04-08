import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { SavingsGoal } from '@/types/finance';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { todayLocalString } from '@/utils/dateUtils';

// --- 1. ADICIONAR META ---
export function useAddGoal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (goal: Omit<SavingsGoal, 'id' | 'userId'>) => {
      if (!user) throw new Error('Utilizador não autenticado');

      const payload: any = {
        user_id: user.id,
        name: goal.name,
        target_amount: goal.targetAmount,
        current_amount: goal.currentAmount || 0,
        deadline: goal.deadline,
        color: goal.color,
        icon: goal.icon,
        project_type: goal.projectType || 'projeto',
        purpose: goal.purpose,
        dream_start_date: goal.dreamStartDate,
        items: goal.items || []
      };

      const { data, error } = await supabase.from('savings_goals').insert(payload).select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      toast({ title: 'Sonho/Projeto lançado com sucesso!' });
    },
    onError: (err) => {
      console.error('Erro ao adicionar meta:', err);
      toast({ title: 'Erro ao criar meta', variant: 'destructive' });
    }
  });
}

// --- 2. ATUALIZAR META ---
export function useUpdateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<SavingsGoal> }) => {
      const payload: any = { ...updates };
      if (updates.targetAmount !== undefined) {
        payload.target_amount = updates.targetAmount;
        delete payload.targetAmount;
      }
      if (updates.currentAmount !== undefined) {
        payload.current_amount = updates.currentAmount;
        delete payload.currentAmount;
      }
      if (updates.projectType !== undefined) {
        payload.project_type = updates.projectType;
        delete payload.projectType;
      }
      if (updates.purpose !== undefined) {
        payload.purpose = updates.purpose;
        delete payload.purpose;
      }
      if (updates.dreamStartDate !== undefined) {
        payload.dream_start_date = updates.dreamStartDate;
        delete payload.dreamStartDate;
      }
      if (updates.items !== undefined) {
        payload.items = updates.items;
      }

      const { error } = await supabase.from('savings_goals').update(payload).eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      toast({ title: 'Sonho/Projeto atualizado!' });
    },
    onError: (err) => {
      console.error('Erro ao atualizar meta:', err);
      toast({ title: 'Erro ao atualizar meta', variant: 'destructive' });
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
      toast({ title: 'Sonho/Projeto removido com sucesso!' });
    },
    onError: (err) => {
      console.error('Erro ao remover meta:', err);
      toast({ title: 'Erro ao remover meta', variant: 'destructive' });
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
        .select('current_amount, name')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const finalGoalName = goalName || goal.name;
      const isWithdrawal = amount < 0;

      // 2. Atualiza o valor da meta
      const { error: updateError } = await supabase
        .from('savings_goals')
        .update({ current_amount: Number(goal.current_amount) + amount })
        .eq('id', id);

      if (updateError) throw updateError;

      // 3. Cria a transação (Débito se for depósito, Crédito se for retirada)
      const today = todayLocalString();
      const { error: txError } = await supabase.from('transactions').insert({
        user_id: user.id,
        description: isWithdrawal ? `Retirada: Meta ${finalGoalName}` : `Depósito: Meta ${finalGoalName}`,
        amount: Math.abs(amount), // Valor absoluto
        type: isWithdrawal ? 'income' : 'expense', // Entrada/Saída na contabilidade principal
        transaction_type: isWithdrawal ? 'income' : 'expense', // Ajusta a classificação
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
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      toast({ title: 'Depósito realizado!' });
    },
    onError: (err) => {
      console.error('Erro no depósito:', err);
      toast({ title: 'Erro ao realizar depósito', variant: 'destructive' });
    }
  });
}


