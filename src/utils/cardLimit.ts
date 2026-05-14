import { Transaction } from '@/types/finance';

type CardLimitTransaction = Pick<
  Transaction,
  | 'amount'
  | 'cardId'
  | 'date'
  | 'deleted_at'
  | 'invoiceMonthYear'
  | 'isInvoicePayment'
  | 'isPaid'
  | 'transactionType'
  | 'type'
> & {
  description?: string;
};

function isExpenseInvoicePayment(transaction: CardLimitTransaction): boolean {
  return Boolean(
    transaction.cardId &&
    !transaction.deleted_at &&
    transaction.isInvoicePayment &&
    transaction.type === 'expense'
  );
}

function getCardInvoiceMonthKey(transaction: CardLimitTransaction): string | null {
  if (!transaction.cardId || transaction.deleted_at) return null;
  if (transaction.invoiceMonthYear) return transaction.invoiceMonthYear;
  if (transaction.date) return transaction.date.slice(0, 7);
  return null;
}

function isRenegotiatedInvoiceObligation(transaction: CardLimitTransaction): boolean {
  const description = String(transaction.description || '').toLowerCase();
  return description.startsWith('saldo restante da fatura') || description.startsWith('parcela fatura');
}

export function getCardLimitImpact(
  transaction: CardLimitTransaction,
  settledInvoiceMonths: ReadonlySet<string> = new Set()
): number {
  if (!transaction.cardId || transaction.deleted_at) return 0;

  if (transaction.isInvoicePayment && transaction.type === 'expense') {
    return 0;
  }

  if (isRenegotiatedInvoiceObligation(transaction)) {
    return 0;
  }

  if (transaction.isPaid && transaction.type === 'expense') {
    return 0;
  }

  const invoiceMonthKey = getCardInvoiceMonthKey(transaction);
  if (invoiceMonthKey && settledInvoiceMonths.has(invoiceMonthKey)) {
    return 0;
  }

  if (transaction.type === 'income') {
    return -Number(transaction.amount || 0);
  }

  return Number(transaction.amount || 0);
}

export function getCardUsedLimitFromTransactions(
  cardId: string,
  transactions: CardLimitTransaction[]
): number {
  const cardTransactions = transactions.filter((transaction) => transaction.cardId === cardId && !transaction.deleted_at);
  const months = Array.from(new Set(
    cardTransactions
      .map(getCardInvoiceMonthKey)
      .filter((monthKey): monthKey is string => Boolean(monthKey))
  ));
  const settledInvoiceMonths = new Set(
    months.filter((monthKey) => {
      const invoiceTotal = cardTransactions
        .filter((transaction) =>
          !transaction.isInvoicePayment &&
          transaction.type === 'expense' &&
          getCardInvoiceMonthKey(transaction) === monthKey
        )
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

      const paidTotal = cardTransactions
        .filter((transaction) => isExpenseInvoicePayment(transaction) && getCardInvoiceMonthKey(transaction) === monthKey)
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

      return invoiceTotal > 0 && paidTotal >= invoiceTotal;
    })
  );

  const grossUsed = cardTransactions.reduce((acc, transaction) => {
    if (isExpenseInvoicePayment(transaction)) {
      return acc;
    }

    return acc + getCardLimitImpact(transaction, settledInvoiceMonths);
  }, 0);

  const partialPaymentOffset = cardTransactions
    .filter((transaction) => {
      const monthKey = getCardInvoiceMonthKey(transaction);
      return isExpenseInvoicePayment(transaction) && monthKey && !settledInvoiceMonths.has(monthKey);
    })
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

  return Math.max(0, grossUsed - partialPaymentOffset);
}
