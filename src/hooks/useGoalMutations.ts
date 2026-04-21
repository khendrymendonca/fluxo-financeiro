import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, logSafeError } from '@/lib/supabase';
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

      const safeName = (goal.name ?? '').trim().slice(0, 150);
      const safeDescription = (goal.purpose ?? '').trim().slice(0, 500);

      const payload: any = {
        user_id: user.id,
        name: safeName,
        target_amount: goal.targetAmount,
        current_amount: goal.currentAmount || 0,
        deadline: goal.deadline,
        color: goal.color,
        icon: goal.icon,
        project_type: goal.projectType || 'projeto',
        purpose: safeDescription,
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
      logSafeError('useAddGoal', err);
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

      // Sanitização se fornecido
      if (updates.name !== undefined) payload.name = updates.name.trim().slice(0, 150);
      if (updates.purpose !== undefined) payload.purpose = updates.purpose.trim().slice(0, 500);

      if (updates.targetAmount !== undefined) {
        payload.target_amount = updates.targetAmount;
        delete (payload as any).targetAmount;
      }
      if (updates.currentAmount !== undefined) {
        payload.current_amount = updates.currentAmount;
        delete (payload as any).currentAmount;
      }
      if (updates.projectType !== undefined) {
        payload.project_type = updates.projectType;
        delete (payload as any).projectType;
      }
      if (updates.dreamStartDate !== undefined) {
        payload.dream_start_date = updates.dreamStartDate;
        delete (payload as any).dreamStartDate;
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
      logSafeError('useUpdateGoal', err);
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
      logSafeError('useDeleteGoal', err);
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

      // 2. Cria a transação PRIMEIRO (Débito se for depósito, Crédito se for retirada)
      const today = todayLocalString();
      const { data: txData, error: txError } = await supabase.from('transactions').insert({
        user_id: user.id,
        description: isWithdrawal ? `Retirada: Meta ${finalGoalName}` : `Depósito: Meta ${finalGoalName}`,
        amount: Math.abs(amount), // Valor absoluto
        type: isWithdrawal ? 'income' : 'expense', // Entrada/Saída na contabilidade principal
        transaction_type: 'adjustment', // Tipo correto para movimentações de meta
        date: today,
        account_id: accountId,
        is_paid: true,
        payment_date: today
      }).select('id').single();

      if (txError) throw txError;

      // 3. Atualiza o valor da meta
      const { error: updateError } = await supabase
        .from('savings_goals')
        .update({ current_amount: Number(goal.current_amount) + amount })
        .eq('id', id);

      // 🔄 ROLLBACK MANUAL
      if (updateError) {
        await supabase
          .from('transactions')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', txData.id);
        throw updateError;
      }

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
      logSafeError('useDepositToGoal', err);
      toast({ title: 'Erro ao realizar depósito', variant: 'destructive' });
    }
  });
}
