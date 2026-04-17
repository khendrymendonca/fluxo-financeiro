import { useMemo } from 'react';
import { useFinanceStore } from './useFinanceStore';
import { parseLocalDate } from '@/utils/dateUtils';
import { subMonths, startOfMonth, isSameMonth } from 'date-fns';

export type ProjectionMode = 'fixed' | 'avg6';

export function useProjectionData() {
  const { transactions, categories, debts } = useFinanceStore();

  return useMemo(() => {
    const today = new Date();

    // Apenas mães recorrentes (sem cartão, sem transferência)
    const recurringMothers = transactions.filter(t =>
      t.isRecurring && !t.originalId && !t.isTransfer && !t.isInvoicePayment && !t.cardId
    );

    // Função: média real dos últimos 6 meses para um ID de transação mãe
    const getAvg6 = (motherId: string) => {
      const months = Array.from({ length: 6 }, (_, i) => subMonths(startOfMonth(today), i + 1));
      let total = 0;
      let count = 0;
      months.forEach(month => {
        const children = transactions.filter(t =>
          (t.originalId === motherId || t.id === motherId) &&
          t.isPaid &&
          isSameMonth(parseLocalDate(t.date), month)
        );
        if (children.length > 0) {
          total += children.reduce((s, t) => s + Number(t.amount), 0);
          count++;
        }
      });
      return count > 0 ? total / count : null; // null = sem histórico
    };

    // Monta lista de itens com valor fixo e média
    const items = recurringMothers.map(t => {
      const cat = categories.find(c => c.id === t.categoryId);
      const avg = getAvg6(t.id);
      return {
        id: t.id,
        description: t.description,
        type: t.type as 'income' | 'expense',
        fixedAmount: Number(t.amount),
        avgAmount: avg ?? Number(t.amount), // fallback para valor fixo se sem histórico
        hasAvg: avg !== null,
        categoryName: cat?.name ?? 'Sem categoria',
        categoryColor: cat?.color ?? '#888',
      };
    });

    // Dívidas ativas (parcelas mensais)
    const debtItems = debts
      .filter(d => d.status === 'active')
      .map(d => ({
        id: d.id,
        description: d.name,
        type: 'expense' as const,
        fixedAmount: Number(d.installmentAmount) || Number(d.minimumPayment) || 0,
        avgAmount: Number(d.installmentAmount) || Number(d.minimumPayment) || 0,
        hasAvg: false,
        categoryName: 'Dívida',
        categoryColor: '#ef4444',
      }));

    return { items: [...items, ...debtItems] };
  }, [transactions, categories, debts]);
}
