import { describe, it, expect } from 'vitest';
import { Transaction } from '../../types/finance';

// Extrato da lógica de deduplicação conforme Regra Crítica do memorias.md
function isDeduplicated(tx: Partial<Transaction>, realTransactions: Partial<Transaction>[]) {
  return realTransactions.some(real =>
    real.originalId === tx.id || real.id === tx.id
  );
}

describe('Lógica Core - Deduplicação de Projeções (useProjectedTransactions)', () => {
  describe('Regra Crítica: Vínculo Real x Virtual', () => {
    it('deve deduplicar quando a transação real.originalId for igual ao virtual.id', () => {
      const virtualTx: Partial<Transaction> = { id: 'tx-recorrente-virtual-123' };
      const realTx: Partial<Transaction> = { id: 'tx-real-999', originalId: 'tx-recorrente-virtual-123' };
      
      expect(isDeduplicated(virtualTx, [realTx])).toBe(true);
    });

    it('deve deduplicar quando a transação real.id for igual ao virtual.id (edição manual que gerou real)', () => {
      const virtualTx: Partial<Transaction> = { id: 'tx-fixa-abc' };
      const realTx: Partial<Transaction> = { id: 'tx-fixa-abc' };
      
      expect(isDeduplicated(virtualTx, [realTx])).toBe(true);
    });

    it('NÃO deve deduplicar transações com mesma descrição e valor mas IDs não correlacionados (Prevenção de Bug Histórico)', () => {
      const virtualTx: Partial<Transaction> = { 
        id: 'tx-virtual-energia', 
        description: 'Conta de Luz', 
        amount: 150 
      };
      const realTx: Partial<Transaction> = { 
        id: 'tx-real-energia-diferente', 
        description: 'Conta de Luz', 
        amount: 150 
      };
      
      // Ambas têm a mesma descrição e valor, mas os IDs NÃO coincidem. Não pode deduplicar.
      expect(isDeduplicated(virtualTx, [realTx])).toBe(false);
    });
  });
});
