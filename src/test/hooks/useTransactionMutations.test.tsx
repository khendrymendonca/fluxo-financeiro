import React, { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useDeleteTransaction,
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

  it('estorna filho materializado com soft delete em vez de delete fisico', async () => {
    const updateQuery = chain({
      eq: vi.fn(async () => ({ error: null })),
    });
    supabaseMock.from.mockReturnValueOnce(updateQuery);

    const { result } = renderHook(() => useToggleTransactionPaid(), { wrapper });

    await result.current.mutateAsync({
      id: 'child-1',
      isPaid: false,
      isChild: true,
    });

    expect(updateQuery.update).toHaveBeenCalledWith({ deleted_at: expect.any(String) });
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
