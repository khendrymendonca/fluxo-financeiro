import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, logSafeError } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
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
      const txsWithUser = txs.map(tx => {
        // Sanitizar description
        const safeDescription = (tx.description ?? '').trim().slice(0, 200);

        const mapped: any = {
          ...tx,
          description: safeDescription,
          user_id: user.id,
          category_id: tx.categoryId || tx.category_id,
          subcategory_id: tx.subcategoryId || tx.subcategory_id || null,
          account_id: tx.accountId || tx.account_id || null,
          card_id: tx.cardId || tx.card_id || null,
          is_paid: tx.isPaid !== undefined ? tx.isPaid : (tx.is_paid || false),
          payment_date: tx.paymentDate || tx.payment_date || null,
          is_recurring: tx.isRecurring !== undefined ? tx.isRecurring : (tx.is_recurring || false),
          recurrence: tx.recurrence || 'none',
          installment_group_id: tx.installmentGroupId || tx.installment_group_id || null,
          installment_number: tx.installmentNumber || tx.installment_number || null,
          installment_total: tx.installmentTotal || tx.installment_total || null,
          invoice_month_year: tx.invoiceMonthYear || tx.invoice_month_year || null,
          is_automatic: tx.isAutomatic !== undefined ? tx.isAutomatic : (tx.is_automatic || false),
          debt_id: tx.debtId || tx.debt_id || null,
          transaction_type: tx.transactionType || tx.transaction_type || 'punctual',
          original_id: tx.originalId || tx.original_id || null,
          original_bill_id: tx.originalBillId || tx.original_bill_id || null,
          is_invoice_payment: tx.isInvoicePayment !== undefined ? tx.isInvoicePayment : (tx.is_invoice_payment || false),
          date: tx.date ? tx.date.slice(0, 10) : format(new Date(), 'yyyy-MM-dd'),
        };

        // Remove chaves CamelCase para não dar erro no Supabase
        const clean: any = {};
        Object.keys(mapped).forEach(key => {
          if (![
            'categoryId', 'subcategoryId', 'accountId', 'cardId', 'isPaid', 'paymentDate',
            'isRecurring', 'installmentGroupId', 'installmentNumber', 'installmentTotal',
            'invoiceMonthYear', 'isAutomatic', 'debtId', 'transactionType', 'cardClosingDay', 'cardDueDay',
            'userId', 'isVirtual', 'originalId', 'originalBillId', 'isInvoicePayment'
          ].includes(key)) {
            clean[key] = mapped[key];
          }
        });
        return clean;
      });

      const { data: insertedData, error } = await supabase
        .from('transactions')
        .insert(txsWithUser)
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
      logSafeError('useAddTransaction', err);
      toast({ title: 'Erro ao guardar', variant: 'destructive' });
    },
  });
}

// --- 2. DELETAR TRANSAÇÃO (SCOPED - SOFT DELETE) ---
export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ transaction, applyScope = 'this' }: { transaction: any, applyScope?: 'this' | 'future' | 'all' }) => {
      const { id, installmentGroupId, date, isVirtual, originalId } = transaction;
      const now = new Date().toISOString();

      const targetId = isVirtual ? (originalId || id.split('-virtual')[0]) : id;

      // --- EXCEÇÃO: Exclusão de "apenas este mês" de uma recorrente virtual ---
      // Em vez de deletar a mãe, criamos uma "sombra deletada" para este mês específico.
      // O motor de projeção verá este registro e saberá que deve pular este mês.
      if (applyScope === 'this' && isVirtual) {
        const { data: madre } = await supabase
          .from('transactions')
          .select('*')
          .eq('id', targetId)
          .single();

        if (madre) {
          const { error } = await supabase
            .from('transactions')
            .insert({
              ...madre,
              id: undefined, // Novo ID automático
              date: parseLocalDate(date.slice(0, 10)).toISOString(),
              original_id: targetId,
              is_recurring: false,
              transaction_type: 'punctual',
              is_paid: false,
              payment_date: null,
              deleted_at: now, // Marca como deletada para bloquear a projeção
              created_at: undefined,
            });
          if (error) throw error;
        }
        return id;
      }

      // --- FLUXO NORMAL: Transação real ou exclusão em massa ---
      if (applyScope === 'this') {
        const { error } = await supabase
          .from('transactions')
          .update({ deleted_at: now })
          .eq('id', targetId);
        if (error) throw error;
      }
      else if (applyScope === 'future') {
        if (installmentGroupId) {
          // Parcelamento: futuros do mesmo grupo a partir desta data
          const { error } = await supabase
            .from('transactions')
            .update({ deleted_at: now })
            .eq('installment_group_id', installmentGroupId)
            .gte('date', date);
          if (error) throw error;
        } else {
          // Recorrente: este + todos os futuros com mesmo original_id
          const { error } = await supabase
            .from('transactions')
            .update({ deleted_at: now })
            .or(`id.eq.${targetId},original_id.eq.${targetId}`)
            .gte('date', date);
          if (error) throw error;
        }
      }
      else if (applyScope === 'all') {
        if (installmentGroupId) {
          // Parcelamento: todos do grupo
          const { error } = await supabase
            .from('transactions')
            .update({ deleted_at: now })
            .eq('installment_group_id', installmentGroupId);
          if (error) throw error;
        } else {
          // Recorrente: todos com mesmo original_id ou o próprio
          const { error } = await supabase
            .from('transactions')
            .update({ deleted_at: now })
            .or(`id.eq.${targetId},original_id.eq.${targetId}`);
          if (error) throw error;
        }
      }

      return id;
    },
    onMutate: async ({ transaction, applyScope = 'this' }) => {
      const { id, installmentGroupId, date } = transaction;
      const targetId = transaction.isVirtual ? (transaction.originalId || id.split('-virtual')[0]) : id;
      await queryClient.cancelQueries({ queryKey: ['transactions'] });
      const previousTransactions = queryClient.getQueryData(['transactions']);

      queryClient.setQueryData(['transactions'], (oldData: any) => {
        if (!oldData) return;
        return oldData.filter((tx: any) => {
          if (applyScope === 'this') {
            return tx.id !== id;
          }
          if (applyScope === 'all') {
            if (installmentGroupId) return tx.installmentGroupId !== installmentGroupId;
            return tx.id !== targetId && tx.originalId !== targetId;
          }
          if (applyScope === 'future') {
            if (installmentGroupId) return !(tx.installmentGroupId === installmentGroupId && tx.date >= date);
            return !((tx.id === targetId || tx.originalId === targetId) && tx.date >= date);
          }
          return true;
        });
      });

      return { previousTransactions };
    },
    onError: (err, variables, context) => {
      if (context?.previousTransactions) {
        queryClient.setQueryData(['transactions'], context.previousTransactions);
      }
      logSafeError('useDeleteTransaction', err);
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
    onMutate: async ({ id, isPaid, date, accountId }) => {
      await queryClient.cancelQueries({ queryKey: ['transactions'] });
      const previousTransactions = queryClient.getQueryData(['transactions']);

      const paymentDate = isPaid ? (date || format(new Date(), 'yyyy-MM-dd')) : null;

      queryClient.setQueryData(['transactions'], (oldData: any) => {
        if (!oldData) return [];
        return oldData.map((tx: any) =>
          tx.id === id ? {
            ...tx,
            isPaid,
            is_paid: isPaid,
            paymentDate,
            payment_date: paymentDate,
            accountId: isPaid ? (accountId || tx.accountId) : tx.accountId
          } : tx
        );
      });
      return { previousTransactions };
    },
    onError: (err, variables, context) => {
      if (context?.previousTransactions) {
        queryClient.setQueryData(['transactions'], context.previousTransactions);
      }
      logSafeError('useToggleTransactionPaid', err);
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
      applyScope = 'this',
      referenceDate
    }: {
      id: string;
      updates: Partial<Transaction>;
      currentCardId?: string | null;
      cardClosingDay?: number;
      cardDueDay?: number;
      applyScope?: 'this' | 'future' | 'all';
      referenceDate?: string;
    }) => {
      const effectiveCardId = updates.cardId !== undefined ? updates.cardId : currentCardId;
      let finalInvoiceMonthYear = updates.invoiceMonthYear;

      if (finalInvoiceMonthYear === undefined && effectiveCardId && updates.date && cardClosingDay != null && cardDueDay != null) {
        finalInvoiceMonthYear = calcInvoiceMonthYear(parseLocalDate(updates.date), { closingDay: cardClosingDay, dueDay: cardDueDay });
      } else if (updates.accountId) {
        finalInvoiceMonthYear = undefined;
      }

      const dbUpdates: any = {
        description: updates.description,
        amount: updates.amount,
        date: updates.date ? updates.date.slice(0, 10) : undefined,
        type: updates.type,
        category_id: updates.categoryId,
        subcategory_id: updates.subcategoryId || (updates as any).subcategory_id,
        account_id: updates.accountId,
        card_id: updates.cardId,
        is_paid: updates.isPaid,
        payment_date: updates.paymentDate,
        is_recurring: updates.isRecurring !== undefined ? updates.isRecurring : (updates as any).is_recurring,
        recurrence: updates.recurrence,
        transaction_type: updates.transactionType,
        invoice_month_year: finalInvoiceMonthYear
      };

      // Remover undefined para não sobrescrever dados existentes com null acidentalmente
      Object.keys(dbUpdates).forEach(key => dbUpdates[key] === undefined && delete dbUpdates[key]);

      // Detectar se é uma transação virtual
      const isVirtual = id.includes('-virtual-');
      const realId = isVirtual ? id.split('-virtual-')[0] : id;

      // Buscar a transação base no banco
      const { data: currentTx } = await supabase.from('transactions').select('*').eq('id', realId).single();
      if (!currentTx) throw new Error('Transação base não encontrada');

      const groupId = currentTx.installment_group_id;
      const originalId = currentTx.original_id || (currentTx.is_recurring ? currentTx.id : null);
      
      const isRecurringMother = !isVirtual && currentTx.is_recurring && !currentTx.original_id;

      // ======================================================================
      // CASO A e C: isVirtual ou isRecurringMother + applyScope='this'
      // ======================================================================
      if (applyScope === 'this' && (isVirtual || isRecurringMother)) {
        let targetDate = currentTx.date.slice(0, 10);
        
        if (isVirtual) {
          const virtualParts = id.split('-virtual-');
          if (virtualParts.length === 2) {
            const [yearStr, monthStr] = virtualParts[1].split('-');
            const year = parseInt(yearStr);
            const month = parseInt(monthStr); // 0-based
            const originalDay = new Date(currentTx.date).getDate();
            const lastDay = new Date(year, month + 1, 0).getDate();
            const safeDay = Math.min(originalDay, lastDay);
            targetDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
          }
        } else {
          targetDate = updates.date ? updates.date.slice(0, 10) : currentTx.date.slice(0, 10);
        }

        const { error } = await supabase.from('transactions').insert({
          ...currentTx,
          id: undefined,
          amount: updates.amount ?? currentTx.amount,
          date: targetDate,
          original_id: realId,
          is_recurring: false,
          transaction_type: 'punctual',
          is_paid: false,
          payment_date: null,
          deleted_at: null,
          created_at: undefined,
        });
        if (error) throw error;
        return [];
      }

      // ======================================================================
      // CASO B e D: isVirtual ou isRecurringMother + applyScope='future'
      // ======================================================================
      if (applyScope === 'future' && (isVirtual || isRecurringMother)) {
        let targetDate = currentTx.date.slice(0, 10);
        if (isVirtual) {
          const parts = id.split('-virtual-');
          if (parts.length === 2) {
            const [yearStr, monthStr] = parts[1].split('-');
            const year = parseInt(yearStr);
            const month = parseInt(monthStr);
            const originalDay = new Date(currentTx.date).getDate();
            const lastDay = new Date(year, month + 1, 0).getDate();
            const safeDay = Math.min(originalDay, lastDay);
            targetDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
          }
        } else {
          targetDate = updates.date ? updates.date.slice(0, 10) : currentTx.date.slice(0, 10);
        }

        const finalDate = updates.date ? updates.date.slice(0, 10) : targetDate;
        const rootDate = currentTx.date.slice(0, 10);

        // 🛡️ REFENO TECH LEAD: Só faz o 'Corte de Série' (split) se for em MÊS DIFERENTE.
        // Se for no mesmo mês, apenas atualizamos o registro original para evitar duplicidade.
        const isSameMonthYear = finalDate.slice(0, 7) === rootDate.slice(0, 7);

        if (isSameMonthYear && !isVirtual) {
          const { error } = await supabase.from('transactions').update(dbUpdates).eq('id', id);
          if (error) throw error;
          return [];
        }

        // Se o corte é no futuro (mês posterior), preservamos a mãe como pontual
        if (rootDate < finalDate && !isSameMonthYear) {
          await supabase.from('transactions')
            .update({ is_recurring: false, transaction_type: 'recurring' })
            .eq('id', realId);
        } else {
          // Se o corte é na própria data da mãe ou antes, aí sim deletamos
          await supabase.from('transactions')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', realId);
        }

        // Criar a nova "Raiz" da série a partir de agora
        const { data: newRoot, error: insertError } = await supabase.from('transactions').insert({
          ...currentTx,
          id: undefined,
          ...dbUpdates, // Aplica todas as atualizações (amount, description, category_id, etc)
          date: finalDate,
          is_recurring: true,
          original_id: null,
          is_paid: false,
          payment_date: null,
          deleted_at: null,
          created_at: undefined,
        }).select().single();

        if (insertError) throw insertError;

        // Atualizar filhos físicos existentes que agora devem pertencer à nova raiz
        const { date: _d, ...childUpdates } = dbUpdates;
        if (Object.keys(childUpdates).length > 0) {
          await supabase.from('transactions')
            .update({ ...childUpdates, original_id: newRoot.id })
            .eq('original_id', realId)
            .gte('date', finalDate)
            .eq('is_paid', false)
            .is('deleted_at', null);
        }
        return [];
      }

      // ======================================================================
      // CASO E: isVirtual ou isRecurringMother + applyScope='all'
      // ======================================================================
      if (applyScope === 'all' && (isVirtual || isRecurringMother)) {
        const { date: _ignoredDate, ...motherUpdates } = dbUpdates;
        if (Object.keys(motherUpdates).length > 0) {
          const { data, error } = await supabase.from('transactions')
            .update(motherUpdates)
            .or(`id.eq.${realId},original_id.eq.${realId}`)
            .eq('is_paid', false)
            .is('deleted_at', null)
            .select();
          if (error) { logSafeError('useUpdateTransaction (bulk all)', error); throw error; }
          return data || [];
        }
        return [];
      }

      // ======================================================================
      // CASO F: Transação normal pontual ou Fluxo de Cartão/Parcelamento
      // ======================================================================
      if (applyScope === 'this' || (!groupId && !originalId)) {
        const { data, error } = await supabase.from('transactions').update(dbUpdates).eq('id', realId).select();
        if (error) { logSafeError('useUpdateTransaction (single)', error); throw error; }
        return data || [];
      }

      const targetDateToApply = referenceDate ?? currentTx.date;
      
      if (applyScope === 'all') {
        let query = supabase.from('transactions').update(dbUpdates).eq('is_paid', false).is('deleted_at', null);
        if (groupId) query = query.eq('installment_group_id', groupId);
        else if (originalId) query = query.or(`id.eq.${originalId},original_id.eq.${originalId}`);
        const { data, error } = await query.select();
        if (error) throw error;
        return data || [];
      }

      if (applyScope === 'future') {
        if (groupId) {
          const { data, error } = await supabase.from('transactions').update(dbUpdates)
            .eq('installment_group_id', groupId).gte('date', targetDateToApply).eq('is_paid', false).is('deleted_at', null).select();
          if (error) throw error;
          return data || [];
        } else if (originalId) {
          const { date: _d, ...motherUpdates } = dbUpdates;
          if (Object.keys(motherUpdates).length > 0) {
            await supabase.from('transactions').update(motherUpdates).eq('id', originalId).eq('is_paid', false).is('deleted_at', null);
          }
          if (Object.keys(dbUpdates).length > 0) {
            const { data, error } = await supabase.from('transactions').update(dbUpdates).eq('original_id', originalId)
              .gte('date', targetDateToApply).eq('is_paid', false).is('deleted_at', null).select();
            if (error) throw error;
            return data || [];
          }
        }
      }
      return [];
    },
    onMutate: async ({ id, updates, applyScope = 'this' }) => {
      await queryClient.cancelQueries({ queryKey: ['transactions'] });
      const previousTransactions = queryClient.getQueryData(['transactions']);

      queryClient.setQueryData(['transactions'], (oldData: any[]) => {
        if (!oldData) return [];

        const targetTx = oldData.find((t: any) => t.id === id);
        if (!targetTx) return oldData;

        return oldData.map((tx: any) => {
          if (applyScope === 'this') {
            return tx.id === id ? { ...tx, ...updates, is_paid: updates.isPaid ?? tx.is_paid } : tx;
          }
          if (applyScope === 'all') {
            if (targetTx.installmentGroupId) {
              return tx.installmentGroupId === targetTx.installmentGroupId ? { ...tx, ...updates, is_paid: updates.isPaid ?? tx.is_paid } : tx;
            }
            // Recorrente: atualiza o próprio e todos com originalId apontando para ele
            return (tx.id === id || tx.originalId === id) ? { ...tx, ...updates, is_paid: updates.isPaid ?? tx.is_paid } : tx;
          }
          if (applyScope === 'future') {
            if (targetTx.installmentGroupId) {
              return (tx.installmentGroupId === targetTx.installmentGroupId && tx.date >= targetTx.date)
                ? { ...tx, ...updates, is_paid: updates.isPaid ?? tx.is_paid } : tx;
            }
            // Recorrente: atualiza a mãe incondicionalmente no onMutate, mas SEM a data, e filhos só no future range
            const isMother = tx.id === targetTx.originalId || tx.id === targetTx.id.split('-virtual')[0];
            const isFutureChild = tx.originalId === targetTx.originalId && tx.date >= targetTx.date;

            if (isMother) {
              const { date: _ignoredDateMutate, ...safeUpdates } = updates;
              return { ...tx, ...safeUpdates, is_paid: updates.isPaid ?? tx.is_paid };
            }
            if (isFutureChild) {
              return { ...tx, ...updates, is_paid: updates.isPaid ?? tx.is_paid };
            }
            return tx;
          }
          return tx;
        });
      });

      return { previousTransactions };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      toast({ title: 'Alterações salvas!' });
    },
    onError: (err, variables, context) => {
      if (context?.previousTransactions) {
        queryClient.setQueryData(['transactions'], context.previousTransactions);
      }
      logSafeError('useUpdateTransaction', err);
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
      logSafeError('useBulkDeleteTransactions', err);
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

      if (!currentTx) throw new Error('Transaction not found');

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
      logSafeError('useAnticipateInstallments', err);
      toast({ title: 'Erro ao processar antecipação', variant: 'destructive' });
    }
  });
}

export const useBulkUpdateTransactions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: Partial<Transaction> }) => {
      const data: any = { ...updates };

      // Mapeamento Snake Case
      if (data.isPaid !== undefined) { data.is_paid = data.isPaid; delete data.isPaid; }
      if (data.paymentDate !== undefined) { data.payment_date = data.paymentDate; delete data.paymentDate; }
      if (data.invoiceMonthYear !== undefined) { data.invoice_month_year = data.invoiceMonthYear; delete data.invoiceMonthYear; }

      const { error } = await supabase
        .from('transactions')
        .update(data)
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
    },
    onError: (err) => {
      logSafeError('useBulkUpdateTransactions', err);
    }
  });
};
