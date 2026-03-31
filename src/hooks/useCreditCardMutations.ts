import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { CreditCard } from '@/types/finance';
import { useAuth } from '@/contexts/AuthContext';

// --- 1. ADICIONAR CARTÃO DE CRÉDITO ---
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
        color: card.color,
        texture: card.texture || 'solid',
        progresscolor: card.progressColor ?? null,
        due_day: card.dueDay,
        closing_day: card.closingDay,
        is_closing_date_fixed: card.isClosingDateFixed ?? false,
        is_active: card.isActive ?? true,
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

// --- 2. ATUALIZAR CARTÃO DE CRÉDITO ---
export function useUpdateCreditCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { id: string, updates: Partial<CreditCard> }) => {
      if (!payload || !payload.id || !payload.updates) {
        throw new Error('Payload de atualização inválido');
      }

      const { id, updates } = payload;
      const dbPayload: any = {};

      if (updates.name !== undefined) dbPayload.name = updates.name;
      if (updates.bank !== undefined) dbPayload.bank = updates.bank;
      if (updates.limit !== undefined) dbPayload.limit = updates.limit;
      if (updates.color !== undefined) dbPayload.color = updates.color;
      if (updates.texture !== undefined) dbPayload.texture = updates.texture;
      if (updates.progressColor !== undefined) dbPayload.progresscolor = updates.progressColor;
      if (updates.dueDay !== undefined) dbPayload.due_day = updates.dueDay;
      if (updates.closingDay !== undefined) dbPayload.closing_day = updates.closingDay;
      if (updates.isClosingDateFixed !== undefined) dbPayload.is_closing_date_fixed = updates.isClosingDateFixed;
      if (updates.history !== undefined) dbPayload.history = updates.history;
      if (updates.isActive !== undefined) dbPayload.is_active = updates.isActive;

      const { error } = await supabase.from('credit_cards').update(dbPayload).eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({ title: 'Cartão atualizado!' });
    },
    onError: (err) => {
      console.error('Erro ao atualizar cartão:', err);
      toast({ title: 'Erro ao atualizar cartão', variant: 'destructive' });
    }
  });
}

// --- 3. DELETAR CARTÃO DE CRÉDITO ---
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
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({ title: 'Cartão removido.' });
    },
    onError: (err) => {
      console.error('Erro ao remover cartão:', err);
      toast({ title: 'Erro ao remover cartão', variant: 'destructive' });
    }
  });
}
