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

      const supabasePayload: any = {
        name: account.name,
        balance: account.balance,
        color: account.color,
        icon: account.icon,
        user_id: user.id,
        institution: (account as any).institution || (account as any).bank,
        bank: (account as any).institution || (account as any).bank,
      };

      if (account.accountType !== undefined) supabasePayload.account_type = account.accountType;
      if (account.hasOverdraft !== undefined) supabasePayload.has_overdraft = account.hasOverdraft;
      if (account.overdraftLimit !== undefined) supabasePayload.overdraft_limit = account.overdraftLimit;
      if ((account as any).monthlyYieldRate !== undefined) supabasePayload.monthly_yield_rate = (account as any).monthlyYieldRate;

      const { data, error } = await supabase.from('accounts').insert(supabasePayload).select();

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
      const supabasePayload: any = { ...updates };

      // Tradução para snake_case
      if (updates.institution !== undefined) {
        supabasePayload.institution = updates.institution;
        supabasePayload.bank = updates.institution;
      }
      if (updates.accountType !== undefined) supabasePayload.account_type = updates.accountType;
      if (updates.hasOverdraft !== undefined) supabasePayload.has_overdraft = updates.hasOverdraft;
      if (updates.overdraftLimit !== undefined) supabasePayload.overdraft_limit = updates.overdraftLimit;
      if ((updates as any).monthlyYieldRate !== undefined) supabasePayload.monthly_yield_rate = (updates as any).monthlyYieldRate;

      // Limpeza do camelCase para evitar o Erro 400
      delete supabasePayload.accountType;
      delete supabasePayload.hasOverdraft;
      delete supabasePayload.overdraftLimit;
      delete supabasePayload.monthlyYieldRate;
      delete supabasePayload.monthlyYieldRate; // Garantia extra
      if ((supabasePayload as any).institution) {
        // Mantemos institution e bank pois são snake_case ou simples, 
        // mas o PostgREST pode ser chato. Se o banco tem institution e bank, ok.
      }

      const { error } = await supabase.from('accounts').update(supabasePayload).eq('id', id);
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
    mutationFn: async ({ from, to, amount, description, date, type = 'account', invoiceMonthYear }: { from: string, to: string, amount: number, description: string, date: string, type?: 'account' | 'card', invoiceMonthYear?: string }) => {
      if (!user) throw new Error('Utilizador não autenticado');

      const txs = [
        {
          user_id: user.id,
          description: `[Saída] ${description}`,
          amount: amount,
          type: 'expense',
          account_id: from,
          date: date,
          is_paid: true,
          payment_date: date
        },
        {
          user_id: user.id,
          description: `[Entrada] ${description}`,
          amount: amount,
          type: 'income',
          account_id: type === 'account' ? to : null,
          card_id: type === 'card' ? to : null,
          date: date,
          is_paid: true,
          payment_date: date,
          is_invoice_payment: type === 'card',
          invoice_month_year: invoiceMonthYear
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


