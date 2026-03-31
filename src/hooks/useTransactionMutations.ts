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
      data: any | any[]
    ) => {
      if (!user) throw new Error('Utilizador não autenticado');

      const txs = Array.isArray(data) ? data : [data];
      const txsWithUser = txs.map(tx => ({
        ...tx,
        user_id: user.id,
        // Garante mapeamento de nomes de campos para o Supabase (Snake Case)
        category_id: tx.categoryId || tx.category_id,
        subcategory_id: tx.subcategoryId || tx.subcategory_id,
        account_id: tx.accountId || tx.account_id,
        card_id: tx.cardId || tx.card_id,
        is_paid: tx.isPaid !== undefined ? tx.isPaid : tx.is_paid || false,
        payment_date: tx.paymentDate || tx.payment_date,
        is_recurring: tx.isRecurring !== undefined ? tx.isRecurring : tx.is_recurring || false,
        recurrence: tx.recurrence || 'none',
        installment_group_id: tx.installmentGroupId !== undefined ? tx.installmentGroupId : tx.installment_group_id,
        installment_number: tx.installmentNumber !== undefined ? tx.installmentNumber : tx.installment_number,
        installment_total: tx.installmentTotal !== undefined ? tx.installmentTotal : tx.installment_total,
        invoice_month_year: tx.invoiceMonthYear !== undefined ? tx.invoiceMonthYear : tx.invoice_month_year,
        is_automatic: tx.isAutomatic !== undefined ? tx.isAutomatic : tx.is_automatic,
        debt_id: tx.debtId !== undefined ? tx.debtId : tx.debt_id,
        transaction_type: tx.transactionType !== undefined ? tx.transactionType : tx.transaction_type,
        original_id: tx.originalId || tx.original_id,
        original_bill_id: tx.originalBillId || tx.original_bill_id,
        is_invoice_payment: tx.isInvoicePayment !== undefined ? tx.isInvoicePayment : tx.is_invoice_payment,
      }));

      // Remover campos que não existem no banco (Campos CamelCase que foram mapeados acima + Campos Virtuais)
      const cleanTxs = txsWithUser.map(({
        categoryId, subcategoryId, accountId, cardId, isPaid, paymentDate,
        isRecurring, installmentGroupId, installmentNumber, installmentTotal,
        invoiceMonthYear, isAutomatic, debtId, transactionType, cardClosingDay, cardDueDay,
        userId, isVirtual, originalId, originalBillId, isInvoicePayment, deleted_at, ...rest
      }) => rest);

      const { data: insertedData, error } = await supabase
        .from('transactions')
        .insert(cleanTxs)
        .select();

      if (error) throw error;
      return insertedData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      toast({ title: 'Transação guardada!' });
    },
    onError: (err) => {
      console.error('Erro ao adicionar:', err);
      toast({ title: 'Erro ao guardar', variant: 'destructive' });
    },
  });
}

// --- 2. DELETAR TRANSAÇÃO (SCOPED - SOFT DELETE) ---
export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ transaction, applyScope = 'this' }: { transaction: Transaction, applyScope?: 'this' | 'future' | 'all' }) => {
      const { id, installmentGroupId, date } = transaction;
      const now = new Date().toISOString();

      // 1. Exclusão Simples: "Apenas esta parcela" ou Transação única
      if (applyScope === 'this' || !installmentGroupId) {
        const { error } = await supabase
          .from('transactions')
          .update({ deleted_at: now })
          .eq('id', id);
        if (error) throw error;
      }
      else if (applyScope === 'future') {
        const { error } = await supabase
          .from('transactions')
          .update({ deleted_at: now })
          .eq('installment_group_id', installmentGroupId)
          .gte('date', date);
        if (error) throw error;
      }
      else if (applyScope === 'all') {
        const { error } = await supabase
          .from('transactions')
          .update({ deleted_at: now })
          .eq('installment_group_id', installmentGroupId);
        if (error) throw error;
      }

      return id;
    },
    onMutate: async ({ transaction }) => {
      const id = transaction.id;
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
      toast({ title: 'Erro ao remover lançamento', variant: 'destructive' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      queryClient.invalidateQueries({ queryKey: ['debts'] });
    }
  });
}

// --- 3. ALTERAR STATUS (OTIMISTA) ---
export function useToggleTransactionPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isPaid, date, accountId }: { id: string, isPaid: boolean, date?: string, accountId?: string }) => {
      const paymentDate = isPaid ? (date || format(new Date(), 'yyyy-MM-dd')) : null;
      const updates: any = {
        is_paid: isPaid,
        payment_date: paymentDate
      };

      if (isPaid && accountId) {
        updates.account_id = accountId;
      }


      const { error } = await supabase
        .from('transactions')
        .update(updates)
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
          tx.id === id ? { ...tx, isPaid, is_paid: isPaid } : tx
        );
      });
      return { previousTransactions };
    },
    onError: (err, variables, context) => {
      if (context?.previousTransactions) {
        queryClient.setQueryData(['transactions'], context.previousTransactions);
      }
      console.error('Erro ao alterar status:', err);
      toast({ title: 'Erro ao alterar status de pagamento', variant: 'destructive' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      queryClient.invalidateQueries({ queryKey: ['debts'] });
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
      cardDueDay,
      applyScope = 'this'
    }: {
      id: string;
      updates: Partial<Transaction>;
      currentCardId?: string | null;
      cardClosingDay?: number;
      cardDueDay?: number;
      applyScope?: 'this' | 'future' | 'all';
    }) => {
      const dbUpdates: any = {};
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
      if (updates.date !== undefined) dbUpdates.date = updates.date;
      if (updates.type !== undefined) dbUpdates.type = updates.type;
      if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId;
      if (updates.subcategoryId !== undefined) dbUpdates.subcategory_id = updates.subcategoryId;
      if (updates.accountId !== undefined) dbUpdates.account_id = updates.accountId;
      if (updates.cardId !== undefined) dbUpdates.card_id = updates.cardId;
      if (updates.isPaid !== undefined) dbUpdates.is_paid = updates.isPaid;
      if (updates.paymentDate !== undefined) dbUpdates.payment_date = updates.paymentDate;
      if (updates.isRecurring !== undefined) dbUpdates.is_recurring = updates.isRecurring;
      if (updates.recurrence !== undefined) dbUpdates.recurrence = updates.recurrence;
      if (updates.transactionType !== undefined) dbUpdates.transaction_type = updates.transactionType;

      const effectiveCardId = updates.cardId !== undefined ? updates.cardId : currentCardId;

      if (updates.invoiceMonthYear !== undefined) {
        dbUpdates.invoice_month_year = updates.invoiceMonthYear;
      } else if (effectiveCardId && updates.date && cardClosingDay != null && cardDueDay != null) {
        dbUpdates.invoice_month_year = calcInvoiceMonthYear(parseLocalDate(updates.date), { closingDay: cardClosingDay, dueDay: cardDueDay });
      } else if (updates.accountId) {
        dbUpdates.invoice_month_year = null;
      }

      // Se não há grupo ou o escopo é apenas 'this', faz o update simples
      const { data: currentTx } = await supabase.from('transactions').select('*').eq('id', id).single();
      const groupId = currentTx?.installment_group_id;

      if (applyScope === 'this' || !groupId) {
        const { data, error } = await supabase
          .from('transactions')
          .update(dbUpdates)
          .eq('id', id)
          .select();
        if (error) throw error;
        return data;
      }

      // Se há escopo future ou all, aplicamos o filtro correspondente
      let query = supabase.from('transactions').update(dbUpdates).eq('installment_group_id', groupId);

      if (applyScope === 'future') {
        query = query.gte('date', currentTx.date);
      }

      const { data, error } = await query.select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      toast({ title: 'Alterações salvas!' });
    },
    onError: (err) => {
      console.error('Erro ao atualizar:', err);
      toast({ title: 'Erro ao atualizar lançamento', variant: 'destructive' });
    }
  });
}

// --- 5. DELETAR EM MASSA (SOFT DELETE) ---
export function useBulkDeleteTransactions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      items,
      installmentScope = 'this',
      deleteFutureBills = false
    }: {
      items: {
        id: string,
        type: 'transaction' | 'bill',
        isVirtual?: boolean,
        billId?: string,
        installmentGroupId?: string,
        isRecurring?: boolean
      }[],
      installmentScope?: 'this' | 'future' | 'all',
      deleteFutureBills?: boolean
    }) => {
      const transactionIdsToUpdate = new Set<string>();
      const billIdsToUpdate = new Set<string>();
      const now = new Date().toISOString();

      // 1. Classificar o que "deletar" (marcar como deletado)
      for (const item of items) {
        if (item.type === 'transaction') {
          if (installmentScope === 'this' || !item.installmentGroupId) {
            transactionIdsToUpdate.add(item.id);
          } else {
            let query = supabase.from('transactions').select('id').eq('installment_group_id', item.installmentGroupId);

            if (installmentScope === 'future') {
              const { data: tx } = await supabase.from('transactions').select('date').eq('id', item.id).single();
              if (tx?.date) {
                query = query.gte('date', tx.date);
              }
            }

            const { data: relatedTxs } = await query;
            relatedTxs?.forEach(rtx => transactionIdsToUpdate.add(rtx.id));
          }
        } else if (item.type === 'bill') {
          if (!item.isVirtual || deleteFutureBills) {
            billIdsToUpdate.add(item.billId || item.id);
          }
        }
      }

      // 2. Executar Soft Deletes em lote
      if (transactionIdsToUpdate.size > 0) {
        const { error } = await supabase
          .from('transactions')
          .update({ deleted_at: now })
          .in('id', Array.from(transactionIdsToUpdate));
        if (error) throw error;
      }

      if (billIdsToUpdate.size > 0) {
        const { error } = await supabase
          .from('bills')
          .update({ deleted_at: now })
          .in('id', Array.from(billIdsToUpdate));
        if (error) throw error;
      }

      return { txCount: transactionIdsToUpdate.size, billCount: billIdsToUpdate.size };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      toast({ title: 'Lançamentos removidos com sucesso!' });
    },
    onError: (err) => {
      console.error('Erro na remoção em massa:', err);
      toast({ title: 'Erro ao remover lançamentos', variant: 'destructive' });
    }
  });
}

// --- 6. ANTECIPAR PARCELAS DE CARTÃO ---
export function useAnticipateInstallments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      transactionId,
      installmentsToAnticipate,
      newDiscountedTotal,
      installmentGroupId
    }: {
      transactionId: string;
      installmentsToAnticipate: number;
      newDiscountedTotal: number;
      installmentGroupId: string;
    }) => {
      // Passo A: Buscar as parcelas futuras (ordenadas por data/número) para deletar
      const { data: futureTxs, error: fetchError } = await supabase
        .from('transactions')
        .select('id, installment_number')
        .eq('installment_group_id', installmentGroupId)
        .neq('id', transactionId)
        .order('installment_number', { ascending: true });

      if (fetchError) throw fetchError;

      // Pegar os IDs das N parcelas mais próximas (as que serão antecipadas)
      const idsToDelete = futureTxs
        .slice(0, installmentsToAnticipate)
        .map(tx => tx.id);

      // Passo B: Deletar as parcelas antecipadas (Soft Delete)
      if (idsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('transactions')
          .update({ deleted_at: new Date().toISOString() })
          .in('id', idsToDelete);
        if (deleteError) throw deleteError;
      }

      // Passo C: Atualizar a transação atual com o novo valor e descrição
      const { data: currentTx } = await supabase
        .from('transactions')
        .select('description, installment_number, installment_total')
        .eq('id', transactionId)
        .single();

      const newDescription = `${currentTx.description} (Antecipação +${installmentsToAnticipate})`;

      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          amount: newDiscountedTotal,
          description: newDescription,
          installment_total: currentTx.installment_total // Mantém o total original para histórico
        })
        .eq('id', transactionId);

      if (updateError) throw updateError;

      return { transactionId, deletedCount: idsToDelete.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] }); // Recalcular limites
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      toast({ title: 'Parcelas antecipadas com sucesso!' });
    },
    onError: (err) => {
      console.error('Erro ao antecipar parcelas:', err);
      toast({ title: 'Erro ao processar antecipação', variant: 'destructive' });
    }
  });
}
