import { describe, it, expect } from 'vitest';
import { formatCurrency, formatCurrencyCompact } from '../../utils/formatters';

describe('formatters', () => {
  describe('formatCurrency', () => {
    it('deve formatar 0 corretamente', () => {
      expect(formatCurrency(0).replace(/\u00A0/g, ' ')).toBe('R$ 0,00');
    });

    it('deve formatar 1500.5 corretamente', () => {
      expect(formatCurrency(1500.5).replace(/\u00A0/g, ' ')).toBe('R$ 1.500,50');
    });

    it('deve formatar null como R$ 0,00', () => {
      expect(formatCurrency(null as any)).toBe('R$ 0,00');
    });

    it('deve formatar undefined como R$ 0,00', () => {
      expect(formatCurrency(undefined as any)).toBe('R$ 0,00');
    });

    it('deve formatar NaN/string inválida como R$ 0,00', () => {
      expect(formatCurrency('abc' as any)).toBe('R$ 0,00');
    });
  });

  describe('formatCurrencyCompact', () => {
    it('deve formatar valores em milhões com sufixo compacto', () => {
      const result = formatCurrencyCompact(1500000);
      expect(result).toMatch(/R\$/);
      expect(result).toMatch(/1,5/);
      expect(result).toMatch(/mi/);
    });
  });
});
