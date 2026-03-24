import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { Category, Subcategory } from '@/types/finance';

export function useAddCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (category: Omit<Category, 'id' | 'userId'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilizador não autenticado');

      const { data, error } = await supabase.from('categories').insert({
        name: category.name,
        type: category.type,
        icon: category.icon,
        color: category.color,
        group_id: category.groupId,
        user_id: user.id
      }).select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({ title: 'Categoria criada!' });
    }
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({ title: 'Categoria removida.' });
    }
  });
}

export function useAddSubcategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subcategory: Omit<Subcategory, 'id'>) => {
      const { data, error } = await supabase.from('subcategories').insert({
        name: subcategory.name,
        category_id: subcategory.categoryId
      }).select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
      toast({ title: 'Subcategoria criada!' });
    }
  });
}

export function useDeleteSubcategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('subcategories').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
      toast({ title: 'Subcategoria removida.' });
    }
  });
}

export function useUpdateBudgetRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rule: { needsPercent: number, wantsPercent: number, savingsPercent: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilizador não autenticado');

      const { error } = await supabase.from('budget_rules').upsert({
        user_id: user.id,
        needs_percent: rule.needsPercent,
        wants_percent: rule.wantsPercent,
        savings_percent: rule.savingsPercent
      });

      if (error) throw error;
      return rule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgetRule'] });
      toast({ title: 'Regra de orçamento atualizada!' });
    }
  });
}


