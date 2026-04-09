import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, logSafeError } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { Category, Subcategory } from '@/types/finance';

export function useAddCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (category: Omit<Category, 'id' | 'userId'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilizador não autenticado');

      const safeName = (category.name ?? '').trim().slice(0, 100);

      const { data, error } = await supabase.from('categories').insert({
        name: safeName,
        type: category.type,
        icon: category.icon,
        color: category.color,
        group_id: category.groupId,
        budget_group: category.budgetGroup,
        is_fixed: category.isFixed || false,
        budgetlimit: category.budgetLimit ?? null,
        user_id: user.id
      }).select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({ title: 'Categoria criada!' });
    },
    onError: (err) => {
      logSafeError('useAddCategory', err);
      toast({ title: 'Erro ao criar categoria', variant: 'destructive' });
    }
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<Category> }) => {
      const dbUpdates: any = {
        type: updates.type,
        icon: updates.icon,
        color: updates.color,
        group_id: updates.groupId,
        budget_group: updates.budgetGroup,
        is_fixed: updates.isFixed,
        is_active: updates.isActive,
        budgetlimit: updates.budgetLimit !== undefined ? updates.budgetLimit : undefined
      };

      if (updates.name !== undefined) {
        dbUpdates.name = updates.name.trim().slice(0, 100);
      }

      const { data, error } = await supabase
        .from('categories')
        .update(dbUpdates)
        .eq('id', id)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({ title: 'Categoria atualizada!' });
    },
    onError: (err) => {
      logSafeError('useUpdateCategory', err);
      toast({ title: 'Erro ao atualizar categoria', variant: 'destructive' });
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
    },
    onError: (err) => {
      logSafeError('useDeleteCategory', err);
      toast({ title: 'Erro ao remover categoria', variant: 'destructive' });
    }
  });
}

export function useAddSubcategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subcategory: Omit<Subcategory, 'id'>) => {
      const safeName = (subcategory.name ?? '').trim().slice(0, 100);

      const { data, error } = await supabase.from('subcategories').insert({
        name: safeName,
        category_id: subcategory.categoryId
      }).select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
      toast({ title: 'Subcategoria criada!' });
    },
    onError: (err) => {
      logSafeError('useAddSubcategory', err);
      toast({ title: 'Erro ao criar subcategoria', variant: 'destructive' });
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
    },
    onError: (err) => {
      logSafeError('useDeleteSubcategory', err);
      toast({ title: 'Erro ao remover subcategoria', variant: 'destructive' });
    }
  });
}

export function useUpdateSubcategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string, name: string }) => {
      const safeName = (name ?? '').trim().slice(0, 100);
      const { data, error } = await supabase.from('subcategories').update({ name: safeName }).eq('id', id).select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
      toast({ title: 'Subcategoria atualizada!' });
    },
    onError: (err) => {
      logSafeError('useUpdateSubcategory', err);
      toast({ title: 'Erro ao atualizar subcategoria', variant: 'destructive' });
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
    },
    onError: (err) => {
      logSafeError('useUpdateBudgetRule', err);
      toast({ title: 'Erro ao atualizar regra de orçamento', variant: 'destructive' });
    }
  });
}
