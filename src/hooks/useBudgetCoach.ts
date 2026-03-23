import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { useCategories, useCategoryGroups } from './useFinanceQueries';
import { Transaction } from '@/types/finance';

// --- 1. BUSCAR REGRA DE ORÇAMENTO ---
export function useBudgetRule() {
  return useQuery({
    queryKey: ['budgetRule'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilizador não autenticado');

      const { data, error } = await supabase
        .from('budget_rules')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      // Retorna a regra do utilizador ou o padrão mundial 50/30/20
      return data ? {
        needsPercent: data.needs_percent,
        wantsPercent: data.wants_percent,
        savingsPercent: data.savings_percent
      } : { needsPercent: 50, wantsPercent: 30, savingsPercent: 20 };
    }
  });
}

// --- 2. ATIVAR O COACH (Seed) ---
export function useSeedCoach() {
  const queryClient = useQueryClient();
  const { data: categoryGroups = [] } = useCategoryGroups();

  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilizador não autenticado');

      const needsGroup = categoryGroups.find(g => g.name === 'needs');
      const wantsGroup = categoryGroups.find(g => g.name === 'wants');
      const savingsGroup = categoryGroups.find(g => g.name === 'savings');

      if (!needsGroup || !wantsGroup || !savingsGroup) {
        throw new Error('Grupos de categorias não encontrados no banco.');
      }

      const defaultCategories = [
        { user_id: user.id, group_id: needsGroup.id, name: 'Moradia', type: 'expense', icon: 'Home' },
        { user_id: user.id, group_id: needsGroup.id, name: 'Alimentação', type: 'expense', icon: 'Utensils' },
        { user_id: user.id, group_id: needsGroup.id, name: 'Transporte', type: 'expense', icon: 'Car' },
        { user_id: user.id, group_id: needsGroup.id, name: 'Saúde', type: 'expense', icon: 'Heart' },
        { user_id: user.id, group_id: wantsGroup.id, name: 'Lazer', type: 'expense', icon: 'PartyPopper' },
        { user_id: user.id, group_id: wantsGroup.id, name: 'Delivery', type: 'expense', icon: 'ShoppingBag' },
        { user_id: user.id, group_id: wantsGroup.id, name: 'Assinaturas', type: 'expense', icon: 'Repeat' },
        { user_id: user.id, group_id: savingsGroup.id, name: 'Investimentos', type: 'expense', icon: 'TrendingUp' },
        { user_id: user.id, group_id: savingsGroup.id, name: 'Reserva', type: 'expense', icon: 'PiggyBank' },
        { user_id: user.id, group_id: needsGroup.id, name: 'Salário', type: 'income', icon: 'Briefcase' },
      ];

      const { error } = await supabase.from('categories').insert(defaultCategories);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({ title: 'Coach Ativado! Categorias prontas. 🚀' });
    },
    onError: () => {
      toast({ title: 'Erro ao ativar Coach', variant: 'destructive' });
    }
  });
}

// --- 3. MOTOR ANALÍTICO DO ORÇAMENTO (O "Cérebro") ---
export function useBudgetMetrics(currentMonthTransactions: Transaction[]) {
  const { data: budgetRule } = useBudgetRule();
  const { data: categories = [] } = useCategories();
  const { data: categoryGroups = [] } = useCategoryGroups();

  return useMemo(() => {
    const rule = budgetRule || { needsPercent: 50, wantsPercent: 30, savingsPercent: 20 };
    
    // 1. Calcula a renda total do mês (apenas transações já pagas/recebidas)
    const totalIncome = currentMonthTransactions
      .filter(t => t.type === 'income' && t.isPaid)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // 2. Cria mapas de IDs para saber quem é quem
    const getCategoryIdsByGroupName = (groupName: string) => {
      const group = categoryGroups.find(g => g.name === groupName);
      return categories.filter(c => c.groupId === group?.id).map(c => c.id);
    };

    const needsIds = getCategoryIdsByGroupName('needs');
    const wantsIds = getCategoryIdsByGroupName('wants');
    const savingsIds = getCategoryIdsByGroupName('savings');

    // 3. Calcula o gasto real em cada pilar
    const spentNeeds = currentMonthTransactions
      .filter(t => t.type === 'expense' && t.categoryId && needsIds.includes(t.categoryId))
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const spentWants = currentMonthTransactions
      .filter(t => t.type === 'expense' && t.categoryId && wantsIds.includes(t.categoryId))
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const spentSavings = currentMonthTransactions
      .filter(t => t.type === 'expense' && t.categoryId && savingsIds.includes(t.categoryId))
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // 4. Calcula o valor ALVO baseado na renda e nas porcentagens
    return {
      totalIncome,
      needs: {
        spent: spentNeeds,
        target: totalIncome * (rule.needsPercent / 100),
        percentUsed: totalIncome > 0 ? (spentNeeds / (totalIncome * (rule.needsPercent / 100))) * 100 : 0
      },
      wants: {
        spent: spentWants,
        target: totalIncome * (rule.wantsPercent / 100),
        percentUsed: totalIncome > 0 ? (spentWants / (totalIncome * (rule.wantsPercent / 100))) * 100 : 0
      },
      savings: {
        spent: spentSavings,
        target: totalIncome * (rule.savingsPercent / 100),
        percentUsed: totalIncome > 0 ? (spentSavings / (totalIncome * (rule.savingsPercent / 100))) * 100 : 0
      }
    };
  }, [currentMonthTransactions, categories, categoryGroups, budgetRule]);
}
