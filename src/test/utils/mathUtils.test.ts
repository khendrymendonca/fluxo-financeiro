import { describe, it, expect } from 'vitest';
import { safeAdd, safeSubtract, safeMultiply, safeDivide } from '../../utils/mathUtils';

describe('mathUtils', () => {
  describe('safeAdd', () => {
    it('deve somar 0.1 e 0.2 corretamente sem erros de ponto flutuante', () => {
      expect(safeAdd(0.1, 0.2)).toBe(0.3);
    });

    it('deve converter strings numéricas e somar corretamente', () => {
      expect(safeAdd('10', '5')).toBe(15);
    });
  });

  describe('safeSubtract', () => {
    it('deve subtrair inteiros corretamente', () => {
      expect(safeSubtract(10, 3)).toBe(7);
    });

    it('deve subtrair decimais sem erros', () => {
      expect(safeSubtract(0.3, 0.1)).toBe(0.2);
    });
  });

  describe('safeMultiply', () => {
    it('deve multiplicar sem imprecisão', () => {
      expect(safeMultiply(3, 0.1)).toBe(0.3);
    });
  });

  describe('safeDivide', () => {
    it('deve dividir e retornar com arredondamento padrão do utils se configurado ou exato', () => {
      expect(safeDivide(10, 3)).toBe(3.33); // safeDivide em mathUtils geralmente retorna 2 casas
    });

    it('deve retornar 0 ao tentar dividir por zero', () => {
      expect(safeDivide(10, 0)).toBe(0);
    });
  });
});
