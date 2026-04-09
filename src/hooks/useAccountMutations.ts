import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, logSafeError } from '@/lib/supabase';
import { toast, useToast } from '@/components/ui/use-toast';
import { Account } from '@/types/finance';
import { useAuth } from '@/contexts/AuthContext';

// --- 1. ADICIONAR CONTA ---
export function useAddAccount() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (account: Omit<Account, 'id' | 'userId'>) => {
      if (!user) throw new Error('Utilizador não autenticado');

      const safeName = (account.name ?? '').trim().slice(0, 100);
      const safeInstitution = (account.institution ?? (account as any).bank ?? '').trim().slice(0, 100);

      const supabasePayload: any = {
        name: safeName,
        balance: account.balance,
        color: account.color,
        icon: account.icon,
        user_id: user.id,
        institution: safeInstitution,
        bank: safeInstitution,
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
    },
    onError: (err) => {
      logSafeError('useAddAccount', err);
      toast({ title: 'Erro ao criar conta', variant: 'destructive' });
    }
  });
}

// --- 2. ATUALIZAR CONTA ---
export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<Account> }) => {
      const supabasePayload: any = { ...updates };

      // Sanitização
      if (updates.name !== undefined) {
        supabasePayload.name = updates.name.trim().slice(0, 100);
      }
      if (updates.institution !== undefined || (updates as any).bank !== undefined) {
        const rawInst = updates.institution || (updates as any).bank || '';
        supabasePayload.bank = rawInst.trim().slice(0, 100);
      }

      // 1. Conversão de camelCase para snake_case (Padrão do Postgres)
      if (supabasePayload.accountType !== undefined) {
        supabasePayload.account_type = supabasePayload.accountType;
      }
      if (supabasePayload.hasOverdraft !== undefined) {
        supabasePayload.has_overdraft = supabasePayload.hasOverdraft;
      }
      if (supabasePayload.overdraftLimit !== undefined) {
        supabasePayload.overdraft_limit = supabasePayload.overdraftLimit;
      }
      if (supabasePayload.monthlyYieldRate !== undefined) {
        supabasePayload.monthly_yield_rate = supabasePayload.monthlyYieldRate;
      }

      // 2. Extermínio de colunas camelCase e colunas fantasmas que causam o Erro 400
      delete supabasePayload.accountType;
      delete supabasePayload.hasOverdraft;
      delete supabasePayload.overdraftLimit;
      delete supabasePayload.monthlyYieldRate;
      delete supabasePayload.institution; // O Supabase usa apenas 'bank'

      // 3. Trava anti-string vazia (Se o usuário apagar o apelido)
      if (supabasePayload.name !== undefined && supabasePayload.name.trim() === '') {
        supabasePayload.name = supabasePayload.bank || 'Conta Principal';
      }

      const { error } = await supabase.from('accounts').update(supabasePayload).eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({ title: 'Conta atualizada!' });
    },
    onError: (err) => {
      logSafeError('useUpdateAccount', err);
      toast({ title: 'Erro ao atualizar conta', variant: 'destructive' });
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
    },
    onError: (err) => {
      logSafeError('useDeleteAccount', err);
      toast({ title: 'Erro ao remover conta', variant: 'destructive' });
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
    },
    onError: (err) => {
      logSafeError('useTransferBetweenAccounts', err);
      toast({ title: 'Erro ao realizar transferência', variant: 'destructive' });
    }
  });
}

// ============================================================
// LGPD Art. 18 VI — Excluir conta e todos os dados do usuário
// ============================================================
export function useDeleteUserAccount() {
  const { signOut } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc('delete_user_data', {
        target_user_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      try {
        localStorage.clear();
      } catch {
        // Modo privado — ignorar
      }
      await signOut();
      toast({
        title: 'Conta excluída com sucesso',
        description: 'Todos os seus dados foram permanentemente removidos.',
      });
    },
    onError: (err) => {
      logSafeError('useDeleteUserAccount', err);
      toast({
        title: 'Erro ao excluir conta',
        description: 'Tente novamente ou entre em contato com o suporte.',
        variant: 'destructive',
      });
    },
  });
}
