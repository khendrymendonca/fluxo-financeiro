import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { addMonths, format } from 'date-fns';
import { Transaction } from '@/types/finance';
import { useAuth } from '@/contexts/AuthContext';
import { calcInvoiceMonthYear } from '@/utils/creditCardUtils';
import { parseLocalDate } from '@/utils/dateUtils';

// --- 1. ADICIONAR TRANSAÇÃO ---
export function useAddTransaction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      transaction: Omit<Transaction, 'id'> & { cardClosingDay?: number, cardDueDay?: number }
    ) => {
      if (!user) throw new Error('Utilizador não autenticado');

      const txsToInsert: any[] = [];
      const baseDate = parseLocalDate(transaction.date);

      if (transaction.installmentTotal && transaction.installmentTotal > 1) {
        const groupId = crypto.randomUUID();
        for (let i = 0; i < transaction.installmentTotal; i++) {
          const date = format(addMonths(baseDate, i), 'yyyy-MM-dd');
          const isPaid = transaction.cardId ? true : parseLocalDate(date) <= parseLocalDate(format(new Date(), 'yyyy-MM-dd'));

          // Calcula fatura de cada parcela usando creditCardUtils (Date-based)
          const invoiceMonthYear =
            transaction.cardId && transaction.cardClosingDay != null && transaction.cardDueDay != null
              ? calcInvoiceMonthYear(parseLocalDate(date), { closingDay: transaction.cardClosingDay, dueDay: transaction.cardDueDay })
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
          : parseLocalDate(transaction.date) <= parseLocalDate(format(new Date(), 'yyyy-MM-dd'));

        // Calcula fatura da transação simples
        const invoiceMonthYear =
          transaction.cardId && transaction.cardClosingDay != null && transaction.cardDueDay != null
            ? calcInvoiceMonthYear(parseLocalDate(transaction.date), { closingDay: transaction.cardClosingDay, dueDay: transaction.cardDueDay })
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
        const { data: tx } = await supabase.from('transactions').select('*').eq('id', id).single();
        if (tx?.installment_group_id) {
          let query = supabase.from('transactions').delete().eq('installment_group_id', tx.installment_group_id);
          if (applyScope === 'future') {
            query = query.gte('date', tx.date);
          }
          const { error } = await query;
          if (error) throw error;
        } else {
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
          tx.id === id ? { ...tx, is_paid: isPaid } : tx
        );
      });
      return { previousTransactions };
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
      currentCardId,
      cardClosingDay,
      cardDueDay
    }: {
      id: string;
      updates: Partial<Transaction>;
      currentCardId?: string | null;
      cardClosingDay?: number;
      cardDueDay?: number;
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

      const effectiveCardId = updates.cardId !== undefined ? updates.cardId : currentCardId;

      if (updates.invoiceMonthYear !== undefined) {
        dbUpdates.invoice_month_year = updates.invoiceMonthYear;
      } else if (effectiveCardId && updates.date && cardClosingDay != null && cardDueDay != null) {
        dbUpdates.invoice_month_year = calcInvoiceMonthYear(parseLocalDate(updates.date), { closingDay: cardClosingDay, dueDay: cardDueDay });
      } else if (updates.accountId) {
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
  });
}

// --- 5. DELETAR EM MASSA ---
export function useBulkDeleteTransactions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      items, 
      installmentScope = 'this',
      deleteFutureBills = false 
    }: { 
      items: { id: string, type: 'transaction' | 'bill', isVirtual?: boolean, billId?: string }[],
      installmentScope?: 'this' | 'future' | 'all',
      deleteFutureBills?: boolean
    }) => {
      const transactionIdsToDelete = new Set<string>();
      const billIdsToDelete = new Set<string>();

      // 1. Classificar o que deletar
      for (const item of items) {
        if (item.type === 'transaction') {
          if (installmentScope === 'this') {
            transactionIdsToDelete.add(item.id);
          } else {
            // Se for parcelado, precisamos do group_id
            const { data: tx } = await supabase.from('transactions').select('installment_group_id, date').eq('id', item.id).single();
            if (tx?.installment_group_id) {
              let query = supabase.from('transactions').select('id').eq('installment_group_id', tx.installment_group_id);
              if (installmentScope === 'future') {
                query = query.gte('date', tx.date);
              }
              const { data: relatedTxs } = await query;
              relatedTxs?.forEach(rtx => transactionIdsToDelete.add(rtx.id));
            } else {
              transactionIdsToDelete.add(item.id);
            }
          }
        } else if (item.type === 'bill') {
          // Se for uma conta real (não virtual) ou se pedirem para deletar a conta mestre
          if (!item.isVirtual || deleteFutureBills) {
            billIdsToDelete.add(item.billId || item.id);
          }
        }
      }

      // 2. Executar deleções
      if (transactionIdsToDelete.size > 0) {
        const { error } = await supabase.from('transactions').delete().in('id', Array.from(transactionIdsToDelete));
        if (error) throw error;
      }

      if (billIdsToDelete.size > 0) {
        const { error } = await supabase.from('bills').delete().in('id', Array.from(billIdsToDelete));
        if (error) throw error;
      }

      return { txCount: transactionIdsToDelete.size, billCount: billIdsToDelete.size };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({ title: 'Lançamentos removidos com sucesso!' });
    },
    onError: (err) => {
      console.error('Erro na remoção em massa:', err);
      toast({ title: 'Erro ao remover lançamentos', variant: 'destructive' });
    }
  });
}
