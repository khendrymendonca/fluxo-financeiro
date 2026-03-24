import { addMonths, format } from 'date-fns';

/**
 * Calcula a qual fatura (yyyy-MM) uma transação de cartão pertence.
 * Se o dia da transação é DEPOIS do fechamento, vai para o mês seguinte.
 */
export function calcInvoiceMonthYear(
  transactionDate: string,
  closingDay: number
): string {
  const date = new Date(transactionDate + 'T12:00:00'); // evita bug de fuso horário
  const day = date.getDate();

  if (day > closingDay) {
    return format(addMonths(date, 1), 'yyyy-MM');
  } else {
    return format(date, 'yyyy-MM');
  }
}
