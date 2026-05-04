import { describe, expect, it } from 'vitest';
import { getCardUsedLimitFromTransactions } from '@/utils/cardLimit';

describe('card limit calculation', () => {
  it('fatura aberta consome limite', () => {
    expect(getCardUsedLimitFromTransactions('card-1', [
      {
        cardId: 'card-1',
        amount: 575.08,
        type: 'expense',
        invoiceMonthYear: '2026-05',
        date: '2026-05-12',
      },
    ])).toBeCloseTo(575.08, 2);
  });

  it('fatura paga libera o limite das compras daquela competencia', () => {
    expect(getCardUsedLimitFromTransactions('card-1', [
      {
        cardId: 'card-1',
        amount: 575.08,
        type: 'expense',
        invoiceMonthYear: '2026-05',
        date: '2026-05-12',
      },
      {
        cardId: 'card-1',
        amount: 480,
        type: 'expense',
        invoiceMonthYear: '2026-04',
        date: '2026-04-09',
      },
      {
        cardId: 'card-1',
        amount: 480,
        type: 'expense',
        isInvoicePayment: true,
        invoiceMonthYear: '2026-04',
        date: '2026-04-20',
      },
    ])).toBeCloseTo(575.08, 2);
  });

  it('parcelas futuras continuam consumindo limite', () => {
    expect(getCardUsedLimitFromTransactions('card-1', [
      {
        cardId: 'card-1',
        amount: 210,
        type: 'expense',
        invoiceMonthYear: '2026-06',
        date: '2026-06-03',
      },
      {
        cardId: 'card-1',
        amount: 180,
        type: 'expense',
        invoiceMonthYear: '2026-07',
        date: '2026-07-03',
      },
    ])).toBe(390);
  });

  it('estorno ou abatimento reduz o limite usado', () => {
    expect(getCardUsedLimitFromTransactions('card-1', [
      {
        cardId: 'card-1',
        amount: 500,
        type: 'expense',
        invoiceMonthYear: '2026-05',
        date: '2026-05-02',
      },
      {
        cardId: 'card-1',
        amount: 120,
        type: 'income',
        isInvoicePayment: true,
        invoiceMonthYear: '2026-05',
        date: '2026-05-15',
      },
    ])).toBe(380);
  });

  it('pagamento de fatura nao consome de novo e libera o que ja estava reservado', () => {
    expect(getCardUsedLimitFromTransactions('card-1', [
      {
        cardId: 'card-1',
        amount: 500,
        type: 'expense',
        invoiceMonthYear: '2026-05',
        date: '2026-05-02',
      },
      {
        cardId: 'card-1',
        amount: 500,
        type: 'expense',
        isInvoicePayment: true,
        invoiceMonthYear: '2026-05',
        date: '2026-05-20',
      },
    ])).toBe(0);
  });

  it('pagamento de fatura isolado nao consome limite por si so', () => {
    expect(getCardUsedLimitFromTransactions('card-1', [
      {
        cardId: 'card-1',
        amount: 500,
        type: 'expense',
        isInvoicePayment: true,
        invoiceMonthYear: '2026-05',
        date: '2026-05-20',
      },
    ])).toBe(0);
  });

  it('pagamento isolado e compras futuras da mesma competencia se compensam', () => {
    expect(getCardUsedLimitFromTransactions('card-1', [
      {
        cardId: 'card-1',
        amount: 500,
        type: 'expense',
        isInvoicePayment: true,
        invoiceMonthYear: '2026-05',
        date: '2026-05-20',
      },
      {
        cardId: 'card-1',
        amount: 500,
        type: 'expense',
        invoiceMonthYear: '2026-05',
        date: '2026-05-12',
      },
    ])).toBe(0);
  });
});
