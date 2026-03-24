import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { Account } from '@/types/finance';
import { useAuth } from '@/contexts/AuthContext';

// --- 1. ADICIONAR CONTA ---
export function useAddAccount() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (account: Omit<Account, 'id' | 'userId'>) => {
      if (!user) throw new Error('Utilizador não autenticado');

      const { data, error } = await supabase.from('accounts').insert({
        name: account.name,
        balance: account.balance,
        account_type: account.accountType,
        color: account.color,
        icon: account.icon,
        user_id: user.id,
        has_overdraft: account.hasOverdraft,
        overdraft_limit: account.overdraftLimit
      }).select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({ title: 'Conta criada com sucesso!' });
    }
  });
}

// --- 2. ATUALIZAR CONTA ---
export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<Account> }) => {
      const payload: any = { ...updates };
      if (updates.accountType) payload.account_type = updates.accountType;
      if (updates.hasOverdraft !== undefined) payload.has_overdraft = updates.hasOverdraft;
      if (updates.overdraftLimit !== undefined) payload.overdraft_limit = updates.overdraftLimit;
      
      const { error } = await supabase.from('accounts').update(payload).eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({ title: 'Conta atualizada!' });
    }
  });
}

// --- 3. DELETAR CONTA ---
export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('accounts').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({ title: 'Conta removida.' });
    }
  });
}

// --- 4. TRANSFERÊNCIA ENTRE CONTAS ---
export function useTransferBetweenAccounts() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ from, to, amount, description, date, type = 'account' }: { from: string, to: string, amount: number, description: string, date: string, type?: 'account' | 'card' }) => {
      if (!user) throw new Error('Utilizador não autenticado');

      const txs = [
        {
          user_id: user.id,
          description: `[Saída] ${description}`,
          amount: amount,
          type: 'despesa',
          account_id: from,
          date: date,
          is_paid: true,
          payment_date: date
        },
        {
          user_id: user.id,
          description: `[Entrada] ${description}`,
          amount: amount,
          type: 'receita',
          account_id: type === 'account' ? to : null,
          card_id: type === 'card' ? to : null,
          date: date,
          is_paid: true,
          payment_date: date,
          is_invoice_payment: type === 'card'
        }
      ];

      const { error } = await supabase.from('transactions').insert(txs);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({ title: 'Transferência realizada!' });
    }
  });
}


