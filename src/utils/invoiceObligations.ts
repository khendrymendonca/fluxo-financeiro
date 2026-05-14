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

      const physicalPaymentExists = transactions.some((transaction) =>
        transaction.cardId === card.id &&
        transaction.isInvoicePayment &&
        transaction.invoiceMonthYear === viewDateStr &&
        !transaction.deleted_at
      );

      if (physicalPaymentExists) return null;

      const totalAmount = transactions
        .filter((transaction) =>
          transaction.cardId === card.id &&
          !transaction.isVirtual &&
          !transaction.isInvoicePayment &&
          !transaction.deleted_at &&
          transaction.invoiceMonthYear === viewDateStr
        )
        .reduce((sum, transaction) => sum + (transaction.type === 'expense' ? transaction.amount : -transaction.amount), 0);

      if (totalAmount <= 0) return null;

      const { dueDay } = getCardSettingsForDate(card, viewDate);
      const cardDueDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), dueDay);

      return {
        id: invoiceId,
        description: `Fatura ${card.name}`,
        amount: totalAmount,
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
