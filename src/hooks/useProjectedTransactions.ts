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

    // 1. Separamos o que é REAL (transações normais do banco) do mês alvo
    const realTransactions = transactions.filter(tx => {
      if (tx.isVirtual) return false;
      const txDate = parseLocalDate(tx.date.slice(0, 10));
      return isSameMonth(txDate, viewDate);
    });

    // 2. Processamos todas as transações para buscar recorrentes que precisam ser projetadas
    transactions.forEach(tx => {
      // Ignoramos transações deletadas (o hook de query já deve filtrar, mas por segurança)
      const isRecurring = tx.isRecurring || tx.transactionType === 'recurring';
      const txDate = parseLocalDate(tx.date.slice(0, 10));

      if (isRecurring) {
        // Se a transação original começou antes ou no mês alvo
        if (isBefore(txDate, viewDate) || isSameMonth(txDate, viewDate)) {

          // Cálculo da data segura no mês alvo
          const originalDay = txDate.getDate();
          const daysInTarget = getDaysInMonth(new Date(targetYear, targetMonth));
          const safeDay = Math.min(originalDay, daysInTarget);
          const virtualDate = new Date(targetYear, targetMonth, safeDay);

          // Deduplicação: Não projetamos se já houver uma transação REAL neste mês 
          // que seja filha desta recorrente
          const hasRealEquivalent = realTransactions.some(real =>
            real.originalId === tx.id ||
            real.description === tx.description && Math.abs(Number(real.amount) - Number(tx.amount)) < 0.01
          );

          if (!hasRealEquivalent) {
            projected.push({
              ...tx,
              id: `${tx.id}-virtual-${targetYear}-${targetMonth}`,
              originalId: tx.id,
              date: format(virtualDate, 'yyyy-MM-dd'),
              isVirtual: true,
              isPaid: false, // Projeções futuras nunca estão pagas
            } as any);
          }
        }
      }

      // Sempre incluímos a própria transação se ela for do mês alvo e REAL
      if (!tx.isVirtual && isSameMonth(txDate, viewDate)) {
        if (!projected.some(p => p.id === tx.id)) {
          projected.push(tx);
        }
      }
    });

    return projected.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [transactions, viewDate]);
}


