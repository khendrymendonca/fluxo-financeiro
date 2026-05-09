import React, { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useBulkDeleteTransactions,
  useDeleteTransaction,
  useUpdateTransferTransaction,
  useToggleTransactionPaid,
  useUpdateTransaction,
} from '@/hooks/useTransactionMutations';

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: supabaseMock,
  logSafeError: vi.fn(),
}));

vi.mock('@/components/ui/use-toast', () => ({
  toast: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

const LEGACY_TRANSFER_PAIR_ERROR =
  'Transferência antiga sem vínculo seguro. Não foi possível identificar a contraparte sem risco.';
const LEGACY_TRANSFER_EDIT_ERROR =
  'Transferência antiga sem vínculo seguro. Não foi possível editar a contraparte sem risco.';

function chain(overrides: Record<string, unknown> = {}) {
  const builder: Record<string, any> = {};
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.gte = vi.fn(() => builder);
  builder.or = vi.fn(() => builder);
  builder.in = vi.fn(() => builder);
  builder.is = vi.fn(() => builder);
  builder.neq = vi.fn(() => builder);
  builder.order = vi.fn(() => builder);
  builder.single = vi.fn(async () => ({ data: null, error: null }));
  builder.insert = vi.fn(async () => ({ error: null }));
  builder.update = vi.fn(() => builder);
  Object.assign(builder, overrides);
  return builder;
}

function wrapper({ children }: PropsWithChildren) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

function createWrapper(queryClient: QueryClient) {
  return ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('useTransactionMutations - soft delete and payment status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('remove uma transacao real com soft delete no escopo this', async () => {
    const updateQuery = chain({
      eq: vi.fn(async () => ({ error: null })),
    });
    supabaseMock.from.mockReturnValueOnce(updateQuery);

    const { result } = renderHook(() => useDeleteTransaction(), { wrapper });

    await result.current.mutateAsync({
      transaction: { id: 'tx-1', date: '2026-04-10' },
      applyScope: 'this',
    });

    expect(updateQuery.update).toHaveBeenCalledWith({ deleted_at: expect.any(String) });
    expect(updateQuery.eq).toHaveBeenCalledWith('id', 'tx-1');
  });

  it('ao excluir pagamento de fatura reabre compras da competencia', async () => {
    const deletePayment = chain({
      eq: vi.fn(async () => ({ error: null })),
    });
    const reopenPurchases = chain({
      select: vi.fn(async () => ({ error: null })),
    });
    supabaseMock.from
      .mockReturnValueOnce(deletePayment)
      .mockReturnValueOnce(reopenPurchases);

    const { result } = renderHook(() => useDeleteTransaction(), { wrapper });

    await result.current.mutateAsync({
      transaction: {
        id: 'invoice-payment-1',
        type: 'expense',
        amount: 900,
        date: '2026-04-25',
        cardId: 'card-1',
        invoiceMonthYear: '2026-04',
        isInvoicePayment: true,
      },
      applyScope: 'this',
    });

    expect(deletePayment.update).toHaveBeenCalledWith({ deleted_at: expect.any(String) });
    expect(deletePayment.eq).toHaveBeenCalledWith('id', 'invoice-payment-1');
    expect(reopenPurchases.update).toHaveBeenCalledWith({
      is_paid: false,
      payment_date: null,
    });
    expect(reopenPurchases.eq).toHaveBeenCalledWith('card_id', 'card-1');
    expect(reopenPurchases.eq).toHaveBeenCalledWith('invoice_month_year', '2026-04');
    expect(reopenPurchases.eq).toHaveBeenCalledWith('is_invoice_payment', false);
    expect(reopenPurchases.eq).toHaveBeenCalledWith('type', 'expense');
    expect(reopenPurchases.is).toHaveBeenCalledWith('deleted_at', null);
  });

  it('ao excluir transferencia nova com transferGroupId remove apenas as pontas do grupo por id', async () => {
    const selectGroup = chain({
      is: vi.fn(async () => ({
        data: [{ id: 'tx-out' }, { id: 'tx-in' }],
        error: null,
      })),
    });
    const updatePair = chain({
      in: vi.fn(async () => ({ error: null })),
    });
    supabaseMock.from
      .mockReturnValueOnce(selectGroup)
      .mockReturnValueOnce(updatePair);

    const { result } = renderHook(() => useDeleteTransaction(), { wrapper });

    await result.current.mutateAsync({
      transaction: {
        id: 'tx-out',
        type: 'expense',
        amount: 500,
        date: '2026-04-10',
        accountId: 'checking',
        isTransfer: true,
        transferGroupId: 'group-1',
      },
      applyScope: 'this',
    });

    expect(selectGroup.select).toHaveBeenCalledWith('id');
    expect(selectGroup.eq).toHaveBeenCalledWith('transfer_group_id', 'group-1');
    expect(selectGroup.eq).toHaveBeenCalledWith('is_transfer', true);
    expect(selectGroup.is).toHaveBeenCalledWith('deleted_at', null);
    expect(updatePair.update).toHaveBeenCalledWith({ deleted_at: expect.any(String) });
    expect(updatePair.in).toHaveBeenCalledWith('id', ['tx-out', 'tx-in']);
    expect(selectGroup.or).not.toHaveBeenCalled();
    expect(updatePair.or).not.toHaveBeenCalled();
  });

  it('ao excluir uma entre duas transferencias iguais no mesmo dia limita o update ao transferGroupId selecionado', async () => {
    const selectGroup = chain({
      is: vi.fn(async () => ({
        data: [{ id: 'group-1-out' }, { id: 'group-1-in' }],
        error: null,
      })),
    });
    const updatePair = chain({
      in: vi.fn(async () => ({ error: null })),
    });
    supabaseMock.from
      .mockReturnValueOnce(selectGroup)
      .mockReturnValueOnce(updatePair);

    const { result } = renderHook(() => useDeleteTransaction(), { wrapper });

    await result.current.mutateAsync({
      transaction: {
        id: 'group-1-out',
        type: 'expense',
        amount: 500,
        date: '2026-04-10',
        isTransfer: true,
        transferGroupId: 'group-1',
      },
      applyScope: 'this',
    });

    expect(selectGroup.eq).toHaveBeenCalledWith('transfer_group_id', 'group-1');
    expect(updatePair.update).toHaveBeenCalledWith({ deleted_at: expect.any(String) });
    expect(updatePair.in).toHaveBeenCalledWith('id', ['group-1-out', 'group-1-in']);
    expect(updatePair.in).not.toHaveBeenCalledWith('id', expect.arrayContaining(['group-2-out', 'group-2-in']));
    expect(selectGroup.or).not.toHaveBeenCalled();
    expect(updatePair.or).not.toHaveBeenCalled();
  });

  it('ao excluir transferencia legada com uma contraparte usa fallback seguro por ids', async () => {
    const selectCounterpart = chain({
      neq: vi.fn(async () => ({
        data: [{ id: 'legacy-in' }],
        error: null,
      })),
    });
    const updatePair = chain({
      in: vi.fn(async () => ({ error: null })),
    });
    supabaseMock.from
      .mockReturnValueOnce(selectCounterpart)
      .mockReturnValueOnce(updatePair);

    const { result } = renderHook(() => useDeleteTransaction(), { wrapper });

    await result.current.mutateAsync({
      transaction: {
        id: 'legacy-out',
        type: 'expense',
        amount: 500,
        date: '2026-04-10',
        isTransfer: true,
      },
      applyScope: 'this',
    });

    expect(selectCounterpart.select).toHaveBeenCalledWith('id');
    expect(selectCounterpart.eq).toHaveBeenCalledWith('is_transfer', true);
    expect(selectCounterpart.eq).toHaveBeenCalledWith('type', 'income');
    expect(selectCounterpart.eq).toHaveBeenCalledWith('amount', 500);
    expect(selectCounterpart.eq).toHaveBeenCalledWith('date', '2026-04-10');
    expect(selectCounterpart.is).toHaveBeenCalledWith('deleted_at', null);
    expect(selectCounterpart.neq).toHaveBeenCalledWith('id', 'legacy-out');
    expect(updatePair.update).toHaveBeenCalledWith({ deleted_at: expect.any(String) });
    expect(updatePair.in).toHaveBeenCalledWith('id', ['legacy-out', 'legacy-in']);
    expect(selectCounterpart.or).not.toHaveBeenCalled();
    expect(updatePair.or).not.toHaveBeenCalled();
  });

  it('ao excluir transferencia legada ambigua rejeita e nao aplica soft delete por chute', async () => {
    const selectCounterpart = chain({
      neq: vi.fn(async () => ({
        data: [{ id: 'legacy-in-1' }, { id: 'legacy-in-2' }],
        error: null,
      })),
    });
    supabaseMock.from.mockReturnValueOnce(selectCounterpart);

    const { result } = renderHook(() => useDeleteTransaction(), { wrapper });

    await expect(result.current.mutateAsync({
      transaction: {
        id: 'legacy-out',
        type: 'expense',
        amount: 500,
        date: '2026-04-10',
        isTransfer: true,
      },
      applyScope: 'this',
    })).rejects.toThrow(LEGACY_TRANSFER_PAIR_ERROR);

    expect(supabaseMock.from).toHaveBeenCalledTimes(1);
    expect(selectCounterpart.update).not.toHaveBeenCalled();
    expect(selectCounterpart.or).not.toHaveBeenCalled();
  });

  it('ao excluir transferencia legada sem contraparte rejeita sem apagar contraparte por chute', async () => {
    const selectCounterpart = chain({
      neq: vi.fn(async () => ({
        data: [],
        error: null,
      })),
    });
    supabaseMock.from.mockReturnValueOnce(selectCounterpart);

    const { result } = renderHook(() => useDeleteTransaction(), { wrapper });

    await expect(result.current.mutateAsync({
      transaction: {
        id: 'legacy-out',
        type: 'expense',
        amount: 500,
        date: '2026-04-10',
        isTransfer: true,
      },
      applyScope: 'this',
    })).rejects.toThrow(LEGACY_TRANSFER_PAIR_ERROR);

    expect(supabaseMock.from).toHaveBeenCalledTimes(1);
    expect(selectCounterpart.update).not.toHaveBeenCalled();
    expect(selectCounterpart.or).not.toHaveBeenCalled();
  });

  it('remocao em massa preserva integridade de transferencia usando ids seguros', async () => {
    const selectGroup = chain({
      is: vi.fn(async () => ({
        data: [{ id: 'tx-out' }, { id: 'tx-in' }],
        error: null,
      })),
    });
    const updatePair = chain({
      in: vi.fn(async () => ({ error: null })),
    });
    supabaseMock.from
      .mockReturnValueOnce(selectGroup)
      .mockReturnValueOnce(updatePair);

    const { result } = renderHook(() => useBulkDeleteTransactions(), { wrapper });

    await result.current.mutateAsync({
      items: [{
        id: 'tx-out',
        type: 'transaction',
        transactionKind: 'expense',
        amount: 500,
        date: '2026-04-10',
        isTransfer: true,
        transferGroupId: 'group-1',
      }],
      installmentScope: 'this',
    });

    expect(selectGroup.eq).toHaveBeenCalledWith('transfer_group_id', 'group-1');
    expect(updatePair.update).toHaveBeenCalledWith({ deleted_at: expect.any(String) });
    expect(updatePair.in).toHaveBeenCalledWith('id', ['tx-out', 'tx-in']);
    expect(selectGroup.or).not.toHaveBeenCalled();
    expect(updatePair.or).not.toHaveBeenCalled();
  });

  it('corrige transferencia com transferGroupId atualizando saida e entrada como par', async () => {
    const selectGroup = chain({
      is: vi.fn(async () => ({
        data: [
          {
            id: 'tx-out',
            type: 'expense',
            amount: 500,
            date: '2026-04-10',
            account_id: 'acc-origin-1',
            description: '[Saída] Reserva',
            transfer_group_id: 'group-1',
            is_transfer: true,
          },
          {
            id: 'tx-in',
            type: 'income',
            amount: 500,
            date: '2026-04-10',
            account_id: 'acc-dest-1',
            description: '[Entrada] Reserva',
            transfer_group_id: 'group-1',
            is_transfer: true,
          },
        ],
        error: null,
      })),
    });
    const updateExpense = chain({
      select: vi.fn(async () => ({ data: [{ id: 'tx-out' }], error: null })),
    });
    const updateIncome = chain({
      select: vi.fn(async () => ({ data: [{ id: 'tx-in' }], error: null })),
    });
    supabaseMock.from
      .mockReturnValueOnce(selectGroup)
      .mockReturnValueOnce(updateExpense)
      .mockReturnValueOnce(updateIncome);

    const { result } = renderHook(() => useUpdateTransferTransaction(), { wrapper });

    await result.current.mutateAsync({
      transaction: {
        id: 'tx-out',
        type: 'expense',
        amount: 500,
        date: '2026-04-10',
        isTransfer: true,
        transferGroupId: 'group-1',
      },
      updates: {
        amount: 750,
        date: '2026-05-12',
        transferFrom: 'acc-origin-2',
        transferTo: 'acc-dest-2',
        transferToType: 'account',
        description: 'Reserva corrigida',
      },
    });

    expect(selectGroup.select).toHaveBeenCalledWith('id,type,amount,date,account_id,card_id,description,transfer_group_id,is_transfer,deleted_at');
    expect(selectGroup.eq).toHaveBeenCalledWith('transfer_group_id', 'group-1');
    expect(selectGroup.eq).toHaveBeenCalledWith('is_transfer', true);
    expect(selectGroup.is).toHaveBeenCalledWith('deleted_at', null);
    expect(updateExpense.update).toHaveBeenCalledWith(expect.objectContaining({
      amount: 750,
      date: '2026-05-12',
      payment_date: '2026-05-12',
      account_id: 'acc-origin-2',
      card_id: null,
      type: 'expense',
      is_transfer: true,
      transfer_group_id: 'group-1',
      description: '[Saída] Reserva corrigida',
    }));
    expect(updateIncome.update).toHaveBeenCalledWith(expect.objectContaining({
      amount: 750,
      date: '2026-05-12',
      payment_date: '2026-05-12',
      account_id: 'acc-dest-2',
      card_id: null,
      type: 'income',
      is_transfer: true,
      transfer_group_id: 'group-1',
      description: '[Entrada] Reserva corrigida',
    }));
    expect(updateExpense.eq).toHaveBeenCalledWith('id', 'tx-out');
    expect(updateIncome.eq).toHaveBeenCalledWith('id', 'tx-in');
    expect(selectGroup.or).not.toHaveBeenCalled();
    expect(updateExpense.or).not.toHaveBeenCalled();
    expect(updateIncome.or).not.toHaveBeenCalled();
  });

  it('aborta correcao de transferencia legada ambigua sem atualizar por chute', async () => {
    const selectCounterpart = chain({
      neq: vi.fn(async () => ({
        data: [{ id: 'legacy-in-1' }, { id: 'legacy-in-2' }],
        error: null,
      })),
    });
    supabaseMock.from.mockReturnValueOnce(selectCounterpart);

    const { result } = renderHook(() => useUpdateTransferTransaction(), { wrapper });

    await expect(result.current.mutateAsync({
      transaction: {
        id: 'legacy-out',
        type: 'expense',
        amount: 500,
        date: '2026-04-10',
        isTransfer: true,
      },
      updates: {
        amount: 750,
        date: '2026-05-12',
        transferFrom: 'acc-origin-2',
        transferTo: 'acc-dest-2',
      },
    })).rejects.toThrow(LEGACY_TRANSFER_EDIT_ERROR);

    expect(supabaseMock.from).toHaveBeenCalledTimes(1);
    expect(selectCounterpart.update).not.toHaveBeenCalled();
    expect(selectCounterpart.or).not.toHaveBeenCalled();
  });

  it('remove parcelas futuras por soft delete usando installment_group_id e date', async () => {
    const updateQuery = chain({
      gte: vi.fn(async () => ({ error: null })),
    });
    supabaseMock.from.mockReturnValueOnce(updateQuery);

    const { result } = renderHook(() => useDeleteTransaction(), { wrapper });

    await result.current.mutateAsync({
      transaction: {
        id: 'tx-2',
        installmentGroupId: 'group-1',
        date: '2026-04-10',
      },
      applyScope: 'future',
    });

    expect(updateQuery.update).toHaveBeenCalledWith({ deleted_at: expect.any(String) });
    expect(updateQuery.eq).toHaveBeenCalledWith('installment_group_id', 'group-1');
    expect(updateQuery.gte).toHaveBeenCalledWith('date', '2026-04-10');
  });

  it('remove recorrencia no escopo all por soft delete usando vinculo de id/original_id', async () => {
    const updateQuery = chain({
      or: vi.fn(async () => ({ error: null })),
    });
    supabaseMock.from.mockReturnValueOnce(updateQuery);

    const { result } = renderHook(() => useDeleteTransaction(), { wrapper });

    await result.current.mutateAsync({
      transaction: { id: 'mother-1', date: '2026-04-10' },
      applyScope: 'all',
    });

    expect(updateQuery.update).toHaveBeenCalledWith({ deleted_at: expect.any(String) });
    expect(updateQuery.or).toHaveBeenCalledWith('id.eq.mother-1,original_id.eq.mother-1');
  });

  it('cria sombra deletada ao remover apenas uma ocorrencia virtual', async () => {
    const mother = {
      id: 'mother-1',
      description: 'Internet',
      date: '2026-03-10',
      is_recurring: true,
    };
    const selectMother = chain({
      single: vi.fn(async () => ({ data: mother, error: null })),
    });
    const insertShadow = chain();

    supabaseMock.from
      .mockReturnValueOnce(selectMother)
      .mockReturnValueOnce(insertShadow);

    const { result } = renderHook(() => useDeleteTransaction(), { wrapper });

    await result.current.mutateAsync({
      transaction: {
        id: 'mother-1-virtual-2026-3',
        originalId: 'mother-1',
        isVirtual: true,
        date: '2026-04-10',
      },
      applyScope: 'this',
    });

    expect(selectMother.eq).toHaveBeenCalledWith('id', 'mother-1');
    expect(insertShadow.insert).toHaveBeenCalledWith(expect.objectContaining({
      id: undefined,
      original_id: 'mother-1',
      is_recurring: false,
      transaction_type: 'punctual',
      is_paid: false,
      payment_date: null,
      deleted_at: expect.any(String),
      created_at: undefined,
    }));
  });

  it('estorna filho materializado voltando o registro para pendente', async () => {
    const updateQuery = chain({
      select: vi.fn(async () => ({ error: null })),
    });
    supabaseMock.from.mockReturnValueOnce(updateQuery);

    const { result } = renderHook(() => useToggleTransactionPaid(), { wrapper });

    await result.current.mutateAsync({
      id: 'child-1',
      isPaid: false,
      isChild: true,
    });

    expect(updateQuery.update).toHaveBeenCalledWith({
      is_paid: false,
      payment_date: null,
      account_id: null,
      card_id: null,
      invoice_month_year: null,
    });
    expect(updateQuery.eq).toHaveBeenCalledWith('id', 'child-1');
  });

  it('marca transacao como paga preservando data e conta informadas', async () => {
    const updateQuery = chain({
      select: vi.fn(async () => ({ error: null })),
    });
    supabaseMock.from.mockReturnValueOnce(updateQuery);

    const { result } = renderHook(() => useToggleTransactionPaid(), { wrapper });

    await result.current.mutateAsync({
      id: 'tx-3',
      isPaid: true,
      date: '2026-04-21',
      accountId: 'account-1',
    });

    expect(updateQuery.update).toHaveBeenCalledWith({
      is_paid: true,
      payment_date: '2026-04-21',
      account_id: 'account-1',
    });
    expect(updateQuery.eq).toHaveBeenCalledWith('id', 'tx-3');
    expect(updateQuery.select).toHaveBeenCalled();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('rejeita marcar transacao como paga sem conta informada', async () => {
    const { result } = renderHook(() => useToggleTransactionPaid(), { wrapper });

    await expect(result.current.mutateAsync({
      id: 'tx-sem-fonte',
      isPaid: true,
      date: '2026-04-21',
    })).rejects.toThrow('Selecione uma conta para registrar o pagamento.');

    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it('estorna parcela de acordo limpando fonte de pagamento quando solicitado', async () => {
    const updateQuery = chain({
      select: vi.fn(async () => ({ error: null })),
    });
    supabaseMock.from.mockReturnValueOnce(updateQuery);

    const { result } = renderHook(() => useToggleTransactionPaid(), { wrapper });

    await result.current.mutateAsync({
      id: 'debt-installment-1',
      isPaid: false,
      clearSourceOnUnpay: true,
    });

    expect(updateQuery.update).toHaveBeenCalledWith({
      is_paid: false,
      payment_date: null,
      account_id: null,
      card_id: null,
      invoice_month_year: null,
    });
    expect(updateQuery.eq).toHaveBeenCalledWith('id', 'debt-installment-1');
  });
});

describe('useTransactionMutations - useUpdateTransaction scopes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('materializa uma transacao virtual no escopo this sem alterar a mae', async () => {
    const mother = {
      id: 'mother-1',
      description: 'Internet',
      amount: 120,
      date: '2026-03-10',
      is_recurring: true,
      original_id: null,
      category_id: 'cat-1',
      subcategory_id: null,
    };
    const selectMother = chain({
      single: vi.fn(async () => ({ data: mother, error: null })),
    });
    const insertChild = chain();

    supabaseMock.from
      .mockReturnValueOnce(selectMother)
      .mockReturnValueOnce(insertChild);

    const { result } = renderHook(() => useUpdateTransaction(), { wrapper });

    await result.current.mutateAsync({
      id: 'mother-1-virtual-2026-3',
      updates: { amount: 150, description: 'Internet ajustada' },
      applyScope: 'this',
    });

    expect(selectMother.eq).toHaveBeenCalledWith('id', 'mother-1');
    expect(insertChild.insert).toHaveBeenCalledWith(expect.objectContaining({
      id: undefined,
      amount: 150,
      description: 'Internet ajustada',
      date: '2026-04-10',
      original_id: 'mother-1',
      is_recurring: false,
      transaction_type: 'punctual',
      is_paid: false,
      payment_date: null,
      deleted_at: null,
      created_at: undefined,
    }));
    expect(supabaseMock.from).toHaveBeenCalledTimes(2);
  });

  it('materializa virtual this no primeiro dia do mes sem voltar para o mes anterior', async () => {
    const mother = {
      id: 'mother-1',
      description: 'Aluguel',
      amount: 1000,
      date: '2026-05-01',
      is_recurring: true,
      original_id: null,
      category_id: 'cat-1',
      subcategory_id: null,
    };
    const selectMother = chain({
      single: vi.fn(async () => ({ data: mother, error: null })),
    });
    const insertChild = chain();

    supabaseMock.from
      .mockReturnValueOnce(selectMother)
      .mockReturnValueOnce(insertChild);

    const { result } = renderHook(() => useUpdateTransaction(), { wrapper });

    await result.current.mutateAsync({
      id: 'mother-1-virtual-2026-4',
      updates: { amount: 1100 },
      applyScope: 'this',
    });

    expect(insertChild.insert).toHaveBeenCalledWith(expect.objectContaining({
      date: '2026-05-01',
      original_id: 'mother-1',
      is_recurring: false,
      transaction_type: 'punctual',
    }));
  });

  it('no escopo future e mesmo mes atualiza a recorrente mae sem corte de serie', async () => {
    const mother = {
      id: 'mother-1',
      description: 'Internet',
      amount: 120,
      date: '2026-04-10',
      is_recurring: true,
      original_id: null,
    };
    const selectMother = chain({
      single: vi.fn(async () => ({ data: mother, error: null })),
    });
    const updateMother = chain({
      eq: vi.fn(async () => ({ error: null })),
    });

    supabaseMock.from
      .mockReturnValueOnce(selectMother)
      .mockReturnValueOnce(updateMother);

    const { result } = renderHook(() => useUpdateTransaction(), { wrapper });

    await result.current.mutateAsync({
      id: 'mother-1',
      updates: { date: '2026-04-15', amount: 130 },
      applyScope: 'future',
    });

    expect(updateMother.update).toHaveBeenCalledWith({
      amount: 130,
      date: '2026-04-15',
    });
    expect(updateMother.eq).toHaveBeenCalledWith('id', 'mother-1');
    expect(supabaseMock.from).toHaveBeenCalledTimes(2);
  });

  it('no escopo future e mes posterior preserva historico convertendo mae em pontual e criando nova raiz', async () => {
    const mother = {
      id: 'mother-1',
      description: 'Internet',
      amount: 120,
      date: '2026-04-10',
      is_recurring: true,
      original_id: null,
    };
    const selectMother = chain({
      single: vi.fn(async () => ({ data: mother, error: null })),
    });
    const preserveMother = chain({
      eq: vi.fn(async () => ({ error: null })),
    });
    const insertNewRoot = chain();
    insertNewRoot.insert = vi.fn(() => insertNewRoot);
    insertNewRoot.single = vi.fn(async () => ({ data: { id: 'new-root-1' }, error: null }));
    const updateFutureChildren = chain({
      is: vi.fn(async () => ({ error: null })),
    });

    supabaseMock.from
      .mockReturnValueOnce(selectMother)
      .mockReturnValueOnce(preserveMother)
      .mockReturnValueOnce(insertNewRoot)
      .mockReturnValueOnce(updateFutureChildren);

    const { result } = renderHook(() => useUpdateTransaction(), { wrapper });

    await result.current.mutateAsync({
      id: 'mother-1',
      updates: { date: '2026-05-10', amount: 140 },
      applyScope: 'future',
    });

    expect(preserveMother.update).toHaveBeenCalledWith({
      is_recurring: false,
      transaction_type: 'punctual',
    });
    expect(preserveMother.eq).toHaveBeenCalledWith('id', 'mother-1');
    expect(insertNewRoot.insert).toHaveBeenCalledWith(expect.objectContaining({
      id: undefined,
      amount: 140,
      date: '2026-05-10',
      is_recurring: true,
      original_id: null,
      is_paid: false,
      payment_date: null,
      deleted_at: null,
      created_at: undefined,
    }));
    expect(insertNewRoot.update).not.toHaveBeenCalledWith(expect.objectContaining({
      deleted_at: expect.any(String),
    }));
    expect(updateFutureChildren.update).toHaveBeenCalledWith({
      amount: 140,
      original_id: 'new-root-1',
    });
    expect(updateFutureChildren.eq).toHaveBeenCalledWith('original_id', 'mother-1');
    expect(updateFutureChildren.gte).toHaveBeenCalledWith('date', '2026-05-10');
    expect(updateFutureChildren.eq).toHaveBeenCalledWith('is_paid', false);
    expect(updateFutureChildren.is).toHaveBeenCalledWith('deleted_at', null);
  });

  it('em virtual future preserva o dia original ao criar nova raiz', async () => {
    const mother = {
      id: 'mother-1',
      description: 'Internet',
      amount: 120,
      date: '2026-04-10',
      is_recurring: true,
      original_id: null,
    };
    const selectMother = chain({
      single: vi.fn(async () => ({ data: mother, error: null })),
    });
    const preserveMother = chain({
      eq: vi.fn(async () => ({ error: null })),
    });
    const insertNewRoot = chain();
    insertNewRoot.insert = vi.fn(() => insertNewRoot);
    insertNewRoot.single = vi.fn(async () => ({ data: { id: 'new-root-1' }, error: null }));
    const updateFutureChildren = chain({
      is: vi.fn(async () => ({ error: null })),
    });

    supabaseMock.from
      .mockReturnValueOnce(selectMother)
      .mockReturnValueOnce(preserveMother)
      .mockReturnValueOnce(insertNewRoot)
      .mockReturnValueOnce(updateFutureChildren);

    const { result } = renderHook(() => useUpdateTransaction(), { wrapper });

    await result.current.mutateAsync({
      id: 'mother-1-virtual-2026-4',
      updates: { amount: 140 },
      applyScope: 'future',
    });

    expect(insertNewRoot.insert).toHaveBeenCalledWith(expect.objectContaining({
      date: '2026-05-10',
      amount: 140,
      is_recurring: true,
      original_id: null,
    }));
    expect(updateFutureChildren.gte).toHaveBeenCalledWith('date', '2026-05-10');
  });

  it('em virtual this de fim de mes respeita safeDay para fevereiro', async () => {
    const mother = {
      id: 'mother-1',
      description: 'Assinatura',
      amount: 80,
      date: '2026-01-31',
      is_recurring: true,
      original_id: null,
      category_id: 'cat-1',
      subcategory_id: null,
    };
    const selectMother = chain({
      single: vi.fn(async () => ({ data: mother, error: null })),
    });
    const insertChild = chain();

    supabaseMock.from
      .mockReturnValueOnce(selectMother)
      .mockReturnValueOnce(insertChild);

    const { result } = renderHook(() => useUpdateTransaction(), { wrapper });

    await result.current.mutateAsync({
      id: 'mother-1-virtual-2026-1',
      updates: { amount: 85 },
      applyScope: 'this',
    });

    expect(insertChild.insert).toHaveBeenCalledWith(expect.objectContaining({
      date: '2026-02-28',
      amount: 85,
      original_id: 'mother-1',
      is_recurring: false,
      transaction_type: 'punctual',
    }));
  });

  it.each([
    ['2026-01-31', '2026-02-28'],
    ['2024-01-31', '2024-02-29'],
    ['2026-03-31', '2026-04-30'],
    ['2026-04-10', '2026-05-10'],
  ])('em recorrente mae this move %s para %s sem pular o mes seguinte', async (motherDate, nextMotherDate) => {
    const mother = {
      id: 'mother-1',
      description: 'Assinatura',
      amount: 80,
      date: motherDate,
      is_recurring: true,
      original_id: null,
      category_id: 'cat-1',
      subcategory_id: null,
    };
    const selectMother = chain({
      single: vi.fn(async () => ({ data: mother, error: null })),
    });
    const insertChild = chain();
    const updateMother = chain({
      eq: vi.fn(async () => ({ error: null })),
    });

    supabaseMock.from
      .mockReturnValueOnce(selectMother)
      .mockReturnValueOnce(insertChild)
      .mockReturnValueOnce(updateMother);

    const { result } = renderHook(() => useUpdateTransaction(), { wrapper });

    await result.current.mutateAsync({
      id: 'mother-1',
      updates: { amount: 85 },
      applyScope: 'this',
    });

    expect(insertChild.insert).toHaveBeenCalledWith(expect.objectContaining({
      date: motherDate,
      amount: 85,
      original_id: 'mother-1',
      is_recurring: false,
      transaction_type: 'punctual',
    }));
    expect(updateMother.update).toHaveBeenCalledWith({ date: nextMotherDate });
    expect(updateMother.eq).toHaveBeenCalledWith('id', 'mother-1');
  });

  it('baixa recorrente mae no escopo this criando filho fisico pago com conta e data de pagamento', async () => {
    const mother = {
      id: 'mother-1',
      description: 'Barbeiro - 2ª Quinzena',
      amount: 30,
      date: '2026-04-20',
      is_recurring: true,
      original_id: null,
      account_id: null,
      card_id: null,
      invoice_month_year: null,
      category_id: 'cat-1',
      subcategory_id: null,
    };
    const selectMother = chain({
      single: vi.fn(async () => ({ data: mother, error: null })),
    });
    const insertChild = chain();
    const updateMother = chain({
      eq: vi.fn(async () => ({ error: null })),
    });

    supabaseMock.from
      .mockReturnValueOnce(selectMother)
      .mockReturnValueOnce(insertChild)
      .mockReturnValueOnce(updateMother);

    const { result } = renderHook(() => useUpdateTransaction(), { wrapper });

    await result.current.mutateAsync({
      id: 'mother-1',
      updates: {
        isPaid: true,
        paymentDate: '2026-04-20',
        accountId: 'account-1',
        amount: 30,
      },
      applyScope: 'this',
    });

    expect(insertChild.insert).toHaveBeenCalledWith(expect.objectContaining({
      description: 'Barbeiro - 2ª Quinzena',
      amount: 30,
      date: '2026-04-20',
      original_id: 'mother-1',
      is_recurring: false,
      transaction_type: 'punctual',
      is_paid: true,
      payment_date: '2026-04-20',
      account_id: 'account-1',
      card_id: null,
      invoice_month_year: null,
      deleted_at: null,
    }));
    expect(updateMother.update).toHaveBeenCalledWith({ date: '2026-05-20' });
    expect(updateMother.eq).toHaveBeenCalledWith('id', 'mother-1');
  });

  it('rejeita baixa por useUpdateTransaction quando nao ha conta nem cartao', async () => {
    const transaction = {
      id: 'debt-installment-1',
      description: 'Acordo banco (1/3)',
      amount: 180,
      date: '2026-04-10',
      is_recurring: false,
      original_id: null,
      installment_group_id: 'debt-group-1',
      account_id: null,
      card_id: null,
      debt_id: 'debt-1',
    };
    const selectTransaction = chain({
      single: vi.fn(async () => ({ data: transaction, error: null })),
    });
    supabaseMock.from.mockReturnValueOnce(selectTransaction);

    const { result } = renderHook(() => useUpdateTransaction(), { wrapper });

    await expect(result.current.mutateAsync({
      id: 'debt-installment-1',
      updates: {
        isPaid: true,
        paymentDate: '2026-04-10',
      },
    })).rejects.toThrow('Selecione uma conta ou cartao para registrar o pagamento.');

    expect(supabaseMock.from).toHaveBeenCalledTimes(1);
    expect(selectTransaction.update).not.toHaveBeenCalled();
  });

  it('rejeita baixa quando update nao retorna linha alterada', async () => {
    const transaction = {
      id: 'debt-installment-1',
      description: 'Acordo banco (1/3)',
      amount: 180,
      date: '2026-04-10',
      is_recurring: false,
      original_id: null,
      installment_group_id: 'debt-group-1',
      account_id: null,
      card_id: null,
      debt_id: 'debt-1',
    };
    const selectTransaction = chain({
      single: vi.fn(async () => ({ data: transaction, error: null })),
    });
    const updateInstallment = chain({
      select: vi.fn(async () => ({ data: [], error: null })),
    });
    supabaseMock.from
      .mockReturnValueOnce(selectTransaction)
      .mockReturnValueOnce(updateInstallment);

    const { result } = renderHook(() => useUpdateTransaction(), { wrapper });

    await expect(result.current.mutateAsync({
      id: 'debt-installment-1',
      updates: {
        isPaid: true,
        paymentDate: '2026-04-10',
        accountId: 'acc-1',
        cardId: null,
        invoiceMonthYear: null,
      },
    })).rejects.toThrow('Transacao nao atualizada. Recarregue os dados e tente novamente.');

    expect(updateInstallment.update).toHaveBeenCalledWith(expect.objectContaining({
      is_paid: true,
      payment_date: '2026-04-10',
      account_id: 'acc-1',
      card_id: null,
    }));
  });

  it('baixa parcela de acordo por conta limpando cartao anterior e mantendo o registro da parcela', async () => {
    const transaction = {
      id: 'debt-installment-1',
      description: 'Acordo banco (1/3)',
      amount: 180,
      date: '2026-04-10',
      is_recurring: false,
      original_id: null,
      installment_group_id: 'debt-group-1',
      account_id: null,
      card_id: 'card-old',
      invoice_month_year: '2026-04',
      debt_id: 'debt-1',
    };
    const selectTransaction = chain({
      single: vi.fn(async () => ({ data: transaction, error: null })),
    });
    const updateInstallment = chain({
      select: vi.fn(async () => ({ data: [{ id: 'debt-installment-1' }], error: null })),
    });
    supabaseMock.from
      .mockReturnValueOnce(selectTransaction)
      .mockReturnValueOnce(updateInstallment);

    const { result } = renderHook(() => useUpdateTransaction(), { wrapper });

    await result.current.mutateAsync({
      id: 'debt-installment-1',
      updates: {
        isPaid: true,
        paymentDate: '2026-04-10',
        accountId: 'acc-1',
        cardId: null,
        invoiceMonthYear: null,
        amount: 180,
      },
    });

    expect(updateInstallment.update).toHaveBeenCalledWith(expect.objectContaining({
      amount: 180,
      account_id: 'acc-1',
      card_id: null,
      invoice_month_year: null,
      is_paid: true,
      payment_date: '2026-04-10',
    }));
    expect(updateInstallment.eq).toHaveBeenCalledWith('id', 'debt-installment-1');
  });

  it('invalida queries financeiras apos baixa de parcela de acordo', async () => {
    const transaction = {
      id: 'debt-installment-1',
      description: 'Acordo banco (1/3)',
      amount: 180,
      date: '2026-04-10',
      is_recurring: false,
      original_id: null,
      installment_group_id: 'debt-group-1',
      account_id: null,
      card_id: null,
      debt_id: 'debt-1',
    };
    const selectTransaction = chain({
      single: vi.fn(async () => ({ data: transaction, error: null })),
    });
    const updateInstallment = chain({
      select: vi.fn(async () => ({ data: [{ id: 'debt-installment-1' }], error: null })),
    });
    supabaseMock.from
      .mockReturnValueOnce(selectTransaction)
      .mockReturnValueOnce(updateInstallment);

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateTransaction(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync({
      id: 'debt-installment-1',
      updates: {
        isPaid: true,
        paymentDate: '2026-04-10',
        accountId: 'acc-1',
        cardId: null,
        invoiceMonthYear: null,
      },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['transactions'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['accounts'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['credit-cards'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['debts'] });
  });

  it('no escopo all de recorrente filtra apenas registros nao pagos e nao deletados', async () => {
    const mother = {
      id: 'mother-1',
      description: 'Internet',
      amount: 120,
      date: '2026-04-10',
      is_recurring: true,
      original_id: null,
    };
    const selectMother = chain({
      single: vi.fn(async () => ({ data: mother, error: null })),
    });
    const updateSeries = chain({
      select: vi.fn(async () => ({ data: [], error: null })),
    });

    supabaseMock.from
      .mockReturnValueOnce(selectMother)
      .mockReturnValueOnce(updateSeries);

    const { result } = renderHook(() => useUpdateTransaction(), { wrapper });

    await result.current.mutateAsync({
      id: 'mother-1',
      updates: { amount: 160, date: '2026-05-10' },
      applyScope: 'all',
    });

    expect(updateSeries.update).toHaveBeenCalledWith({ amount: 160 });
    expect(updateSeries.or).toHaveBeenCalledWith('id.eq.mother-1,original_id.eq.mother-1');
    expect(updateSeries.eq).toHaveBeenCalledWith('is_paid', false);
    expect(updateSeries.is).toHaveBeenCalledWith('deleted_at', null);
  });

  it('em parcelamento no escopo future usa installment_group_id e nao original_id', async () => {
    const installment = {
      id: 'inst-2',
      description: 'Compra (2/5)',
      amount: 100,
      date: '2026-04-10',
      is_recurring: false,
      original_id: null,
      installment_group_id: 'group-1',
    };
    const selectInstallment = chain({
      single: vi.fn(async () => ({ data: installment, error: null })),
    });
    const updateFutureInstallments = chain({
      select: vi.fn(async () => ({ data: [], error: null })),
    });

    supabaseMock.from
      .mockReturnValueOnce(selectInstallment)
      .mockReturnValueOnce(updateFutureInstallments);

    const { result } = renderHook(() => useUpdateTransaction(), { wrapper });

    await result.current.mutateAsync({
      id: 'inst-2',
      updates: { amount: 90 },
      applyScope: 'future',
      referenceDate: '2026-04-10',
    });

    expect(updateFutureInstallments.update).toHaveBeenCalledWith({ amount: 90 });
    expect(updateFutureInstallments.eq).toHaveBeenCalledWith('installment_group_id', 'group-1');
    expect(updateFutureInstallments.gte).toHaveBeenCalledWith('date', '2026-04-10');
    expect(updateFutureInstallments.eq).toHaveBeenCalledWith('is_paid', false);
    expect(updateFutureInstallments.is).toHaveBeenCalledWith('deleted_at', null);
    expect(updateFutureInstallments.or).not.toHaveBeenCalled();
  });

  it('corrige compra parcelada existente recalculando invoice_month_year do grupo sem duplicar parcelas', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    queryClient.setQueryData(['credit-cards'], [
      {
        id: 'card-1',
        userId: 'user-1',
        name: 'Nu - Duda',
        bank: 'Nu',
        limit: 5000,
        color: '#000',
        dueDay: 5,
        closingDay: 28,
        isClosingDateFixed: true,
        isActive: true,
        history: [
          { dueDay: 5, closingDay: 29, effectiveDate: '2020-01-01' },
          { dueDay: 5, closingDay: 28, effectiveDate: '2026-01-01' },
        ],
      },
    ]);

    const currentInstallment = {
      id: 'inst-1',
      description: 'Renegociação de Pendências (1/9)',
      amount: 483.85,
      date: '2026-05-05',
      is_recurring: false,
      original_id: null,
      installment_group_id: 'group-card-1',
      installment_number: 1,
      installment_total: 9,
      card_id: 'card-1',
      invoice_month_year: '2026-05',
    };
    const selectInstallment = chain({
      single: vi.fn(async () => ({ data: currentInstallment, error: null })),
    });
    const installmentDates = [
      '2026-05-05',
      '2026-06-05',
      '2026-07-05',
      '2026-08-05',
      '2026-09-05',
      '2026-10-05',
      '2026-11-05',
      '2026-12-05',
      '2027-01-05',
    ];
    const groupRows = installmentDates.map((installmentDate, index) => ({
      id: `inst-${index + 1}`,
      date: installmentDate,
      is_paid: true,
      payment_date: installmentDate,
      installment_number: index + 1,
      installment_total: 9,
      card_id: 'card-1',
      invoice_month_year: installmentDate.slice(0, 7),
      deleted_at: null,
    }));
    const fetchGroup = chain({
      order: vi.fn(async () => ({
        data: groupRows,
        error: null,
      })),
    });
    const updateQueries = Array.from({ length: 9 }, (_, index) => chain({
      select: vi.fn(async () => ({ data: [{ id: `inst-${index + 1}` }], error: null })),
    }));

    supabaseMock.from
      .mockReturnValueOnce(selectInstallment)
      .mockReturnValueOnce(fetchGroup);
    updateQueries.forEach((query) => {
      supabaseMock.from.mockReturnValueOnce(query);
    });

    const { result } = renderHook(() => useUpdateTransaction(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync({
      id: 'inst-1',
      currentCardId: 'card-1',
      updates: {
        description: 'Renegociação de Pendências',
        amount: 483.85,
        date: '2026-05-05',
        cardId: 'card-1',
        transactionType: 'installment',
        isPaid: true,
        paymentDate: '2026-05-05',
      },
      applyScope: 'all',
      referenceDate: '2026-05-05',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(updateQueries[0].update).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Renegociação de Pendências (1/9)',
        amount: 483.85,
        date: '2026-05-05',
        card_id: 'card-1',
        transaction_type: 'installment',
        invoice_month_year: '2026-06',
      }),
    );
    expect(updateQueries[1].update).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Renegociação de Pendências (2/9)',
        amount: 483.85,
        date: '2026-06-05',
        card_id: 'card-1',
        transaction_type: 'installment',
        invoice_month_year: '2026-07',
      }),
    );
    expect(updateQueries[2].update).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Renegociação de Pendências (3/9)',
        amount: 483.85,
        date: '2026-07-05',
        card_id: 'card-1',
        transaction_type: 'installment',
        invoice_month_year: '2026-08',
      }),
    );
    expect(updateQueries[0].eq).toHaveBeenCalledWith('id', 'inst-1');
    expect(updateQueries[1].eq).toHaveBeenCalledWith('id', 'inst-2');
    expect(updateQueries[2].eq).toHaveBeenCalledWith('id', 'inst-3');
    expect(updateQueries[0].update).not.toHaveBeenCalledWith(expect.objectContaining({
      installment_group_id: expect.anything(),
      installment_number: expect.anything(),
      installment_total: expect.anything(),
      is_paid: expect.anything(),
      payment_date: expect.anything(),
      account_id: expect.anything(),
    }));
    expect(supabaseMock.from).toHaveBeenCalledTimes(11);
  });

  it('em filho fisico de recorrente no escopo future atualiza a mae e filhos futuros pelo original_id', async () => {
    const child = {
      id: 'child-1',
      description: 'Internet',
      amount: 120,
      date: '2026-04-10',
      is_recurring: false,
      original_id: 'mother-1',
      installment_group_id: null,
    };
    const selectChild = chain({
      single: vi.fn(async () => ({ data: child, error: null })),
    });
    const updateMother = chain({
      is: vi.fn(async () => ({ error: null })),
    });
    const updateChildren = chain({
      select: vi.fn(async () => ({ data: [], error: null })),
    });

    supabaseMock.from
      .mockReturnValueOnce(selectChild)
      .mockReturnValueOnce(updateMother)
      .mockReturnValueOnce(updateChildren);

    const { result } = renderHook(() => useUpdateTransaction(), { wrapper });

    await result.current.mutateAsync({
      id: 'child-1',
      updates: { amount: 145, date: '2026-05-10' },
      applyScope: 'future',
      referenceDate: '2026-04-10',
    });

    expect(updateMother.update).toHaveBeenCalledWith({ amount: 145 });
    expect(updateMother.eq).toHaveBeenCalledWith('id', 'mother-1');
    expect(updateMother.eq).toHaveBeenCalledWith('is_paid', false);
    expect(updateMother.is).toHaveBeenCalledWith('deleted_at', null);
    expect(updateChildren.update).toHaveBeenCalledWith({
      amount: 145,
      date: '2026-05-10',
    });
    expect(updateChildren.eq).toHaveBeenCalledWith('original_id', 'mother-1');
    expect(updateChildren.gte).toHaveBeenCalledWith('date', '2026-04-10');
    expect(updateChildren.eq).toHaveBeenCalledWith('is_paid', false);
    expect(updateChildren.is).toHaveBeenCalledWith('deleted_at', null);
  });
});
