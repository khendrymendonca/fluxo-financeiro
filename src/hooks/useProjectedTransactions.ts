import { useMemo } from 'react';
import { isBefore, isSameMonth, getDaysInMonth, format } from 'date-fns';
import { Transaction } from '@/types/finance';
import { parseLocalDate } from '@/utils/dateUtils';

export function useProjectedTransactions(transactions: Transaction[], viewDate: Date) {
  return useMemo(() => {
    if (!transactions) return [];

    const projected: Transaction[] = [];
    const targetMonth = viewDate.getMonth();
    const targetYear = viewDate.getFullYear();

    // 1. Separamos o que é REAL (transações normais do banco)
    const realTransactions = transactions.filter(tx => {
      const txDate = parseLocalDate(tx.date.slice(0, 10));
      return isSameMonth(txDate, viewDate) && !tx.isVirtual;
    });

    transactions.forEach(tx => {
      // Usamos parseLocalDate para evitar bugs de fuso horário ISO
      const txDate = parseLocalDate(tx.date.slice(0, 10));

      if (tx.isRecurring) {
        // Se é recorrente E começou ANTES ou DURANTE o mês/ano que estamos a ver
        if (isBefore(txDate, viewDate) || isSameMonth(txDate, viewDate)) {
          
          // Bug 3: Clamp do dia para evitar que dia 29/30/31 pule para o mês seguinte
          const originalDay = txDate.getDate();
          const daysInTarget = getDaysInMonth(new Date(targetYear, targetMonth));
          const safeDay = Math.min(originalDay, daysInTarget);
          const virtualDate = new Date(targetYear, targetMonth, safeDay);

          // Bug 5: Deduplicação - Só projetamos se não houver uma REAL para este mês
          // baseada na mesma recorrente (originalId ou mesma descrição/valor)
          const hasRealEquivalent = realTransactions.some(real => 
            real.originalId === tx.id || 
            (real.description === tx.description && Math.abs(Number(real.amount) - Number(tx.amount)) < 0.01)
          );

          if (!hasRealEquivalent) {
            projected.push({
              ...tx,
              id: `${tx.id}-virtual-${targetYear}-${targetMonth}`,
              originalId: tx.id,
              date: format(virtualDate, 'yyyy-MM-dd'),
              isVirtual: true,
            } as any);
          }
        }
      } else {
        // Se NÃO é recorrente, só mostramos se for do próprio mês
        if (isSameMonth(txDate, viewDate)) {
          projected.push(tx);
        }
      }
    });

    // Ordenamos tudo por data no final
    return projected.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
  }, [transactions, viewDate]);
}


