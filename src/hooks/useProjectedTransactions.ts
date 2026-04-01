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
      if (tx.isVirtual) return false;

      // ✅ Pagamento de Fatura (Baixa): usar invoiceMonthYear como referência
      if (tx.categoryId === 'card-payment' && tx.invoiceMonthYear) {
        const [year, month] = tx.invoiceMonthYear.split('-').map(Number);
        return month - 1 === targetMonth && year === targetYear;
      }

      // ✅ Demais transações (incluindo compras de cartão): usar date normalmente (Extrato Real)
      const txDate = parseLocalDate(tx.date.slice(0, 10));
      return isSameMonth(txDate, viewDate);
    });

    // 2. Processamos todas as transações para buscar recorrentes que precisam ser projetadas
    transactions.forEach(tx => {
      const isRecurring = tx.isRecurring || tx.transactionType === 'recurring';
      const txDate = parseLocalDate(tx.date.slice(0, 10));

      if (isRecurring) {
        // Se a transação original começou antes ou no mês alvo
        if (isBefore(txDate, startOfMonth(viewDate)) || isSameMonth(txDate, viewDate)) {

          // Cálculo da data segura no mês alvo
          const originalDay = txDate.getDate();
          const daysInTarget = getDaysInMonth(new Date(targetYear, targetMonth));
          const safeDay = Math.min(originalDay, daysInTarget);
          const virtualDate = new Date(targetYear, targetMonth, safeDay);

          // Deduplicação: Não projetamos se já houver uma transação REAL neste mês 
          // que seja filha desta recorrente
          const hasRealEquivalent = realTransactions.some(real =>
            real.originalId === tx.id ||
            real.id === tx.id
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

      // 3. Projeção de Parcelamentos (Installments)
      if (!isRecurring && tx.installmentGroupId && tx.installmentNumber && tx.installmentTotal && tx.installmentNumber < tx.installmentTotal) {
        if (isBefore(txDate, startOfMonth(viewDate))) {
          // Deduplicar: só a parcela real mais recente (antes do mês alvo) projeta
          const hasMoreRecentInPast = transactions.some(other =>
            !other.isVirtual &&
            other.installmentGroupId === tx.installmentGroupId &&
            parseLocalDate(other.date.slice(0, 10)).getTime() > txDate.getTime() &&
            isBefore(parseLocalDate(other.date.slice(0, 10)), startOfMonth(viewDate))
          );

          if (!hasMoreRecentInPast) {
            const hasGroupInTargetMonth = realTransactions.some(real => real.installmentGroupId === tx.installmentGroupId);
            const hasRealEquivalent = realTransactions.some(real => real.originalId === tx.id || real.id === tx.id);

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

      // Sempre incluímos a própria transação se ela for do mês alvo e REAL
      const isInTargetMonth = (() => {
        const matchesDate = isSameMonth(txDate, viewDate) && targetYear === txDate.getFullYear();
        
        // Se tem invoiceMonthYear, verificamos se ele também bate com o mês alvo (para Cartão de Crédito)
        if (tx.cardId && tx.invoiceMonthYear) {
          const [y, m] = tx.invoiceMonthYear.split('-').map(Number);
          const matchesInvoice = (m - 1 === targetMonth && y === targetYear);
          return matchesDate || matchesInvoice;
        }
        
        return matchesDate;
      })();

      if (!tx.isVirtual && isInTargetMonth) {
        // 🛡️ REVISÃO DE REGRA: Exibir todos os lançamentos reais do mês no extrato,
        // independentemente de serem recorrentes/parcelados ou estarem pagos/pendentes.
        if (!projected.some(p => p.id === tx.id)) {
          projected.push(tx);
        }
      }
    });

    return projected.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [transactions, viewDate]);
}
