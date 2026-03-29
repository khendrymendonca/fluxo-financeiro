import { useMemo } from 'react';
import { useCategories } from './useFinanceQueries';
import { parseLocalDate } from '@/utils/dateUtils';
import { Transaction } from '@/types/finance';
import { safeAdd, safeSubtract } from '@/utils/mathUtils';

export function useDashboardMetrics(viewDate: Date, transactions: Transaction[]) {
  const { data: categories = [] } = useCategories();

  return useMemo(() => {
    const viewMonth = viewDate.getMonth();
    const viewYear = viewDate.getFullYear();

    const currentMonthTransactions = transactions.filter(t => {
      const d = parseLocalDate(t.date);
      return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
    });

    const totalIncome = currentMonthTransactions
      .filter(t => t.type === 'income' && t.isPaid)
      .reduce((sum, t) => safeAdd(sum, t.amount), 0);

    const totalExpenses = currentMonthTransactions
      .filter(t => t.type === 'expense' && t.isPaid && !t.isInvoicePayment)
      .reduce((sum, t) => safeAdd(sum, t.amount), 0);

    const categoryMap = new Map<string, number>();
    currentMonthTransactions
      .filter(t => t.type === 'expense' && !t.isInvoicePayment)
      .forEach(t => {
        const cat = categories.find(c => c.id === t.categoryId);
        const name = cat?.name || 'Sem Categoria';
        categoryMap.set(name, safeAdd(categoryMap.get(name) || 0, t.amount));
      });

    const categoryExpenses = Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return {
      cashflow: {
        totalIncome,
        totalExpenses,
        balance: safeSubtract(totalIncome, totalExpenses)
      },
      categoryExpenses,
      isLoading: false
    };
  }, [viewDate, transactions, categories]);
}


