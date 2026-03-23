import { format } from 'date-fns';
import { CreditCard } from '@/types/finance';

// Função pura 1: Descobre o dia de fechamento/vencimento baseado no histórico do cartão
export function getCardSettingsForDate(card: CreditCard, targetDate: Date) {
  if (!card.history || card.history.length === 0) {
    return { dueDay: card.dueDay, closingDay: card.closingDay };
  }
  
  const sortedHistory = [...card.history].sort(
    (a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
  );
  
  const match = sortedHistory.find(h => new Date(h.effectiveDate) <= targetDate);
  return match ? { dueDay: match.dueDay, closingDay: match.closingDay } : { dueDay: card.dueDay, closingDay: card.closingDay };
}

// Função pura 2: Calcula a qual fatura (Mês/Ano) esta transação pertence
export function calcInvoiceMonthYear(transactionDate: Date, card: CreditCard): string {
  const { closingDay, dueDay } = getCardSettingsForDate(card, transactionDate);
  const invoiceDate = new Date(transactionDate.getFullYear(), transactionDate.getMonth(), 1);
  
  // Se a compra foi feita DEPOIS do fechamento da fatura, ela cai no mês seguinte
  if (transactionDate.getDate() > closingDay) {
    invoiceDate.setMonth(invoiceDate.getMonth() + 1);
  }
  
  // Regra de negócio: Se o vencimento é antes do fechamento (ex: fecha dia 25, vence dia 5), empurra mais um mês
  if (dueDay <= closingDay) {
    invoiceDate.setMonth(invoiceDate.getMonth() + 1);
  }
  
  return format(invoiceDate, 'yyyy-MM');
}
