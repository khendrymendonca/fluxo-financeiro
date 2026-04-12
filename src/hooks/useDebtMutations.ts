import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, logSafeError } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { Debt } from '@/types/finance';
import { useAuth } from '@/contexts/AuthContext';
import { addMonths, format } from 'date-fns';
import { parseLocalDate } from '@/utils/dateUtils';
import { useFinanceStore } from './useFinanceStore';

interface DebtDbPayload {
  name?: string;
  total_amount?: number;
  remaining_amount?: number;
  installment_amount?: number;
  interest_rate_monthly?: number;
  minimum_payment?: number;
  due_day?: number;
  strategy_priority?: number;
  status?: string;
  total_installments?: number;
  card_id?: string;
  debt_type?: string;
}

// --- 1. ADICIONAR DÃ VIDA ---
export function useAddDebt() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (debt: Omit<Debt, 'id' | 'userId'>) => {
      if (!user) throw new Error('Utilizador não autenticado');

      const safeName = (debt.name ?? '').trim().slice(0, 150);

      const payload = {
        user_id: user.id,
        name: safeName,
        total_amount: debt.totalAmount,
        remaining_amount: debt.remainingAmount,
        installment_amount: debt.installmentAmount,
        interest_rate_monthly: debt.interestRateMonthly,
        due_day: debt.dueDay,
        strategy_priority: debt.strategyPriority,
        status: debt.status || 'active',
        total_installments: debt.totalInstallments,
        card_id: debt.cardId,
        debt_type: debt.debtType,
      };

      const { data, error } = await supabase.from('debts').insert(payload).select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({ title: 'Acordo registrado!' });
    },
    onError: (err) => {
      logSafeError('useAddDebt', err);
      toast({ title: 'Erro ao registrar acordo', variant: 'destructive' });
    }
  });
}

// --- 2. ATUALIZAR DÃ VIDA ---
export function useUpdateDebt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<Debt> }) => {
      const payload: DebtDbPayload = {};

      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.totalAmount !== undefined) payload.total_amount = updates.totalAmount;
      if (updates.remainingAmount !== undefined) payload.remaining_amount = updates.remainingAmount;
      if (updates.installmentAmount !== undefined) payload.installment_amount = updates.installmentAmount;
      if (updates.interestRateMonthly !== undefined) payload.interest_rate_monthly = updates.interestRateMonthly;
      if (updates.minimumPayment !== undefined) payload.minimum_payment = updates.minimumPayment;
      if (updates.dueDay !== undefined) payload.due_day = updates.dueDay;
      if (updates.strategyPriority !== undefined) payload.strategy_priority = updates.strategyPriority;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.totalInstallments !== undefined) payload.total_installments = updates.totalInstallments;
      if (updates.cardId !== undefined) payload.card_id = updates.cardId;
      if (updates.debtType !== undefined) payload.debt_type = updates.debtType;

      // 1. Atualizar a dívida
      const { error } = await supabase.from('debts').update(payload).eq('id', id);
      if (error) throw error;

      // 2. Se mudamos o valor da parcela ou o dia de vencimento, atualizar transações futuras não pagas
      if (updates.installmentAmount !== undefined || updates.dueDay !== undefined) {
        // Buscar transações pendentes
        const { data: pendingTxs, error: fetchError } = await supabase
          .from('transactions')
          .select('id, date, amount')
          .eq('debt_id', id)
          .eq('is_paid', false);

        if (fetchError) throw fetchError;

        if (pendingTxs && pendingTxs.length > 0) {
          const updatesPromises = pendingTxs.map(tx => {
            const txUpdates: any = {};
            if (updates.installmentAmount !== undefined) {
              txUpdates.amount = updates.installmentAmount;
            }

            if (updates.dueDay !== undefined) {
              // Ajustar a data mantendo mês e ano
              const originalDate = parseLocalDate(tx.date);
              const year = originalDate.getFullYear();
              const month = originalDate.getMonth();
              // Usar date-fns para garantir que o dia seja válido para o mês (ex: 31 de Abril -> 30 de Abril)
              const newDate = new Date(year, month, updates.dueDay);
              // Se o dia resultou em mudança de mês (ex: dia 31 em mês de 30), retroceder para o último dia do mês correto
              if (newDate.getMonth() !== month) {
                newDate.setDate(0);
              }
              txUpdates.date = format(newDate, 'yyyy-MM-dd');
            }

            return supabase.from('transactions').update(txUpdates).eq('id', tx.id);
          });

          await Promise.all(updatesPromises);
        }
      }

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({ title: 'Acordo atualizado!' });
    },
    onError: (err) => {
      logSafeError('useUpdateDebt', err);
      toast({ title: 'Erro ao atualizar acordo', variant: 'destructive' });
    }
  });
}

// --- 3. DELETAR DÃVIDA ---
export function useDeleteDebt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Exclusão do Acordo com Tratamento de Soft Delete (Cascata)
      const { error } = await supabase.from('debts').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['cards'] }); // Recalcular limites baseados nas transações restantes
      toast({ title: 'Acordo removido e saldos estornados.' });
    },
    onError: (err) => {
      logSafeError('useDeleteDebt', err);
      toast({ title: 'Erro ao remover acordo', variant: 'destructive' });
    }
  });
}

// --- 4. RENEGOCIAR ACORDO ---
export function useRenegotiateDebt() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { categories } = useFinanceStore();

  return useMutation({
    mutationFn: async ({ debt, firstInstallmentDate }: { debt: Debt, firstInstallmentDate?: string }) => {
      if (!user) throw new Error('Utilizador não autenticado');

      // 1. Atualizar status do acordo e data se fornecida
      const debtUpdates: any = { status: 'renegotiated' };
      if (firstInstallmentDate) debtUpdates.startDate = firstInstallmentDate;

      const { error: debtError } = await supabase
        .from('debts')
        .update(debtUpdates)
        .eq('id', debt.id);

      if (debtError) throw debtError;

      // 2. Gerar parcelas na tabela transactions
      const count = debt.totalInstallments || 1;
      const amount = debt.installmentAmount;
      const groupId = crypto.randomUUID();
      const baseDate = parseLocalDate(firstInstallmentDate || debt.startDate);
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
          category_id: categories.find(c => c.name === 'Renegociação')?.id,
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
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({ title: 'Acordo gerado com sucesso!' });
    },
    onError: (err) => {
      logSafeError('useRenegotiateDebt', err);
      toast({ title: 'Erro ao renegociar acordo', variant: 'destructive' });
    }
  });
}
