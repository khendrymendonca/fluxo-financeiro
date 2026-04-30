import { Transaction } from '@/types/finance';

type CardLimitTransaction = Pick<
  Transaction,
  | 'amount'
  | 'cardId'
  | 'date'
  | 'deleted_at'
  | 'invoiceMonthYear'
  | 'isInvoicePayment'
  | 'type'
>;

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

export function getCardLimitImpact(
  transaction: CardLimitTransaction,
  settledInvoiceMonths: ReadonlySet<string> = new Set()
): number {
  if (!transaction.cardId || transaction.deleted_at) return 0;

  if (transaction.isInvoicePayment && transaction.type === 'expense') {
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
  const settledInvoiceMonths = new Set(
    cardTransactions
      .filter(isExpenseInvoicePayment)
      .map(getCardInvoiceMonthKey)
      .filter((monthKey): monthKey is string => Boolean(monthKey))
  );

  return cardTransactions.reduce((acc, transaction) => {
    if (isExpenseInvoicePayment(transaction)) {
      return acc;
    }

    return acc + getCardLimitImpact(transaction, settledInvoiceMonths);
  }, 0);
}
