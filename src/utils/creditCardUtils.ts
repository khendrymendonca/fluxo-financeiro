import { format, isAfter, isBefore, startOfDay, endOfDay, setDate, subMonths } from 'date-fns';
import { CreditCard } from '@/types/finance';

/**
 * Função 1: Descobre o dia de fechamento/vencimento baseado no histórico do cartão
 */
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

/**
 * Função 2: Calcula a qual fatura (Mês/Ano) esta transação pertence.
 * Integrada com regra brasileira de fechamento vs vencimento.
 */
export function calcInvoiceMonthYear(
  transactionDate: Date,
  settings: { closingDay: number, dueDay: number }
): string {
  const { closingDay } = settings;
  const invoiceDate = new Date(transactionDate.getFullYear(), transactionDate.getMonth(), 1);

  // Se a compra foi feita DEPOIS do fechamento da fatura, ela cai no mês seguinte
  if (transactionDate.getDate() > closingDay) {
    invoiceDate.setMonth(invoiceDate.getMonth() + 1);
  }

  return format(invoiceDate, 'yyyy-MM');
}

/**
 * Função 3: Retorna o status visual da fatura baseado nas datas de fechamento e vencimento.
 */
export function getInvoiceStatusDisplay(
  card: CreditCard,
  viewDate: Date,
  isPaid: boolean,
  amount: number = 0
) {
  if (!amount || Number(amount) <= 0) return null;
  if (isPaid) return { text: 'Paga', color: 'text-blue-500', icon: '🔵' };

  const { closingDay, dueDay } = getCardSettingsForDate(card, viewDate);
  if (!closingDay || !dueDay) return { text: 'Aberta', color: 'text-primary', icon: '🔓' };

  const today = startOfDay(new Date());

  // Constrói a data de vencimento exata para o mês de referência
  let dueDate = setDate(viewDate, Number(dueDay));

  // Constrói a data de fechamento exata. 
  // Se o dia de fechamento for maior que o vencimento (ex: fecha dia 25, vence dia 5),
  // significa que o fechamento ocorreu no mês anterior em relação ao vencimento.
  let closingDate = setDate(viewDate, Number(closingDay));
  if (Number(closingDay) > Number(dueDay)) {
    closingDate = subMonths(closingDate, 1);
  }

  // Se hoje for após o fim do dia de vencimento -> Vencida
  if (isAfter(today, endOfDay(dueDate))) {
    return { text: 'Vencida', color: 'text-red-500', icon: '🔴' };
  }

  // Se hoje for após o fim do dia de fechamento -> Fechada
  if (isAfter(today, endOfDay(closingDate)) || today.getTime() === endOfDay(closingDate).getTime()) {
    return { text: 'Fechada', color: 'text-yellow-500', icon: '🟡' };
  }

  return { text: 'Aberta', color: 'text-green-500', icon: '🟢' };
}

