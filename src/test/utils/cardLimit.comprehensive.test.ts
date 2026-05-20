import { describe, it, expect } from 'vitest';
import { getCardUsedLimitFromTransactions } from '@/utils/cardLimit';

describe('Comprehensive Credit Card Limit Tests', () => {
  const cardId = 'card-1';

  it('counts a purchase made today for a future fatura', () => {
    const transactions = [
      {
        id: 'tx-1',
        amount: 13.90,
        cardId: cardId,
        date: '2026-05-18',
        invoiceMonthYear: '2026-07',
        isInvoicePayment: false,
        isPaid: false,
        type: 'expense' as const,
        deleted_at: null,
      }
    ];

    const used = getCardUsedLimitFromTransactions(cardId, transactions);
    expect(used).toBe(13.90);
  });

  it('counts an installment made in the past for a future fatura', () => {
    const transactions = [
      {
        id: 'tx-1',
        amount: 50.00,
        cardId: cardId,
        date: '2026-01-10',
        invoiceMonthYear: '2026-07', // 7th installment
        isInvoicePayment: false,
        isPaid: false,
        type: 'expense' as const,
        deleted_at: null,
      }
    ];

    const used = getCardUsedLimitFromTransactions(cardId, transactions);
    expect(used).toBe(50.00);
  });

  it('reduces limit impact when a partial payment is made', () => {
    const transactions = [
      {
        id: 'tx-1',
        amount: 100.00,
        cardId: cardId,
        invoiceMonthYear: '2026-07',
        isInvoicePayment: false,
        isPaid: false,
        type: 'expense' as const,
        deleted_at: null,
      },
      {
        id: 'pay-1',
        amount: 40.00,
        cardId: cardId,
        invoiceMonthYear: '2026-07',
        isInvoicePayment: true,
        type: 'expense' as const,
        deleted_at: null,
      }
    ];

    const used = getCardUsedLimitFromTransactions(cardId, transactions);
    // 100 - 40 = 60
    expect(used).toBe(60.00);
  });

  it('zeros limit impact when an estorno (income) exists in the same unsettled month', () => {
    const transactions = [
      {
        id: 'tx-1',
        amount: 100.00,
        cardId: cardId,
        invoiceMonthYear: '2026-07',
        isInvoicePayment: false,
        isPaid: false,
        type: 'expense' as const,
        deleted_at: null,
      },
      {
        id: 'estorno-1',
        amount: 100.00,
        cardId: cardId,
        invoiceMonthYear: '2026-07',
        isInvoicePayment: false,
        isPaid: false,
        type: 'income' as const,
        deleted_at: null,
      }
    ];

    const used = getCardUsedLimitFromTransactions(cardId, transactions);
    expect(used).toBe(0);
  });

  it('properly handles multiple months with some settled and some not', () => {
    const transactions = [
      // May (Settled)
      { id: 't1', amount: 100, cardId, invoiceMonthYear: '2026-05', isPaid: true, type: 'expense' as const, deleted_at: null },
      { id: 'p1', amount: 100, cardId, invoiceMonthYear: '2026-05', isInvoicePayment: true, type: 'expense' as const, deleted_at: null },
      
      // June (Unsettled - Partial)
      { id: 't2', amount: 100, cardId, invoiceMonthYear: '2026-06', isPaid: false, type: 'expense' as const, deleted_at: null },
      { id: 'p2', amount: 30, cardId, invoiceMonthYear: '2026-06', isInvoicePayment: true, type: 'expense' as const, deleted_at: null },

      // July (Unsettled - Open)
      { id: 't3', amount: 13.90, cardId, invoiceMonthYear: '2026-07', isPaid: false, type: 'expense' as const, deleted_at: null },
    ];

    const used = getCardUsedLimitFromTransactions(cardId, transactions);
    // May: 0
    // June: 100 - 30 = 70
    // July: 13.90
    // Total: 83.90
    expect(used).toBe(83.90);
  });

  it('ignores deleted transactions', () => {
    const transactions = [
      {
        id: 'tx-1',
        amount: 100.00,
        cardId: cardId,
        invoiceMonthYear: '2026-07',
        isInvoicePayment: false,
        isPaid: false,
        type: 'expense' as const,
        deleted_at: '2026-05-18',
      }
    ];

    const used = getCardUsedLimitFromTransactions(cardId, transactions);
    expect(used).toBe(0);
  });
});
