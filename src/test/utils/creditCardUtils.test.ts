import { describe, it, expect } from 'vitest';
import { calcInvoiceMonthYear } from '../../utils/creditCardUtils';
import { parseLocalDate } from '../../utils/dateUtils';

describe('creditCardUtils - calcInvoiceMonthYear', () => {
  describe('Regra de fechamento do cartão', () => {
    it('deve entrar na fatura do mês atual (2026-04) se a compra for dia 10 e fechamento dia 15', () => {
      // Dia 10/04/2026 -> antes do dia 15/04 -> fatura vence no mesmo mês ou no próximo dependendo da regra, 
      // mas pelo utils, deve dar a "fatura de abril" (ou maio, depende de como o app conta).
      // A instrução diz: calcInvoiceMonthYear(new Date('2026-04-10'), { closingDay: 15 }) → '2026-04'
      const invoice = calcInvoiceMonthYear(parseLocalDate('2026-04-10'), { closingDay: 15 } as any);
      expect(invoice).toBe('2026-04');
    });

    it('deve entrar na fatura do próximo mês (2026-05) se a compra for dia 20 e fechamento dia 15', () => {
      const invoice = calcInvoiceMonthYear(parseLocalDate('2026-04-20'), { closingDay: 15 } as any);
      expect(invoice).toBe('2026-05');
    });

    it('deve entrar na fatura de 2026-04 se a compra for dia 1 e fechamento dia 3', () => {
      const invoice = calcInvoiceMonthYear(parseLocalDate('2026-04-01'), { closingDay: 3 } as any);
      expect(invoice).toBe('2026-04');
    });

    it('deve entrar na fatura de 2026-05 se a compra for dia 5 e fechamento dia 3', () => {
      const invoice = calcInvoiceMonthYear(parseLocalDate('2026-04-05'), { closingDay: 3 } as any);
      expect(invoice).toBe('2026-05');
    });

    it('deve virar o ano corretamente (2027-01) se a compra for em 20/12/2026 e fechamento dia 15', () => {
      const invoice = calcInvoiceMonthYear(parseLocalDate('2026-12-20'), { closingDay: 15 } as any);
      expect(invoice).toBe('2027-01');
    });
  });
});
