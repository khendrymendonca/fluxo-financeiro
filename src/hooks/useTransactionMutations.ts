import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, logSafeError } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { Transaction } from '@/types/finance';
import { useAuth } from '@/contexts/AuthContext';
import { calcInvoiceMonthYear } from '@/utils/creditCardUtils';
import { parseLocalDate } from '@/utils/dateUtils';

function isPaidInvoicePayment(transaction: any): boolean {
  return Boolean(
    transaction?.isInvoicePayment &&
    transaction?.type === 'expense' &&
    transaction?.cardId &&
    transaction?.invoiceMonthYear
  );
}

const LEGACY_TRANSFER_PAIR_ERROR =
  'Transferência antiga sem vínculo seguro. Não foi possível identificar a contraparte sem risco.';
const LEGACY_TRANSFER_EDIT_ERROR =
  'Transferência antiga sem vínculo seguro. Não foi possível editar a contraparte sem risco.';

function getTransferGroupId(transaction: any): string | null {
  return transaction?.transferGroupId || transaction?.transfer_group_id || null;
}

async function getSafeTransferDeleteIds(transaction: any, targetId: string): Promise<string[]> {
  const transferGroupId = getTransferGroupId(transaction);

  if (transferGroupId) {
    const { data, error } = await supabase
      .from('transactions')
      .select('id')
      .eq('transfer_group_id', transferGroupId)
      .eq('is_transfer', true)
      .is('deleted_at', null);

    if (error) throw error;

    const ids = (data || []).map((tx) => tx.id);
    return ids.includes(targetId) ? ids : [targetId, ...ids];
  }

  const normalizedDate = transaction?.date ? String(transaction.date).slice(0, 10) : '';
  const amount = Number(transaction?.amount || 0);
  const counterpartType = transaction?.type === 'income' ? 'expense' : 'income';

  if (!normalizedDate || !Number.isFinite(amount) || amount <= 0) {
    throw new Error(LEGACY_TRANSFER_PAIR_ERROR);
  }

  const { data, error } = await supabase
    .from('transactions')
    .select('id')
    .eq('is_transfer', true)
    .eq('type', counterpartType)
    .eq('amount', amount)
    .eq('date', normalizedDate)
    .is('deleted_at', null)
    .neq('id', targetId);

  if (error) throw error;

  if ((data || []).length !== 1) {
    throw new Error(LEGACY_TRANSFER_PAIR_ERROR);
  }

  return [targetId, data![0].id];
}

function stripTransferDirection(description?: string | null): string {
  return String(description || '')
    .replace(/^\[(Saída|Saida|Entrada)\]\s*/i, '')
    .trim();
}

function hasTransferDirection(description?: string | null): boolean {
  return /^\[(Saída|Saida|Entrada)\]\s*/i.test(String(description || ''));
}

function getTransferEditDescription(direction: 'Saída' | 'Entrada', description: string, shouldUsePrefix: boolean): string {
  const cleanDescription = stripTransferDirection(description);
  return shouldUsePrefix ? `[${direction}] ${cleanDescription}` : cleanDescription;
}

async function getSafeTransferEditPair(transaction: any, targetId: string): Promise<{
  expense: any;
  income: any;
  transferGroupId: string | null;
}> {
  const transferGroupId = getTransferGroupId(transaction);

  if (transferGroupId) {
    const { data, error } = await supabase
      .from('transactions')
      .select('id,type,amount,date,account_id,card_id,description,transfer_group_id,is_transfer,deleted_at')
      .eq('transfer_group_id', transferGroupId)
      .eq('is_transfer', true)
      .is('deleted_at', null);

    if (error) throw error;

    const expense = (data || []).find((tx) => tx.type === 'expense');
    const income = (data || []).find((tx) => tx.type === 'income');

    if (!expense || !income) {
      throw new Error(LEGACY_TRANSFER_EDIT_ERROR);
    }

    return { expense, income, transferGroupId };
  }

  const normalizedDate = transaction?.date ? String(transaction.date).slice(0, 10) : '';
  const amount = Number(transaction?.amount || 0);
  const counterpartType = transaction?.type === 'income' ? 'expense' : 'income';

  if (!normalizedDate || !Number.isFinite(amount) || amount <= 0) {
    throw new Error(LEGACY_TRANSFER_EDIT_ERROR);
  }

  const { data, error } = await supabase
    .from('transactions')
    .select('id,type,amount,date,account_id,card_id,description,transfer_group_id,is_transfer,deleted_at')
    .eq('is_transfer', true)
    .eq('type', counterpartType)
    .eq('amount', amount)
    .eq('date', normalizedDate)
    .is('deleted_at', null)
    .neq('id', targetId);

  if (error) throw error;

  if ((data || []).length !== 1) {
    throw new Error(LEGACY_TRANSFER_EDIT_ERROR);
  }

  const targetTx = {
    id: targetId,
    type: transaction?.type,
    amount,
    date: normalizedDate,
    account_id: transaction?.accountId || transaction?.account_id || null,
    card_id: transaction?.cardId || transaction?.card_id || null,
    description: transaction?.description,
    transfer_group_id: null,
    is_transfer: true,
  };

  const counterpart = data![0];
  const expense = targetTx.type === 'expense' ? targetTx : counterpart;
  const income = targetTx.type === 'income' ? targetTx : counterpart;

  if (!expense?.id || !income?.id) {
    throw new Error(LEGACY_TRANSFER_EDIT_ERROR);
  }

  return { expense, income, transferGroupId: null };
}

async function reopenInvoicePurchases(transaction: any) {
  const { error } = await supabase
    .from('transactions')
    .update({
      is_paid: false,
      payment_date: null,
    })
    .eq('card_id', transaction.cardId)
    .eq('invoice_month_year', transaction.invoiceMonthYear)
    .eq('is_invoice_payment', false)
    .eq('type', 'expense')
    .is('deleted_at', null)
    .select();

  if (error) throw error;
}

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
          is_invoice_payment: tx.isInvoicePayment !== undefined ? tx.isInvoicePayment : (tx.is_invoice_payment || false),
          is_transfer: tx.isTransfer !== undefined ? tx.isTransfer : (tx.is_transfer || false),
          date: tx.date ? tx.date.slice(0, 10) : format(new Date(), 'yyyy-MM-dd'),
        };

        // Remove chaves CamelCase para não dar erro no Supabase
        const clean: any = {};
        Object.keys(mapped).forEach(key => {
          if (![
            'categoryId', 'subcategoryId', 'accountId', 'cardId', 'isPaid', 'paymentDate',
            'isRecurring', 'installmentGroupId', 'installmentNumber', 'installmentTotal',
            'invoiceMonthYear', 'isAutomatic', 'debtId', 'transactionType', 'cardClosingDay', 'cardDueDay',
            'userId', 'isVirtual', 'originalId', 'isInvoicePayment', 'isTransfer'
          ].includes(key)) {
            clean[key] = mapped[key];
          }
        });
        return clean;
      });

      if (import.meta.env.DEV) {
        console.log('[ADD TRANSACTION PAYLOAD]', JSON.stringify(txsWithUser, null, 2));
      }

      const { data: insertedData, error } = await supabase
        .from('transactions')
        .insert(txsWithUser)
        .select();

      if (error) {
        if (import.meta.env.DEV) {
          console.error('[ADD TRANSACTION ERROR]', error);
        }
        throw error;
      }
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
      if (applyScope === 'this' && transaction.isTransfer && !isVirtual) {
        const idsToDelete = await getSafeTransferDeleteIds(transaction, targetId);
        const { error } = await supabase
          .from('transactions')
          .update({ deleted_at: now })
          .in('id', idsToDelete);
        if (error) throw error;
        return id;
      }

      if (applyScope === 'this' && isPaidInvoicePayment(transaction)) {
        const { error } = await supabase
          .from('transactions')
          .update({ deleted_at: now })
          .eq('id', targetId);
        if (error) throw error;

        await reopenInvoicePurchases(transaction);
        return id;
      }

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
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['transactions'] });
    },
    onError: (err) => {
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
    mutationKey: ['togglePaid'],
    mutationFn: async ({ id, isPaid, date, accountId, isChild }: { id: string, isPaid: boolean, date?: string, accountId?: string, isChild?: boolean }) => {
      // Se estamos estornando (isPaid = false) um filho materializado, ele deve voltar
      // ao estado pendente em vez de virar shadow. Isso tira o item do Extrato e o
      // devolve para a Gestão de Contas pelo fluxo normal de filtros.
      if (!isPaid && isChild) {
        const { error } = await supabase
          .from('transactions')
          .update({
            is_paid: false,
            payment_date: null,
            account_id: null,
            card_id: null,
            invoice_month_year: null,
          })
          .eq('id', id)
          .select();
        if (error) throw error;
        return id;
      }

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
        .eq('id', id)
        .select();
      if (error) throw error;
      return id;
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ['transactions'] });
      return { id };
    },
    onError: (err) => {
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
        invoice_month_year: finalInvoiceMonthYear,
        is_transfer: updates.isTransfer
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
            const originalDay = parseLocalDate(currentTx.date).getDate();
            const lastDay = new Date(year, month + 1, 0).getDate();
            const safeDay = Math.min(originalDay, lastDay);
            targetDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
          }
        } else {
          targetDate = updates.date ? updates.date.slice(0, 10) : currentTx.date.slice(0, 10);
        }

        // Inserir o filho pontual com os dados editados
        const { error } = await supabase.from('transactions').insert({
          ...currentTx,
          id: undefined,
          amount: updates.amount ?? currentTx.amount,
          description: updates.description ?? currentTx.description,
          category_id: updates.categoryId ?? currentTx.category_id,
          subcategory_id: updates.subcategoryId ?? currentTx.subcategory_id ?? null,
          account_id: updates.accountId !== undefined ? updates.accountId : currentTx.account_id,
          card_id: updates.cardId !== undefined ? updates.cardId : currentTx.card_id,
          invoice_month_year: finalInvoiceMonthYear !== undefined ? finalInvoiceMonthYear : currentTx.invoice_month_year,
          date: targetDate,
          original_id: realId,
          is_recurring: false,
          transaction_type: 'punctual',
          is_paid: updates.isPaid ?? false,
          payment_date: updates.paymentDate ?? null,
          deleted_at: null,
          created_at: undefined,
        });
        if (error) throw error;

        // 🛡️ FIX DUPLICATA: Se a mãe está no mesmo mês do filho que acabamos de criar,
        // ela apareceria como transação REAL do mês E o filho também apareceria.
        // Precisamos mover a data da mãe para o próximo mês para que ela continue
        // gerando projeções futuras, mas não apareça como registro real deste mês.
        if (isRecurringMother) {
          const motherDate = parseLocalDate(currentTx.date.slice(0, 10));
          const childDate = parseLocalDate(targetDate);
          const motherMonthYear = `${motherDate.getFullYear()}-${motherDate.getMonth()}`;
          const childMonthYear = `${childDate.getFullYear()}-${childDate.getMonth()}`;

          if (motherMonthYear === childMonthYear) {
            // Avança a mãe para o próximo mês mantendo o mesmo dia
            const nextMonth = motherDate.getMonth() + 1;
            const lastDayOfNextMonth = new Date(motherDate.getFullYear(), nextMonth + 1, 0).getDate();
            const nextMonthDate = new Date(
              motherDate.getFullYear(),
              nextMonth,
              Math.min(motherDate.getDate(), lastDayOfNextMonth)
            );
            const nextMonthStr = format(nextMonthDate, 'yyyy-MM-dd');
            await supabase.from('transactions')
              .update({ date: nextMonthStr })
              .eq('id', realId);
          }
        }

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
            const originalDay = parseLocalDate(currentTx.date).getDate();
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
        // Se for no mesmo mês, apenas atualizamos o registro original (se físico) ou criamos materialização (se virtual).
        const isSameMonthYear = finalDate.slice(0, 7) === rootDate.slice(0, 7);

        if (isSameMonthYear) {
          if (!isVirtual) {
            const { error } = await supabase.from('transactions').update(dbUpdates).eq('id', id);
            if (error) throw error;
          } else {
            // Se for virtual no mesmo mês, apenas materializamos ela como pontual
            const { error } = await supabase.from('transactions').insert({
              ...currentTx,
              id: undefined,
              ...dbUpdates,
              date: finalDate,
              original_id: realId,
              is_recurring: false,
              transaction_type: 'punctual',
              is_paid: false,
              payment_date: null,
              deleted_at: null,
              created_at: undefined,
            });
            if (error) throw error;
          }
          return [];
        }

        // Se o corte é no futuro (mês posterior), preservamos a mãe como pontual
        if (rootDate < finalDate) {
          await supabase.from('transactions')
            .update({ is_recurring: false, transaction_type: 'punctual' })
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
        const { data, error = null } = await supabase.from('transactions').update(dbUpdates).eq('id', realId).select();
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
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['transactions'] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      toast({ title: 'Alterações salvas!' });
    },
    onError: (err) => {
      logSafeError('useUpdateTransaction', err);
      toast({ title: 'Erro ao atualizar lançamento', variant: 'destructive' });
    }
  });
}

export function useUpdateTransferTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      transaction,
      updates,
    }: {
      transaction: any;
      updates: any;
    }) => {
      const targetId = transaction?.id;
      if (!targetId) throw new Error('Transferência não encontrada');

      const amount = Number(updates?.amount || 0);
      const normalizedDate = updates?.date ? String(updates.date).slice(0, 10) : '';
      const fromAccountId = updates?.transferFrom || updates?.fromAccountId || updates?.accountId;
      const transferToType = updates?.transferToType || (updates?.cardId ? 'card' : 'account');
      const toTargetId = updates?.transferTo || updates?.toAccountId || updates?.cardId;
      const description = stripTransferDirection(updates?.transferDescription || updates?.description || transaction?.description);

      if (!Number.isFinite(amount) || amount <= 0 || !normalizedDate || !fromAccountId || !toTargetId) {
        throw new Error('Dados obrigatórios da transferência não preenchidos');
      }

      if (transferToType === 'account' && fromAccountId === toTargetId) {
        throw new Error('Origem e destino não podem ser iguais');
      }

      const { expense, income, transferGroupId } = await getSafeTransferEditPair(transaction, targetId);
      const shouldUsePrefix = hasTransferDirection(expense.description) || hasTransferDirection(income.description);
      const groupUpdate = transferGroupId ? { transfer_group_id: transferGroupId } : {};

      const expenseUpdate = {
        amount,
        date: normalizedDate,
        payment_date: normalizedDate,
        account_id: fromAccountId,
        card_id: null,
        type: 'expense',
        transaction_type: 'punctual',
        is_paid: true,
        is_transfer: true,
        is_invoice_payment: false,
        invoice_month_year: null,
        description: getTransferEditDescription('Saída', description, shouldUsePrefix),
        ...groupUpdate,
      };

      const incomeUpdate = {
        amount,
        date: normalizedDate,
        payment_date: normalizedDate,
        account_id: transferToType === 'account' ? toTargetId : null,
        card_id: transferToType === 'card' ? toTargetId : null,
        type: 'income',
        transaction_type: 'punctual',
        is_paid: true,
        is_transfer: true,
        is_invoice_payment: transferToType === 'card',
        invoice_month_year: transferToType === 'card' ? (updates?.invoiceMonthYear || null) : null,
        description: getTransferEditDescription('Entrada', description, shouldUsePrefix),
        ...groupUpdate,
      };

      const { data: expenseData, error: expenseError } = await supabase
        .from('transactions')
        .update(expenseUpdate)
        .eq('id', expense.id)
        .select();
      if (expenseError) throw expenseError;

      const { data: incomeData, error: incomeError } = await supabase
        .from('transactions')
        .update(incomeUpdate)
        .eq('id', income.id)
        .select();
      if (incomeError) throw incomeError;

      return [...(expenseData || []), ...(incomeData || [])];
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['transactions'] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      toast({ title: 'Transferência corrigida!' });
    },
    onError: (err: any) => {
      logSafeError('useUpdateTransferTransaction', err);
      toast({
        title: 'Erro ao corrigir transferência',
        description: err?.message,
        variant: 'destructive',
      });
    },
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
        transactionKind?: Transaction['type'],
        amount?: number,
        date?: string,
        cardId?: string,
        invoiceMonthYear?: string,
        isInvoicePayment?: boolean,
        isTransfer?: boolean,
        transferGroupId?: string,
        transfer_group_id?: string,
      }[],
      installmentScope?: 'this' | 'future' | 'all',
      deleteFutureBills?: boolean
    }) => {
      const transactionIdsToUpdate = new Set<string>();
      const billIdsToUpdate = new Set<string>();
      const transferIdsToUpdate = new Set<string>();
      const invoicePaymentsToReopen: any[] = [];
      const now = new Date().toISOString();

      // 1. Classificar o que "deletar" (marcar como deletado)
      for (const item of items) {
        if (item.type === 'transaction') {
          const normalizedItem = { ...item, type: item.transactionKind };

          if (installmentScope === 'this' && item.isTransfer) {
            const idsToDelete = await getSafeTransferDeleteIds(normalizedItem, item.id);
            idsToDelete.forEach((idToDelete) => transferIdsToUpdate.add(idToDelete));
            continue;
          }

          if (installmentScope === 'this' && isPaidInvoicePayment(normalizedItem)) {
            invoicePaymentsToReopen.push(normalizedItem);
          }

          if (installmentScope === 'this' || !item.installmentGroupId) {
            transactionIdsToUpdate.add(item.id);
          } else {
            let query = supabase.from('transactions').select('id').eq('installment_group_id', item.installmentGroupId);

            if (installmentScope === 'future') {
              const { data: tx = null } = await supabase.from('transactions').select('date').eq('id', item.id).single();
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
      // Nota: itens do tipo 'bill' vivem em 'transactions' (a tabela 'bills' não existe).
      // Mescla ambos os sets e deleta numa única operação.
      const allIdsToDelete = new Set([
        ...Array.from(transactionIdsToUpdate),
        ...Array.from(billIdsToUpdate),
        ...Array.from(transferIdsToUpdate)
      ]);

      if (allIdsToDelete.size > 0) {
        const { error } = await supabase
          .from('transactions')
          .update({ deleted_at: now })
          .in('id', Array.from(allIdsToDelete));
        if (error) throw error;
      }

      for (const invoicePayment of invoicePaymentsToReopen) {
        await reopenInvoicePurchases(invoicePayment);
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
        .is('deleted_at', null)
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
      const { data: currentTx = null } = await supabase
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
