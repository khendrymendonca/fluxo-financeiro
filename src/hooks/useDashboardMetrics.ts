import { useMemo } from 'react';
import { useCategories } from './useFinanceQueries';
import { parseLocalDate } from '@/utils/dateUtils';
import { Transaction } from '@/types/finance';

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
      .filter(t => t.type === 'receita')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpenses = currentMonthTransactions
      .filter(t => t.type === 'despesa' && !t.isInvoicePayment)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const categoryMap = new Map<string, number>();
    currentMonthTransactions
      .filter(t => t.type === 'despesa' && !t.isInvoicePayment)
      .forEach(t => {
        const cat = categories.find(c => c.id === t.categoryId);
        const name = cat?.name || 'Sem Categoria';
        categoryMap.set(name, (categoryMap.get(name) || 0) + Number(t.amount));
      });

    const categoryExpenses = Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return {
      cashflow: {
        totalIncome,
        totalExpenses,
        balance: totalIncome - totalExpenses
      },
      categoryExpenses,
      isLoading: false
    };
  }, [viewDate, transactions, categories]);
}


