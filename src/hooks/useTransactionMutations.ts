import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { addMonths, format } from 'date-fns';
import { Transaction } from '@/types/finance';
import { useAuth } from '@/contexts/AuthContext';
import { calcInvoiceMonthYear } from '@/utils/invoiceUtils';
import { parseLocalDate } from '@/utils/dateUtils';

// --- 1. ADICIONAR TRANSAÇÃO ---
export function useAddTransaction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      transaction: Omit<Transaction, 'id'> & { cardClosingDay?: number }
    ) => {
      if (!user) throw new Error('Utilizador não autenticado');

      const txsToInsert: any[] = [];
      const baseDate = parseLocalDate(transaction.date);

      if (transaction.installmentTotal && transaction.installmentTotal > 1) {
        const groupId = crypto.randomUUID();
        for (let i = 0; i < transaction.installmentTotal; i++) {
          const date = format(addMonths(baseDate, i), 'yyyy-MM-dd');
          const isPaid = transaction.cardId ? true : new Date(date) <= new Date();

          // Calcula fatura de cada parcela
          const invoiceMonthYear =
            transaction.cardId && transaction.cardClosingDay != null
              ? calcInvoiceMonthYear(date, transaction.cardClosingDay)
              : null;

          txsToInsert.push({
            user_id: user.id,
            description: `${transaction.description} (${i + 1}/${transaction.installmentTotal})`,
            amount: transaction.amount / transaction.installmentTotal,
            type: transaction.type,
            date: date,
            category_id: transaction.categoryId || null,
            account_id: transaction.accountId || null,
            card_id: transaction.cardId || null,
            is_paid: isPaid,
            payment_date: isPaid ? date : null,
            installment_group_id: groupId,
            installment_number: i + 1,
            installment_total: transaction.installmentTotal,
            is_recurring: false,
            invoice_month_year: invoiceMonthYear,
          });
        }
      } else {
        const isPaid = transaction.cardId
          ? true
          : new Date(transaction.date) <= new Date();

        // Calcula fatura da transação simples
        const invoiceMonthYear =
          transaction.cardId && transaction.cardClosingDay != null
            ? calcInvoiceMonthYear(transaction.date, transaction.cardClosingDay)
            : null;

        txsToInsert.push({
          user_id: user.id,
          description: transaction.description,
          amount: transaction.amount,
          type: transaction.type,
          date: transaction.date,
          category_id: transaction.categoryId || null,
          account_id: transaction.accountId || null,
          card_id: transaction.cardId || null,
          is_paid: isPaid,
          payment_date: isPaid ? transaction.date : null,
          is_recurring: transaction.isRecurring || false,
          invoice_month_year: invoiceMonthYear,
        });
      }

      const { data, error } = await supabase
        .from('transactions')
        .insert(txsToInsert)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({ title: 'Transação guardada!' });
    },
    onError: (err) => {
      console.error('Erro ao adicionar:', err);
      toast({ title: 'Erro ao guardar', variant: 'destructive' });
    },
  });
}

// --- 2. DELETAR TRANSAÇÃO (OTIMISTA) ---
export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, applyScope = 'this' }: { id: string, applyScope?: 'this' | 'future' | 'all' }) => {
      if (applyScope === 'this') {
        const { error } = await supabase.from('transactions').delete().eq('id', id);
        if (error) throw error;
      } else {
        // Para 'future' ou 'all', primeiro buscamos a transação para pegar o installment_group_id e a data
        const { data: tx } = await supabase.from('transactions').select('*').eq('id', id).single();
        
        if (tx?.installment_group_id) {
          let query = supabase.from('transactions').delete().eq('installment_group_id', tx.installment_group_id);
          
          if (applyScope === 'future') {
            query = query.gte('date', tx.date);
          }
          
          const { error } = await query;
          if (error) throw error;
        } else {
          // Se não tiver grupo, deleta apenas a si mesmo
          const { error } = await supabase.from('transactions').delete().eq('id', id);
          if (error) throw error;
        }
      }
      return id;
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ['transactions'] });
      const previousTransactions = queryClient.getQueryData(['transactions']);

      queryClient.setQueryData(['transactions'], (oldData: any) => {
        if (!oldData) return [];
        return oldData.filter((tx: any) => tx.id !== id);
      });

      return { previousTransactions };
    },
    onError: (err, variables, context) => {
      if (context?.previousTransactions) {
        queryClient.setQueryData(['transactions'], context.previousTransactions);
      }
      toast({ title: 'Erro ao remover transação', variant: 'destructive' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  });
}

// --- 3. ALTERAR STATUS (OTIMISTA) ---
export function useToggleTransactionPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isPaid, date }: { id: string, isPaid: boolean, date?: string }) => {
      const paymentDate = isPaid ? (date || format(new Date(), 'yyyy-MM-dd')) : null;

      const { error } = await supabase
        .from('transactions')
        .update({ is_paid: isPaid, payment_date: paymentDate })
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onMutate: async ({ id, isPaid }) => {
      await queryClient.cancelQueries({ queryKey: ['transactions'] });
      const previousTransactions = queryClient.getQueryData(['transactions']);

      queryClient.setQueryData(['transactions'], (oldData: any) => {
        if (!oldData) return [];
        return oldData.map((tx: any) =>
          tx.id === id ? { ...tx, isPaid: isPaid } : tx
        );
      });

      return { previousTransactions };
    },
    onError: (err, variables, context) => {
      if (context?.previousTransactions) {
        queryClient.setQueryData(['transactions'], context.previousTransactions);
      }
      toast({ title: 'Falha ao atualizar status', variant: 'destructive' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  });
}

// --- 4. ATUALIZAR TRANSAÇÃO ---
export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
      currentCardId,      // ← cartão atual da transação (mesmo que não mudou)
      cardClosingDay,     // ← closing_day do cartão atual
    }: {
      id: string;
      updates: Partial<Transaction>;
      currentCardId?: string | null;
      cardClosingDay?: number;
    }) => {
      const dbUpdates: any = {};

      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
      if (updates.date !== undefined) dbUpdates.date = updates.date;
      if (updates.type !== undefined) dbUpdates.type = updates.type;
      if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId;
      if (updates.accountId !== undefined) dbUpdates.account_id = updates.accountId;
      if (updates.cardId !== undefined) dbUpdates.card_id = updates.cardId;
      if (updates.isPaid !== undefined) dbUpdates.is_paid = updates.isPaid;
      if (updates.paymentDate !== undefined) dbUpdates.payment_date = updates.paymentDate;
      if (updates.isRecurring !== undefined) dbUpdates.is_recurring = updates.isRecurring;

      // Usa o cardId novo (se mudou) ou o atual (se não mudou)
      const effectiveCardId = updates.cardId !== undefined ? updates.cardId : currentCardId;
      const effectiveDate = updates.date || (updates as any).originalDate; // Fallback se precisar de data

      // SEMPRE recalcula invoice_month_year se há cartão e data
      // No edit, o formulário sempre manda a data (updates.date)
      if (effectiveCardId && updates.date && cardClosingDay != null) {
        dbUpdates.invoice_month_year = calcInvoiceMonthYear(updates.date, cardClosingDay);
      } else if (updates.accountId) {
        // Mudou para conta bancária — limpa invoice
        dbUpdates.invoice_month_year = null;
      }

      const { data, error } = await supabase
        .from('transactions')
        .update(dbUpdates)
        .eq('id', id)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({ title: 'Alterações salvas!' });
    },
    onError: (err) => {
      console.error('Erro ao atualizar:', err);
      toast({ title: 'Erro ao salvar alterações', variant: 'destructive' });
    },
  });
}
