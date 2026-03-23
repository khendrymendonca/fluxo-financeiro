import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { Bill } from '@/types/finance';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

// --- 1. ADICIONAR CONTA A PAGAR ---
export function useAddBill() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (bill: Omit<Bill, 'id' | 'userId'>) => {
      if (!user) throw new Error('Utilizador não autenticado');

      const billData = {
        user_id: user.id,
        category_id: bill.categoryId || null,
        account_id: bill.accountId || null,
        card_id: bill.cardId || null,
        name: bill.name,
        amount: bill.amount,
        type: bill.type,
        due_date: bill.dueDate,
        status: bill.status || 'pending',
        is_fixed: bill.isFixed,
        start_date: (bill.startDate || bill.dueDate)?.split('T')[0]
      };

      const { data, error } = await supabase.from('bills').insert(billData).select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      toast({ title: 'Conta agendada!' });
    }
  });
}

// --- 2. ATUALIZAR CONTA A PAGAR ---
export function useUpdateBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<Bill> }) => {
      const dbUpdates: any = { ...updates };
      if (updates.paymentDate !== undefined) dbUpdates.payment_date = updates.paymentDate;
      if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId;
      if (updates.accountId !== undefined) dbUpdates.account_id = updates.accountId;
      if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
      if (updates.cardId !== undefined) dbUpdates.card_id = updates.cardId;

      const { error } = await supabase.from('bills').update(dbUpdates).eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
    }
  });
}

// --- 3. DELETAR CONTA A PAGAR ---
export function useDeleteBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('bills').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      toast({ title: 'Conta removida.' });
    }
  });
}

// --- 4. PAGAR CONTA ---
export function usePayBill() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ bill, accountId, paymentDate, isPartial, partialAmount, cardId }: any) => {
      if (!user) throw new Error('Utilizador não autenticado');

      const cleanPaymentDate = (paymentDate || new Date().toISOString()).split('T')[0];
      const payAmount = isPartial && partialAmount ? partialAmount : (bill.amount ?? 0);
      
      const isCardBill = !!bill.cardId && bill.categoryId === 'card-payment';

      const { error: txError } = await supabase.from('transactions').insert({
        user_id: user.id,
        description: isPartial ? `Abatimento: ${bill.name}` : `Pgto: ${bill.name}`,
        amount: payAmount,
        type: 'expense',
        date: cleanPaymentDate,
        account_id: accountId || null,
        card_id: isCardBill ? null : (cardId || bill.cardId || null),
        is_paid: true,
        payment_date: cleanPaymentDate,
        is_invoice_payment: isCardBill,
        category_id: bill.categoryId || null
      });

      if (txError) throw txError;

      if (!bill.isVirtual && bill.id) {
        const { error: billUpdateError } = await supabase
          .from('bills')
          .update({ status: 'paid', payment_date: cleanPaymentDate })
          .eq('id', bill.id);
        if (billUpdateError) throw billUpdateError;
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({ title: 'Pagamento concluído!' });
    },
    onError: (err) => {
      console.error('Erro ao baixar conta:', err);
      toast({ title: 'Erro ao processar pagamento', variant: 'destructive' });
    }
  });
}
