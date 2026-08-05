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
  const invoiceObligations: Transaction[] = [];

  for (const card of creditCards) {
    // 1. Encontrar todos os meses/anos únicos em que há transações para este cartão
    const cardMonths = new Set<string>();
    // Sempre incluir o mês visualizado
    cardMonths.add(viewDateStr);

    for (const t of transactions) {
      if (t.cardId === card.id && t.invoiceMonthYear && !t.deleted_at) {
        cardMonths.add(t.invoiceMonthYear);
      }
    }

    // 2. Para cada mês encontrado, calcular a fatura se for menor ou igual ao mês atual (viewDateStr)
    for (const monthStr of cardMonths) {
      // Ignorar faturas futuras em relação ao mês de visualização
      if (monthStr > viewDateStr) continue;

      const invoiceId = `fat-virtual-${card.id}-${monthStr}`;

      if (settledTransactionIds.has(invoiceId)) continue;
      // Compatibilidade retroativa caso algum id antigo sem mês esteja no set
      if (settledTransactionIds.has(`fat-virtual-${card.id}`) && monthStr === viewDateStr) continue;

      const invoicePurchasesTotal = transactions
        .filter((transaction) =>
          transaction.cardId === card.id &&
          !transaction.isVirtual &&
          !transaction.isInvoicePayment &&
          !transaction.deleted_at &&
          transaction.invoiceMonthYear === monthStr
        )
        .reduce((sum, transaction) => sum + (transaction.type === 'expense' ? transaction.amount : -transaction.amount), 0);

      const invoicePaymentsTotal = transactions
        .filter((transaction) =>
          transaction.cardId === card.id &&
          !transaction.isVirtual &&
          transaction.isInvoicePayment &&
          !transaction.deleted_at &&
          transaction.invoiceMonthYear === monthStr
        )
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

      const remainingAmount = Number((invoicePurchasesTotal - invoicePaymentsTotal).toFixed(2));
      if (remainingAmount <= 0) continue;

      const [year, monthVal] = monthStr.split('-').map(Number);
      const invoiceDate = new Date(year, monthVal - 1, 1);
      const { dueDay } = getCardSettingsForDate(card, invoiceDate);
      const cardDueDate = new Date(year, monthVal - 1, dueDay);

      invoiceObligations.push({
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
        invoiceMonthYear: monthStr,
      } as Transaction);
    }
  }

  return invoiceObligations;
}
