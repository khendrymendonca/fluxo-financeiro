import { addMonths, format } from 'date-fns';

/**
 * Calcula a qual fatura (yyyy-MM) uma transação de cartão pertence.
 * Se o dia da transação é DEPOIS do fechamento, vai para o mês seguinte.
 */
export function calcInvoiceMonthYear(
  transactionDate: string | undefined | null,
  closingDay: number | undefined | null
): string | null {
  if (!transactionDate || closingDay == null) return null;
  
  try {
    const date = new Date(transactionDate + 'T12:00:00'); // evita bug de fuso horário
    if (isNaN(date.getTime())) return null;

    const day = date.getDate();

    if (day > closingDay) {
      return format(addMonths(date, 1), 'yyyy-MM');
    } else {
      return format(date, 'yyyy-MM');
    }
  } catch (e) {
    return null;
  }
}
