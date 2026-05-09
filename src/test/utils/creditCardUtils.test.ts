import { describe, it, expect } from 'vitest';
import { calcInvoiceMonthYear, calcInvoiceMonthYearForCard } from '../../utils/creditCardUtils';
import { parseLocalDate } from '../../utils/dateUtils';

describe('creditCardUtils - calcInvoiceMonthYear', () => {
  it('compra em 28/04/2026 (fech. 28, venc. 5) entra em 2026-05', () => {
    const invoice = calcInvoiceMonthYear(parseLocalDate('2026-04-28'), { closingDay: 28, dueDay: 5 });
    expect(invoice).toBe('2026-05');
  });

  it('compra em 29/04/2026 (fech. 28, venc. 5) entra em 2026-06', () => {
    const invoice = calcInvoiceMonthYear(parseLocalDate('2026-04-29'), { closingDay: 28, dueDay: 5 });
    expect(invoice).toBe('2026-06');
  });

  it('compra em 05/05/2026 (fech. 28, venc. 5) entra em 2026-06', () => {
    const invoice = calcInvoiceMonthYear(parseLocalDate('2026-05-05'), { closingDay: 28, dueDay: 5 });
    expect(invoice).toBe('2026-06');
  });

  it('usa historico antigo antes de 2026-01-01 (fech. 29, venc. 5)', () => {
    const card = {
      id: 'card-1',
      userId: 'u1',
      name: 'Nu - Duda',
      bank: 'Nu',
      limit: 1000,
      color: '#000',
      closingDay: 28,
      dueDay: 5,
      isClosingDateFixed: true,
      isActive: true,
      history: [
        { dueDay: 5, closingDay: 29, effectiveDate: '2020-01-01' },
        { dueDay: 5, closingDay: 28, effectiveDate: '2026-01-01' },
      ],
    } as any;

    const invoice = calcInvoiceMonthYearForCard(parseLocalDate('2025-12-15'), card);
    expect(invoice).toBe('2026-01');
  });

  it('usa historico novo a partir de 2026-01-01 (fech. 28, venc. 5)', () => {
    const card = {
      id: 'card-1',
      userId: 'u1',
      name: 'Nu - Duda',
      bank: 'Nu',
      limit: 1000,
      color: '#000',
      closingDay: 28,
      dueDay: 5,
      isClosingDateFixed: true,
      isActive: true,
      history: [
        { dueDay: 5, closingDay: 29, effectiveDate: '2020-01-01' },
        { dueDay: 5, closingDay: 28, effectiveDate: '2026-01-01' },
      ],
    } as any;

    const invoice = calcInvoiceMonthYearForCard(parseLocalDate('2026-05-05'), card);
    expect(invoice).toBe('2026-06');
  });
});
