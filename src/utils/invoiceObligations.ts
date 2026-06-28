import { format } from 'date-fns';
import { CreditCard, Transaction } from '@/types/finance';
import { getCardSettingsForDate } from '@/utils/creditCardUtils';

interface BuildInvoiceObligationsInput {
  creditCards: CreditCard[];
  transactions: Transaction[];
  viewDate: Date;
  settledTransactionIds?: ReadonlySet<string>;
}

export function buildCardInvoiceObligations({
  creditCards,
  transactions,
  viewDate,
  settledTransactionIds = new Set(),
}: BuildInvoiceObligationsInput): Transaction[] {
  const viewDateStr = format(viewDate, 'yyyy-MM');

  return creditCards
    .map((card) => {
      const invoiceId = `fat-virtual-${card.id}`;

      if (settledTransactionIds.has(invoiceId)) return null;

      const invoicePurchasesTotal = transactions
        .filter((transaction) =>
          transaction.cardId === card.id &&
          !transaction.isVirtual &&
          !transaction.isInvoicePayment &&
          !transaction.deleted_at &&
          transaction.invoiceMonthYear === viewDateStr
        )
        .reduce((sum, transaction) => sum + (transaction.type === 'expense' ? transaction.amount : -transaction.amount), 0);

      const invoicePaymentsTotal = transactions
        .filter((transaction) =>
          transaction.cardId === card.id &&
          !transaction.isVirtual &&
          transaction.isInvoicePayment &&
          !transaction.deleted_at &&
          transaction.invoiceMonthYear === viewDateStr
        )
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

      const remainingAmount = Number((invoicePurchasesTotal - invoicePaymentsTotal).toFixed(2));
      if (remainingAmount <= 0) return null;

      const { dueDay } = getCardSettingsForDate(card, viewDate);
      const cardDueDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), dueDay);

      return {
        id: invoiceId,
        description: `Fatura ${card.name}`,
        amount: remainingAmount,
        date: cardDueDate.toISOString(),
        type: 'expense',
        transactionType: 'recurring',
        categoryId: null,
        cardId: card.id,
        isPaid: false,
        isVirtual: true,
        isInvoicePayment: true,
        userId: '',
        invoiceMonthYear: viewDateStr,
      } as Transaction;
    })
    .filter((invoice): invoice is Transaction => Boolean(invoice));
}
