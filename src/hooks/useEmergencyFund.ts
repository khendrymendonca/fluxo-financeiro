import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAccounts, useCategories, useCategoryGroups } from './useFinanceQueries';
import { Transaction } from '@/types/finance';

export function useEmergencyFund(currentMonthTransactions: Transaction[]) {
  // Puxamos os dados do cache do React Query instantaneamente
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const { data: categoryGroups = [] } = useCategoryGroups();
  
  // Estado local para os meses da reserva (lido do localStorage)
  const [emergencyMonths, setEmergencyMonthsState] = useState(12);

  useEffect(() => {
    const saved = localStorage.getItem('emergencyMonths');
    if (saved) setEmergencyMonthsState(Number(saved));
  }, []);

  const setEmergencyMonths = useCallback((months: number) => {
    localStorage.setItem('emergencyMonths', String(months));
    setEmergencyMonthsState(months);
  }, []);

  // useMemo garante que a matemática só rode se os dados relevantes mudarem
  const emergencyData = useMemo(() => {
    // 1. Identifica quais categorias são "Necessidades Essenciais"
    const needsGroup = categoryGroups.find(g => g.name === 'essencial');
    const needsCategoryIds = categories
      .filter(c => c.groupId === needsGroup?.id)
      .map(c => c.id);
    
    // 2. Soma todos os gastos essenciais do mês atual
    const fixedExpenses = currentMonthTransactions
      .filter(t => t.type === 'despesa' && t.categoryId && needsCategoryIds.includes(t.categoryId))
      .reduce((acc, curr) => acc + Number(curr.amount), 0);
      
    // 3. Define a meta financeira (Gastos Essenciais x Meses Desejados)
    const targetAmount = fixedExpenses * emergencyMonths;
    
    // 4. Soma o que você já tem guardado
    const reserveAccounts = accounts.filter(acc => 
      ['metas', 'caixinha', 'investment'].includes(acc.accountType)
    );
    const currentAmount = reserveAccounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
    
    // 5. Calcula o progresso (limitado a 100% para não quebrar a UI se você passar da meta)
    const rawProgress = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
    const progress = Math.min(rawProgress, 100);

    return {
      monthlyFixed: fixedExpenses,
      targetAmount,
      currentAmount,
      progress,
      months: emergencyMonths,
      reserveAccounts
    };
  }, [currentMonthTransactions, accounts, categories, categoryGroups, emergencyMonths]);

  return {
    ...emergencyData,
    setEmergencyMonths
  };
}


