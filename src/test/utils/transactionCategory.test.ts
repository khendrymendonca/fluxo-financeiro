import { describe, expect, it } from 'vitest';
import { getTransactionCategoryLabel } from '@/utils/transactionCategory';

describe('getTransactionCategoryLabel', () => {
  it('retorna Acordo para transacao vinculada a debtId mesmo sem categoria persistida', () => {
    const label = getTransactionCategoryLabel(
      { debtId: 'debt-1', categoryId: undefined },
      []
    );

    expect(label).toBe('Acordo');
    expect(label).not.toBe('Sem Categoria');
  });

  it('mantem o nome real da categoria para transacoes normais', () => {
    expect(
      getTransactionCategoryLabel(
        { categoryId: 'cat-1' },
        [{ id: 'cat-1', name: 'Moradia' }]
      )
    ).toBe('Moradia');
  });
});
