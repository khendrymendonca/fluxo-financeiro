import { useMemo } from 'react';
import { isBefore, isSameMonth, setYear, setMonth } from 'date-fns';
import { Transaction } from '@/types/finance';

export function useProjectedTransactions(transactions: Transaction[], viewDate: Date) {
  return useMemo(() => {
    if (!transactions) return [];

    const projected: Transaction[] = [];
    const targetMonth = viewDate.getMonth();
    const targetYear = viewDate.getFullYear();

    transactions.forEach(tx => {
      const txDate = new Date(tx.date);

      if (tx.isRecurring) {
        // Se é recorrente E começou ANTES ou DURANTE o mês/ano que estamos a ver
        if (isBefore(txDate, viewDate) || isSameMonth(txDate, viewDate)) {
          // Criamos um "clone" virtual para o mês selecionado
          const virtualDate = new Date(txDate);
          virtualDate.setFullYear(targetYear);
          virtualDate.setMonth(targetMonth);

          // Evita projetar se já houver uma transação real para este mês vinda da mesma recorrente (se houver essa lógica)
          // No momento, apenas projetamos.
          projected.push({
            ...tx,
            id: `${tx.id}-virtual-${targetYear}-${targetMonth}`, // ID único vital para o React (key)
            originalId: tx.id, // Guardamos a referência original
            date: virtualDate.toISOString(),
            isVirtual: true, // Uma flag útil para o UI saber que isto é uma projeção
          } as any);
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
    
  }, [transactions, viewDate]); // Recalcula instantaneamente sempre que mudar de mês
}
