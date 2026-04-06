import { useMemo } from 'react';
import { format } from 'date-fns';
import { calcInvoiceMonthYear } from '@/utils/creditCardUtils';
import { CreditCard, Transaction } from '@/types/finance';

export function useCreditCardMetrics(
  cardId: string,
  viewDate: Date,
  transactions: Transaction[],
  cards: CreditCard[]
) {
  return useMemo(() => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return { usedLimit: 0, availableLimit: 0, currentInvoice: 0 };

    const cardTransactions = transactions.filter(t => t.cardId === cardId);
    const viewMonthYear = format(viewDate, 'yyyy-MM');

    let usedLimit = 0;
    let currentInvoiceAmount = 0;
    let paidCurrentInvoiceAmount = 0;

    const paidInvoices = new Set(
      cardTransactions
        .filter(t => t.isInvoicePayment && t.type === 'expense' && !!t.invoiceMonthYear)
        .map(t => t.invoiceMonthYear as string)
    );

    cardTransactions.forEach(t => {
      // ✅ Só exclui pagamentos de fatura se forem DESPESAS (saída de dinheiro).
      // Estornos e abatimentos (RECEITA) devem ser mantidos para reduzir o total.
      if (t.isVirtual || (t.isInvoicePayment && t.type === 'expense')) return;

      const txDate = new Date(t.date);
      const isFuture = txDate > new Date();

      const competence = t.invoiceMonthYear || calcInvoiceMonthYear(txDate, card);

      if (competence === viewMonthYear) {
        currentInvoiceAmount += (t.type === 'income' ? -t.amount : t.amount);
      }

      const isInstallment = t.installmentTotal && t.installmentTotal > 1;
      if (t.isRecurring && isFuture && !isInstallment) return;

      if (!paidInvoices.has(competence)) {
        usedLimit += (t.type === 'income' ? -t.amount : t.amount);
      }
    });

    cardTransactions.forEach(t => {
      // ✅ Só somamos pagamentos reais da fatura (saída de caixa)
      if (t.isInvoicePayment && t.type === 'expense' && t.invoiceMonthYear === viewMonthYear) {
        paidCurrentInvoiceAmount += t.amount;
      }
    });

    const finalCurrentInvoice = Math.max(0, currentInvoiceAmount - paidCurrentInvoiceAmount);
    const availableLimit = Math.max(0, Number(card.limit || 0) - usedLimit);

    return {
      usedLimit,
      availableLimit,
      currentInvoice: finalCurrentInvoice,
    };
  }, [cardId, viewDate, transactions, cards]);
}


