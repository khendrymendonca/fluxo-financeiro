import { describe, it, expect } from 'vitest';
import { parseLocalDate, todayLocalString } from '../../utils/dateUtils';

describe('dateUtils', () => {
  describe('parseLocalDate', () => {
    it('deve parsear 2026-04-08 sem erro de timezone (retornando dia 8 local)', () => {
      const date = parseLocalDate('2026-04-08');
      expect(date.getDate()).toBe(8);
      expect(date.getMonth()).toBe(3); // Abril é 3
      expect(date.getFullYear()).toBe(2026);
    });

    it('deve parsear 2026-01-01 como dia 1 de Janeiro local', () => {
      const date = parseLocalDate('2026-01-01');
      expect(date.getDate()).toBe(1);
      expect(date.getMonth()).toBe(0);
      expect(date.getFullYear()).toBe(2026);
    });

    it('demonstra a diferença entre new Date() e parseLocalDate() em strings ISO', () => {
      const stringDate = '2026-04-08';
      const parsed = parseLocalDate(stringDate);
      
      // new Date('YYYY-MM-DD') é parseado como UTC, o que no Brasil (GMT-3) vira dia 7 às 21h.
      // O teste não precisa falhar em new Date, mas garantimos que parsed.getDate() é 8.
      expect(parsed.getDate()).toBe(8);
    });
  });

  describe('todayLocalString', () => {
    it('deve retornar a data de hoje no formato YYYY-MM-DD', () => {
      const result = todayLocalString();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
