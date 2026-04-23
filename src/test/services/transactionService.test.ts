import { beforeEach, describe, expect, it, vi } from 'vitest';
import { anticipateCardPayment } from '@/services/transactionService';

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: supabaseMock,
}));

function chain(overrides: Record<string, unknown> = {}) {
  const builder: Record<string, any> = {};
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.single = vi.fn(async () => ({ data: null, error: null }));
  builder.insert = vi.fn(() => builder);
  builder.update = vi.fn(() => builder);
  Object.assign(builder, overrides);
  return builder;
}

describe('transactionService - anticipateCardPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('cria debito bancario e credito de abatimento na tabela transactions', async () => {
    const card = {
      id: 'card-1',
      name: 'Nubank',
      closing_day: 15,
      due_day: 20,
      closingDay: 15,
      dueDay: 20,
    };
    const cardQuery = chain({
      single: vi.fn(async () => ({ data: card, error: null })),
    });
    const debitInsert = chain({
      single: vi.fn(async () => ({ data: { id: 'debit-1' }, error: null })),
    });
    const creditInsert = chain({
      insert: vi.fn(async () => ({ error: null })),
    });

    supabaseMock.from
      .mockReturnValueOnce(cardQuery)
      .mockReturnValueOnce(debitInsert)
      .mockReturnValueOnce(creditInsert);

    const result = await anticipateCardPayment({
      cardId: 'card-1',
      accountId: 'account-1',
      amount: 100,
      date: '2026-04-10',
      userId: 'user-1',
    });

    expect(result).toEqual({ success: true });
    expect(supabaseMock.from).toHaveBeenNthCalledWith(1, 'credit_cards');
    expect(supabaseMock.from).toHaveBeenNthCalledWith(2, 'transactions');
    expect(supabaseMock.from).toHaveBeenNthCalledWith(3, 'transactions');
    expect(debitInsert.insert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-1',
      account_id: 'account-1',
      amount: 100,
      type: 'expense',
      is_paid: true,
      payment_date: '2026-04-10',
    }));
    expect(creditInsert.insert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-1',
      card_id: 'card-1',
      amount: 100,
      type: 'income',
      transaction_type: 'adjustment',
      is_invoice_payment: true,
      invoice_month_year: '2026-04',
    }));
  });

  it('falha sem criar transacoes quando o cartao nao existe', async () => {
    const cardQuery = chain({
      single: vi.fn(async () => ({ data: null, error: new Error('not found') })),
    });
    supabaseMock.from.mockReturnValueOnce(cardQuery);

    const result = await anticipateCardPayment({
      cardId: 'missing-card',
      accountId: 'account-1',
      amount: 100,
      date: '2026-04-10',
      userId: 'user-1',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('encontrado para processar o abatimento.');
    expect(supabaseMock.from).toHaveBeenCalledTimes(1);
  });

  it('nao cria credito nem rollback quando o debito bancario falha', async () => {
    const cardQuery = chain({
      single: vi.fn(async () => ({
        data: { id: 'card-1', name: 'Nubank', closingDay: 15, dueDay: 20 },
        error: null,
      })),
    });
    const debitInsert = chain({
      single: vi.fn(async () => ({ data: null, error: new Error('debit failed') })),
    });

    supabaseMock.from
      .mockReturnValueOnce(cardQuery)
      .mockReturnValueOnce(debitInsert);

    const result = await anticipateCardPayment({
      cardId: 'card-1',
      accountId: 'account-1',
      amount: 100,
      date: '2026-04-10',
      userId: 'user-1',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('debit failed');
    expect(supabaseMock.from).toHaveBeenCalledTimes(2);
  });

  it('faz rollback por soft delete do debito quando o credito da fatura falha', async () => {
    const cardQuery = chain({
      single: vi.fn(async () => ({
        data: { id: 'card-1', name: 'Nubank', closingDay: 15, dueDay: 20 },
        error: null,
      })),
    });
    const debitInsert = chain({
      single: vi.fn(async () => ({ data: { id: 'debit-1' }, error: null })),
    });
    const creditInsert = chain({
      insert: vi.fn(async () => ({ error: new Error('credit failed') })),
    });
    const rollbackUpdate = chain({
      eq: vi.fn(async () => ({ error: null })),
    });

    supabaseMock.from
      .mockReturnValueOnce(cardQuery)
      .mockReturnValueOnce(debitInsert)
      .mockReturnValueOnce(creditInsert)
      .mockReturnValueOnce(rollbackUpdate);

    const result = await anticipateCardPayment({
      cardId: 'card-1',
      accountId: 'account-1',
      amount: 100,
      date: '2026-04-10',
      userId: 'user-1',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('credit failed');
    expect(rollbackUpdate.update).toHaveBeenCalledWith({
      deleted_at: expect.any(String),
    });
    expect(rollbackUpdate.eq).toHaveBeenCalledWith('id', 'debit-1');
  });
});
