import { useMemo } from 'react';
import { useCategories } from './useFinanceQueries';
import { parseLocalDate } from '@/utils/dateUtils';
import { Transaction } from '@/types/finance';
import { safeAdd, safeSubtract } from '@/utils/mathUtils';
import { getTransactionCategoryLabel } from '@/utils/transactionCategory';

export function useDashboardMetrics(viewDate: Date, transactions: Transaction[]) {
  const { data: categories = [] } = useCategories();

  return useMemo(() => {
    const viewMonth = viewDate.getMonth();
    const viewYear = viewDate.getFullYear();

    const currentMonthTransactions = transactions.filter(t => {
      // 🛡️ REGRA HÍBRIDA: Se for cartão, respeita a fatura. Se for conta, respeita a data.
      if (t.cardId && t.invoiceMonthYear) {
        const [year, month] = t.invoiceMonthYear.split('-').map(Number);
        return (month - 1 === viewMonth && year === viewYear);
      }
      const d = parseLocalDate(t.date);
      return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
    });

    const totalIncome = currentMonthTransactions
      .filter(t => t.type === 'income' && t.isPaid && !t.isTransfer)
      .reduce((sum, t) => safeAdd(sum, t.amount), 0);

    const totalExpenses = currentMonthTransactions
      .filter(t => t.type === 'expense' && (t.isPaid || !!t.cardId) && !t.isInvoicePayment && !t.isTransfer)
      .reduce((sum, t) => safeAdd(sum, t.amount), 0);

    const categoryMap = new Map<string, number>();
    currentMonthTransactions
      .filter(t => t.type === 'expense' && !t.isInvoicePayment && !t.isTransfer)
      .forEach(t => {
        const name = getTransactionCategoryLabel(t, categories);
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


