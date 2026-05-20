import { describe, it, expect } from 'vitest';
import { getCardUsedLimitFromTransactions } from '@/utils/cardLimit';

describe('Reproduction: Credit Card Limit Bug', () => {
  it('should consume limit for an open invoice with R$ 13,90 purchase', () => {
    const cardId = 'itau-7409';
    const transactions = [
      {
        id: 'purchase-1',
        amount: 13.90,
        cardId: cardId,
        date: '2026-05-18', // Purchase today
        invoiceMonthYear: '2026-07', // Falls into July fatura
        isInvoicePayment: false,
        isPaid: false,
        type: 'expense' as const,
        deleted_at: null,
      }
    ];

    const usedLimit = getCardUsedLimitFromTransactions(cardId, transactions);
    
    // Total lançado da fatura: 13,90
    // Valor pago: 0,00
    // Esperado: usado = 13,90
    expect(usedLimit).toBe(13.90);
  });

  it('should consume limit for installments', () => {
    const cardId = 'itau-7409';
    const transactions = [
      {
        id: 'installment-1',
        amount: 50.00,
        cardId: cardId,
        date: '2026-05-10',
        invoiceMonthYear: '2026-05',
        installmentGroupId: 'group-1',
        isPaid: true,
        type: 'expense' as const,
        deleted_at: null,
      },
      {
        id: 'installment-2',
        amount: 50.00,
        cardId: cardId,
        date: '2026-05-10',
        invoiceMonthYear: '2026-06',
        installmentGroupId: 'group-1',
        isPaid: false,
        type: 'expense' as const,
        deleted_at: null,
      }
    ];

    const usedLimit = getCardUsedLimitFromTransactions(cardId, transactions);
    
    // installment-1 is paid, month 05 is settled?
    // Wait, let's see. If I have installment-1 and its payment.
    const txsWithPayment = [
      ...transactions,
      {
        id: 'payment-05',
        amount: 50.00,
        cardId: cardId,
        invoiceMonthYear: '2026-05',
        isInvoicePayment: true,
        type: 'expense' as const,
        deleted_at: null,
      }
    ];

    const usedLimit2 = getCardUsedLimitFromTransactions(cardId, txsWithPayment);
    // Month 05 is settled. Month 06 is NOT.
    // Impact should be 50.00 (from installment-2).
    expect(usedLimit2).toBe(50.00);
  });

  it('should ignore old paid credits (income) when calculating current used limit', () => {
    const cardId = 'itau-7409';
    const transactions = [
      // Old settled month
      {
        id: 'purchase-old',
        amount: 100.00,
        cardId: cardId,
        invoiceMonthYear: '2025-12',
        isPaid: true,
        type: 'expense' as const,
        deleted_at: null,
      },
      {
        id: 'payment-old',
        amount: 100.00,
        cardId: cardId,
        invoiceMonthYear: '2025-12',
        isInvoicePayment: true,
        isPaid: true,
        type: 'income' as const,
        deleted_at: null,
      },
      // Current open purchase
      {
        id: 'purchase-new',
        amount: 13.90,
        cardId: cardId,
        invoiceMonthYear: '2026-07',
        isPaid: false,
        type: 'expense' as const,
        deleted_at: null,
      }
    ];

    const usedLimit = getCardUsedLimitFromTransactions(cardId, transactions);
    
    // BUG ANTERIOR: resultaria em 0 (ou -86.10 clamped a 0)
    // porque o 'payment-old' (income) subtraía mesmo estando pago.
    // CORRETO: deve ser 13.90
    expect(usedLimit).toBe(13.90);
  });
});
