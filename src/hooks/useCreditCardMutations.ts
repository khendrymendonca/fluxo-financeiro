import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { CreditCard } from '@/types/finance';
import { useAuth } from '@/contexts/AuthContext';

// --- 1. ADICIONAR CARTÃO DE CRÃ‰DITO ---
export function useAddCreditCard() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (card: Omit<CreditCard, 'id' | 'userId'>) => {
      if (!user) throw new Error('Utilizador não autenticado');

      const payload = {
        user_id: user.id,
        name: card.name,
        bank: card.bank,
        limit: card.limit,
        due_day: card.dueDay,
        closing_day: card.closingDay,
        history: card.history || []
      };

      const { data, error } = await supabase.from('credit_cards').insert(payload).select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      toast({ title: 'Cartão de crédito adicionado!' });
    },
    onError: (err) => {
      console.error('Erro ao adicionar cartão:', err);
      toast({ title: 'Erro ao adicionar cartão', variant: 'destructive' });
    }
  });
}

// --- 2. ATUALIZAR CARTÃO DE CRÃ‰DITO ---
export function useUpdateCreditCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<CreditCard> }) => {
      const payload: any = { ...updates };
      
      if (updates.dueDay !== undefined) payload.due_day = updates.dueDay;
      if (updates.closingDay !== undefined) payload.closing_day = updates.closingDay;

      const { error } = await supabase.from('credit_cards').update(payload).eq('id', id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      toast({ title: 'Cartão atualizado!' });
    }
  });
}

// --- 3. DELETAR CARTÃO DE CRÃ‰DITO ---
export function useDeleteCreditCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('credit_cards').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      toast({ title: 'Cartão removido.' });
    }
  });
}


