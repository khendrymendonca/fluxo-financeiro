import { useMemo } from 'react';
import { isBefore, isSameMonth } from 'date-fns';
import { Bill } from '@/types/finance';
import { parseLocalDate } from '@/utils/dateUtils';

export function useProjectedBills(bills: Bill[], viewDate: Date) {
  return useMemo(() => {
    if (!bills) return [];

    const projected: Bill[] = [];
    const targetMonth = viewDate.getMonth();
    const targetYear = viewDate.getFullYear();

    bills.forEach(bill => {
      const billDate = parseLocalDate(bill.dueDate);

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

    return projected.sort((a, b) => parseLocalDate(a.dueDate).getTime() - parseLocalDate(b.dueDate).getTime());
    
  }, [bills, viewDate]);
}


