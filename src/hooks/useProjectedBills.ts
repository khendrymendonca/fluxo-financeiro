import { useMemo } from 'react';
import { isBefore, isSameMonth } from 'date-fns';
import { Bill } from '@/types/finance';

export function useProjectedBills(bills: Bill[], viewDate: Date) {
  return useMemo(() => {
    if (!bills) return [];

    const projected: Bill[] = [];
    const targetMonth = viewDate.getMonth();
    const targetYear = viewDate.getFullYear();

    bills.forEach(bill => {
      const billDate = new Date(bill.dueDate);

      if (bill.isFixed) {
        // Se é fixa E começou ANTES ou DURANTE o mês/ano que estamos a ver
        if (isBefore(billDate, viewDate) || isSameMonth(billDate, viewDate)) {
          // Criamos um "clone" virtual para o mês selecionado
          const virtualDate = new Date(billDate);
          virtualDate.setFullYear(targetYear);
          virtualDate.setMonth(targetMonth);

          projected.push({
            ...bill,
            id: `${bill.id}-virtual-${targetYear}-${targetMonth}`,
            dueDate: virtualDate.toISOString(),
            isVirtual: true,
            status: 'pending' // Projeções futuras começam como pendentes
          } as Bill);
        }
      } else {
        // Se NÃO é fixa, só mostramos se for do próprio mês
        if (isSameMonth(billDate, viewDate)) {
          projected.push(bill);
        }
      }
    });

    return projected.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    
  }, [bills, viewDate]);
}
