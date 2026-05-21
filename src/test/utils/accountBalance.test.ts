import { describe, expect, it } from 'vitest';
import { calculateAccountBalance } from '@/utils/accountBalance';
import { Transaction } from '@/types/finance';

function makeTransaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    userId: overrides.userId ?? 'user-1',
    type: overrides.type ?? 'expense',
    transactionType: overrides.transactionType ?? 'punctual',
    description: overrides.description ?? 'Lancamento',
    amount: overrides.amount ?? 0,
    date: overrides.date ?? '2026-05-21',
    isPaid: overrides.isPaid ?? true,
    accountId: overrides.accountId,
    cardId: overrides.cardId,
    isTransfer: overrides.isTransfer ?? false,
    isInvoicePayment: overrides.isInvoicePayment ?? false,
    deleted_at: overrides.deleted_at ?? null,
  };
}

describe('accountBalance', () => {
  it('inclui transferencia de entrada no saldo da conta destino', () => {
    const balance = calculateAccountBalance([
      makeTransaction({
        id: 'transfer-in',
        type: 'income',
        amount: 350,
        accountId: 'account-duda',
        isTransfer: true,
      }),
    ], 'account-duda');

    expect(balance).toBe(350);
  });

  it('inclui transferencia de saida no saldo da conta origem', () => {
    const balance = calculateAccountBalance([
      makeTransaction({
        id: 'transfer-out',
        type: 'expense',
        amount: 125.4,
        accountId: 'account-a',
        isTransfer: true,
      }),
    ], 'account-a');

    expect(balance).toBe(-125.4);
  });

  it('mantem pagamento de fatura como saida do saldo', () => {
    const balance = calculateAccountBalance([
      makeTransaction({
        id: 'invoice-payment',
        type: 'expense',
        amount: 900,
        accountId: 'account-a',
        isInvoicePayment: true,
        isTransfer: true,
      }),
    ], 'account-a');

    expect(balance).toBe(-900);
  });

  it('ignora transacao pendente sem account_id pago', () => {
    const balance = calculateAccountBalance([
      makeTransaction({
        id: 'pending-expense',
        amount: 174.6,
        accountId: 'account-a',
        isPaid: false,
      }),
    ], 'account-a');

    expect(balance).toBe(0);
  });

  it('ignora soft delete no saldo da conta', () => {
    const balance = calculateAccountBalance([
      makeTransaction({
        id: 'deleted-expense',
        amount: 49.16,
        accountId: 'account-a',
        deleted_at: '2026-05-21T12:00:00.000Z',
      }),
    ], 'account-a');

    expect(balance).toBe(0);
  });

  it('reproduz o caso Duda com saldo final de 0,73', () => {
    const balance = calculateAccountBalance([
      makeTransaction({
        id: 'transfer-in',
        description: '[Entrada] Transferencia entre contas',
        type: 'income',
        amount: 350,
        accountId: 'account-duda',
        isTransfer: true,
      }),
      makeTransaction({
        id: 'abatimento',
        description: 'Ajuste de Abatimento - NuDuda',
        type: 'expense',
        amount: 300,
        accountId: 'account-duda',
      }),
      makeTransaction({
        id: 'ajuste-saldo',
        description: 'Ajuste de Saldo',
        type: 'expense',
        amount: 0.11,
        accountId: 'account-duda',
      }),
      makeTransaction({
        id: 'gas',
        description: 'Gas',
        type: 'expense',
        amount: 49.16,
        accountId: 'account-duda',
      }),
    ], 'account-duda');

    expect(balance).toBeCloseTo(0.73, 2);
  });

  it('recompõe a conta antiga e debita a nova quando a conta de pagamento muda', () => {
    const oldState = [
      makeTransaction({
        id: 'cemig-old',
        description: 'Cemig',
        type: 'expense',
        amount: 174.6,
        accountId: 'inter',
      }),
      makeTransaction({
        id: 'itau-base',
        description: 'Saldo inicial',
        type: 'income',
        amount: 312.05,
        accountId: 'itau',
      }),
    ];

    const newState = [
      makeTransaction({
        id: 'cemig-new',
        description: 'Cemig',
        type: 'expense',
        amount: 174.6,
        accountId: 'itau',
      }),
      makeTransaction({
        id: 'itau-base',
        description: 'Saldo inicial',
        type: 'income',
        amount: 312.05,
        accountId: 'itau',
      }),
    ];

    expect(calculateAccountBalance(oldState, 'inter')).toBeCloseTo(-174.6, 2);
    expect(calculateAccountBalance(newState, 'inter')).toBeCloseTo(0, 2);
    expect(calculateAccountBalance(newState, 'itau')).toBeCloseTo(137.45, 2);
  });
});
