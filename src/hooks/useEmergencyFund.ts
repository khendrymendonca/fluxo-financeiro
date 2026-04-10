import { useState, useMemo, useCallback } from 'react';
import { useAccounts, useCategories, useCategoryGroups, useTransactions } from './useFinanceQueries';
import { Transaction } from '@/types/finance';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { parseLocalDate } from '@/utils/dateUtils';

export function useEmergencyFund(currentMonthTransactions: Transaction[]) {
  // Puxamos os dados do cache do React Query instantaneamente
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const { data: categoryGroups = [] } = useCategoryGroups();

  // Estado local para os meses da reserva (lido do localStorage com segurança)
  const [emergencyMonths, setEmergencyMonthsState] = useState(() => {
    try {
      const saved = localStorage.getItem('emergencyMonths');
      return saved ? Number(saved) : 12;
    } catch {
      return 12;
    }
  });

  const setEmergencyMonths = useCallback((months: number) => {
    try {
      localStorage.setItem('emergencyMonths', String(months));
    } catch {
      // Ignora erro de cota ou bloqueio de private mode
    }
    setEmergencyMonthsState(months);
  }, []);

  // useMemo garante que a matemática só rode se os dados relevantes mudarem
  const emergencyData = useMemo(() => {
    // 1. Identifica quais categorias são "Necessidades Essenciais"
    // Heurística: tenta primeiro via grupo 'essencial'; fallback para isFixed
    const needsGroup = categoryGroups.find(g =>
      g.name === 'essencial' || g.name?.toLowerCase().includes('essencial')
    );
    const needsCategoryIds = needsGroup
      ? categories.filter(c => c.groupId === needsGroup.id).map(c => c.id)
      : categories.filter(c => c.isFixed && c.type === 'expense').map(c => c.id);

    // 2. Calcula o custo fixo mensal a partir das transações do mês atual
    // Usa transações recorrentes ou transações de categorias fixas
    const fixedFromCategories = currentMonthTransactions
      .filter(t => t.type === 'expense' && t.categoryId && needsCategoryIds.includes(t.categoryId))
      .reduce((acc, curr) => acc + Number(curr.amount), 0);

    // Fallback: se não há categorias essenciais mapeadas, usa recorrentes
    const fixedFromRecurring = needsCategoryIds.length === 0
      ? currentMonthTransactions
        .filter(t => t.type === 'expense' && (t.isRecurring || t.transactionType === 'recurring'))
        .reduce((acc, curr) => acc + Number(curr.amount), 0)
      : 0;

    const monthlyFixed = fixedFromCategories || fixedFromRecurring;

    // 3. Define a meta financeira (Gastos Essenciais x Meses Desejados)
    const targetAmount = monthlyFixed * emergencyMonths;

    // 4. Soma o que já está guardado nas contas de reserva
    const reserveAccounts = accounts.filter(acc =>
      ['metas', 'caixinha', 'investment'].includes(acc.accountType) ||
      acc.name.toLowerCase().includes('reserva')
    );
    const currentAmount = reserveAccounts.reduce((sum, acc) => sum + Number(acc.balance), 0);

    // 5. Calcula o progresso (limitado a 100% para não quebrar a UI)
    const rawProgress = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
    const progress = Math.min(rawProgress, 100);

    return {
      monthlyFixed,
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
