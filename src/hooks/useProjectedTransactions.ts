import { useMemo } from 'react';
import { isBefore, isSameMonth, getDaysInMonth, format, startOfMonth } from 'date-fns';
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
      const isShadow = !!(tx as any).deleted_at && !!tx.originalId && !tx.isRecurring;
      if (!isShadow && tx.isVirtual) return false;
      if (!isShadow && (tx as any).deleted_at) return false;

      if (tx.isInvoicePayment && tx.invoiceMonthYear) {
        const [year, month] = tx.invoiceMonthYear.split('-').map(Number);
        return month - 1 === targetMonth && year === targetYear;
      }

      const txDate = parseLocalDate(tx.date.slice(0, 10));
      return isSameMonth(txDate, viewDate);
    });

    // 2. Processamos todas as transações para buscar recorrentes que precisam ser projetadas
    transactions.forEach(tx => {
      const isShadow = !!(tx as any).deleted_at && !!tx.originalId && !tx.isRecurring;
      if ((tx as any).deleted_at && !isShadow) return;
      if (isShadow) return;

      const isRecurring = tx.isRecurring;
      const txDate = parseLocalDate(tx.date.slice(0, 10));

      if (isRecurring) {
        if (isBefore(txDate, startOfMonth(viewDate)) || isSameMonth(txDate, viewDate)) {
          const originalDay = txDate.getDate();
          const daysInTarget = getDaysInMonth(new Date(targetYear, targetMonth));
          const safeDay = Math.min(originalDay, daysInTarget);
          const virtualDate = new Date(targetYear, targetMonth, safeDay);

          // 🛡️ REGRA DE OURO DEDUPLICAÇÃO:
          // Não projetamos se houver vínculo de ID (filho físico real já existe para este mês)
          const hasRealEquivalent = realTransactions.some(real =>
            real.originalId === tx.id ||
            (real.id === tx.id && isSameMonth(parseLocalDate(real.date.slice(0, 10)), viewDate))
          );

          if (!hasRealEquivalent) {
            projected.push({
              ...tx,
              id: `${tx.id}-virtual-${targetYear}-${targetMonth}`,
              originalId: tx.id,
              date: format(virtualDate, 'yyyy-MM-dd'),
              isVirtual: true,
              isPaid: false,
            } as any);
          }
        }
      }

      // 3. Projeção de Parcelamentos (Installments)
      if (!isRecurring && tx.installmentGroupId && tx.installmentNumber && tx.installmentTotal && tx.installmentNumber < tx.installmentTotal) {
        if (isBefore(txDate, startOfMonth(viewDate))) {
          const hasMoreRecentInPast = transactions.some(other =>
            !other.isVirtual &&
            other.installmentGroupId === tx.installmentGroupId &&
            parseLocalDate(other.date.slice(0, 10)).getTime() > txDate.getTime() &&
            isBefore(parseLocalDate(other.date.slice(0, 10)), startOfMonth(viewDate))
          );

          if (!hasMoreRecentInPast) {
            const hasGroupInTargetMonth = realTransactions.some(real => real.installmentGroupId === tx.installmentGroupId);
            const hasRealEquivalent = realTransactions.some(real =>
              real.originalId === tx.id ||
              (real.id === tx.id && isSameMonth(parseLocalDate(real.date.slice(0, 10)), viewDate))
            );

            if (!hasGroupInTargetMonth && !hasRealEquivalent) {
              const originalDay = txDate.getDate();
              const daysInTarget = getDaysInMonth(new Date(targetYear, targetMonth));
              const safeDay = Math.min(originalDay, daysInTarget);
              const virtualDate = new Date(targetYear, targetMonth, safeDay);

              const monthDiff = (targetYear - txDate.getFullYear()) * 12 + (targetMonth - txDate.getMonth());
              const projectedInstallmentNumber = tx.installmentNumber + monthDiff;

              if (projectedInstallmentNumber <= tx.installmentTotal) {
                projected.push({
                  ...tx,
                  id: `${tx.id}-virtual-inst-${targetYear}-${targetMonth}`,
                  originalId: tx.id,
                  date: format(virtualDate, 'yyyy-MM-dd'),
                  isVirtual: true,
                  isPaid: false,
                  installmentNumber: projectedInstallmentNumber,
                  description: tx.description.replace(/\b\d+\s*\/\s*\d+\b/, `${projectedInstallmentNumber}/${tx.installmentTotal}`)
                } as any);
              }
            }
          }
        }
      }

      if (!tx.isVirtual) {
        if (!projected.some(p => p.id === tx.id)) {
          projected.push(tx);
        }
      }
    });

    return projected.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [transactions, viewDate]);
}
