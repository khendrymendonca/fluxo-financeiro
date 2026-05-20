import { describe, expect, it } from 'vitest';
import {
  getTransactionCategoryBucket,
  getTransactionCategoryLabel,
  isRenegotiationTransaction,
  LOGICAL_AGREEMENT_CATEGORY_KEY,
  LOGICAL_MISSING_CATEGORY_KEY_PREFIX,
  LOGICAL_RENEGOTIATION_CATEGORY_KEY,
  LOGICAL_UNCATEGORIZED_CATEGORY_KEY,
} from '@/utils/transactionCategory';

describe('transactionCategory', () => {
  it('transforma transação com debtId em Acordo', () => {
    expect(
      getTransactionCategoryBucket(
        {
          debtId: 'debt-1',
          categoryId: undefined,
          description: 'Parcela do acordo',
          transactionType: 'installment',
          cardId: undefined,
          invoiceMonthYear: undefined,
          isInvoicePayment: false,
        },
        []
      )
    ).toEqual({
      key: LOGICAL_AGREEMENT_CATEGORY_KEY,
      label: 'Acordo',
    });
  });

  it('detecta descrição de Renegociação de Pendências como Renegociação', () => {
    expect(
      getTransactionCategoryLabel(
        {
          debtId: undefined,
          categoryId: undefined,
          description: 'Renegociação de Pendências (1/9)',
          transactionType: 'installment',
          cardId: 'card-1',
          invoiceMonthYear: '2026-06',
          isInvoicePayment: false,
        },
        []
      )
    ).toBe('Renegociação');
  });

  it('faz Renegociação vencer a categoria real genérica Não Identificados', () => {
    expect(
      getTransactionCategoryBucket(
        {
          debtId: undefined,
          categoryId: 'cat-uncategorized',
          description: 'Renegociação de Pendências (1/9)',
          transactionType: 'installment',
          cardId: 'card-1',
          invoiceMonthYear: '2026-06',
          isInvoicePayment: false,
        },
        [{ id: 'cat-uncategorized', name: 'Não Identificados' }]
      )
    ).toEqual({
      key: LOGICAL_RENEGOTIATION_CATEGORY_KEY,
      label: 'Renegociação',
    });
  });

  it('mantém categoria real específica quando não existe lógica sistêmica mais forte', () => {
    expect(
      getTransactionCategoryBucket(
        {
          debtId: undefined,
          categoryId: 'cat-home',
          description: 'Aluguel',
          transactionType: 'punctual',
          cardId: undefined,
          invoiceMonthYear: undefined,
          isInvoicePayment: false,
        },
        [{ id: 'cat-home', name: 'Moradia' }]
      )
    ).toEqual({
      key: 'category:cat-home',
      label: 'Moradia',
      category: { id: 'cat-home', name: 'Moradia' },
    });
  });

  it('mantém sem categoria e sem regra lógica em Não identificados', () => {
    expect(
      getTransactionCategoryBucket(
        {
          debtId: undefined,
          categoryId: undefined,
          description: 'Despesa solta',
          transactionType: 'punctual',
          cardId: undefined,
          invoiceMonthYear: undefined,
          isInvoicePayment: false,
        },
        [],
        'Não identificados'
      )
    ).toEqual({
      key: LOGICAL_UNCATEGORIZED_CATEGORY_KEY,
      label: 'Não identificados',
    });
  });

  it('separa category_id órfão como Categoria não encontrada', () => {
    expect(
      getTransactionCategoryBucket(
        {
          debtId: undefined,
          categoryId: 'cat-missing',
          description: 'Compra importada',
          transactionType: 'punctual',
          cardId: undefined,
          invoiceMonthYear: undefined,
          isInvoicePayment: false,
        },
        [],
        'Não identificados'
      )
    ).toEqual({
      key: `${LOGICAL_MISSING_CATEGORY_KEY_PREFIX}cat-missing`,
      label: 'Categoria não encontrada',
    });
  });

  it('faz Acordo vencer Renegociação quando debtId e descrição coexistem', () => {
    expect(
      getTransactionCategoryBucket(
        {
          debtId: 'debt-1',
          categoryId: 'cat-uncategorized',
          description: 'Renegociação de Pendências (1/9)',
          transactionType: 'installment',
          cardId: 'card-1',
          invoiceMonthYear: '2026-06',
          isInvoicePayment: false,
        },
        [{ id: 'cat-uncategorized', name: 'Não Identificados' }]
      )
    ).toEqual({
      key: LOGICAL_AGREEMENT_CATEGORY_KEY,
      label: 'Acordo',
    });
  });

  it('usa descrição como fallback controlado para itens sistêmicos de fatura renegociada', () => {
    expect(isRenegotiationTransaction({
      description: 'Parcela fatura Nubank 05/2026 (1/4)',
      transactionType: 'installment',
      cardId: 'card-1',
      invoiceMonthYear: '2026-06',
      isInvoicePayment: false,
    })).toBe(true);

    expect(isRenegotiationTransaction({
      description: 'Saldo restante da fatura 05/2026',
      transactionType: 'adjustment',
      cardId: 'card-1',
      invoiceMonthYear: '2026-06',
      isInvoicePayment: false,
    })).toBe(true);
  });
});
