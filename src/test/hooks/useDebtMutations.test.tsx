import React, { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRenegotiateDebt, useUpdateDebt } from '@/hooks/useDebtMutations';
import type { Debt } from '@/types/finance';

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(),
}));

const toastMock = vi.hoisted(() => ({
  toast: vi.fn(),
}));

const financeStoreMock = vi.hoisted(() => ({
  useFinanceStore: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: supabaseMock,
  logSupabaseError: vi.fn(),
}));

vi.mock('@/components/ui/use-toast', () => ({
  toast: toastMock.toast,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/hooks/useFinanceStore', () => financeStoreMock);

type QueryBuilder = {
  update?: ReturnType<typeof vi.fn>;
  insert?: ReturnType<typeof vi.fn>;
  select?: ReturnType<typeof vi.fn>;
  eq?: ReturnType<typeof vi.fn>;
  single?: ReturnType<typeof vi.fn>;
};

const baseDebtRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'debt-1',
  user_id: 'user-1',
  name: 'Acordo banco',
  total_amount: 900,
  remaining_amount: 900,
  installment_amount: 300,
  interest_rate_monthly: 0,
  minimum_payment: null,
  due_day: null,
  strategy_priority: 1,
  status: 'renegotiated',
  total_installments: 3,
  card_id: null,
  debt_type: 'agreement',
  start_date: '2026-05-15',
  ...overrides,
});

const baseDebt = (overrides: Partial<Debt> = {}): Debt => ({
  id: 'debt-1',
  userId: 'user-1',
  name: 'Acordo banco',
  totalAmount: 900,
  remainingAmount: 900,
  installmentAmount: 300,
  interestRateMonthly: 0,
  minimumPayment: undefined,
  dueDay: undefined,
  strategyPriority: 1,
  status: 'active',
  totalInstallments: 3,
  cardId: undefined,
  debtType: 'agreement',
  startDate: '2026-05-15',
  ...overrides,
});

const baseInstallmentRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'tx-1',
  description: 'Parcela antiga',
  amount: 100,
  date: '2026-05-01',
  is_paid: false,
  payment_date: null,
  account_id: null,
  card_id: null,
  category_id: 'cat-reneg',
  debt_id: 'debt-1',
  installment_group_id: 'group-existing',
  installment_number: 1,
  installment_total: 2,
  deleted_at: null,
  ...overrides,
});

const createDebtUpdateQuery = (updatedDebtRow = baseDebtRow()): QueryBuilder => {
  const builder: QueryBuilder = {};
  builder.update = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.select = vi.fn(() => builder);
  builder.single = vi.fn(async () => ({ data: updatedDebtRow, error: null }));
  return builder;
};

const createFetchInstallmentsQuery = (rows: Record<string, unknown>[]): QueryBuilder => {
  const builder: QueryBuilder = {};
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(async () => ({ data: rows, error: null }));
  return builder;
};

const createUpdateTransactionQuery = (): QueryBuilder => {
  const builder: QueryBuilder = {};
  builder.update = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.select = vi.fn(async () => ({ data: [{ id: 'updated-transaction' }], error: null }));
  return builder;
};

const createInsertTransactionQuery = (): QueryBuilder => {
  const builder: QueryBuilder = {};
  builder.insert = vi.fn(() => builder);
  builder.select = vi.fn(async () => ({ data: [{ id: 'inserted-transaction' }], error: null }));
  return builder;
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const getInsertPayload = (query: QueryBuilder) => {
  expect(query.insert).toHaveBeenCalledTimes(1);
  return query.insert!.mock.calls[0][0];
};

const getUpdatePayload = (query: QueryBuilder) => {
  expect(query.update).toHaveBeenCalledTimes(1);
  return query.update!.mock.calls[0][0];
};

describe('useDebtMutations - sync de parcelas de acordo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMock.from.mockReset();
    financeStoreMock.useFinanceStore.mockReturnValue({
      categories: [{ id: 'cat-reneg', name: 'Acordo' }],
      creditCards: [],
    });
  });

  it('cria todas as parcelas esperadas quando o acordo atualizado ainda nao tem transactions', async () => {
    const debtUpdate = createDebtUpdateQuery(
      baseDebtRow({
        total_amount: 600,
        remaining_amount: 600,
        installment_amount: 200,
        total_installments: 3,
        start_date: '2026-06-10',
      }),
    );
    const fetchInstallments = createFetchInstallmentsQuery([]);
    const inserts = [
      createInsertTransactionQuery(),
      createInsertTransactionQuery(),
      createInsertTransactionQuery(),
    ];

    supabaseMock.from
      .mockReturnValueOnce(debtUpdate)
      .mockReturnValueOnce(fetchInstallments)
      .mockReturnValueOnce(inserts[0])
      .mockReturnValueOnce(inserts[1])
      .mockReturnValueOnce(inserts[2]);

    const { result } = renderHook(() => useUpdateDebt(), { wrapper: createWrapper() });

    const response = await result.current.mutateAsync({
      id: 'debt-1',
      updates: {
        installmentAmount: 200,
        totalInstallments: 3,
        startDate: '2026-06-10',
        status: 'renegotiated',
      },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(debtUpdate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        installment_amount: 200,
        total_installments: 3,
        start_date: '2026-06-10',
        status: 'renegotiated',
      }),
    );
    expect(fetchInstallments.eq).toHaveBeenCalledWith('debt_id', 'debt-1');

    const payloads = inserts.map(getInsertPayload);
    expect(payloads.map((payload) => payload.installment_number)).toEqual([1, 2, 3]);
    expect(payloads.map((payload) => payload.date)).toEqual([
      '2026-06-10',
      '2026-07-10',
      '2026-08-10',
    ]);
    expect(new Set(payloads.map((payload) => payload.installment_group_id)).size).toBe(1);
    expect(payloads[0]).toEqual(
      expect.objectContaining({
        user_id: 'user-1',
        type: 'expense',
        transaction_type: 'installment',
        is_paid: false,
        debt_id: 'debt-1',
        installment_number: 1,
        installment_total: 3,
        amount: 200,
        description: 'Acordo Acordo banco (1/3)',
      }),
    );
    expect(response.syncReport).toEqual(
      expect.objectContaining({ created: 3, updated: 0, preservedPaid: 0 }),
    );
  });

  it('atualiza parcelas pendentes existentes sem duplicar transactions', async () => {
    const debtUpdate = createDebtUpdateQuery(
      baseDebtRow({
        name: 'Acordo atualizado',
        installment_amount: 250,
        total_installments: 2,
        start_date: '2026-07-05',
      }),
    );
    const fetchInstallments = createFetchInstallmentsQuery([
      baseInstallmentRow({ id: 'tx-1', installment_number: 1, installment_total: 2 }),
      baseInstallmentRow({ id: 'tx-2', installment_number: 2, installment_total: 2 }),
    ]);
    const updateFirst = createUpdateTransactionQuery();
    const updateSecond = createUpdateTransactionQuery();

    supabaseMock.from
      .mockReturnValueOnce(debtUpdate)
      .mockReturnValueOnce(fetchInstallments)
      .mockReturnValueOnce(updateFirst)
      .mockReturnValueOnce(updateSecond);

    const { result } = renderHook(() => useUpdateDebt(), { wrapper: createWrapper() });

    const response = await result.current.mutateAsync({
      id: 'debt-1',
      updates: {
        name: 'Acordo atualizado',
        installmentAmount: 250,
        totalInstallments: 2,
        startDate: '2026-07-05',
      },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(updateFirst.eq).toHaveBeenCalledWith('id', 'tx-1');
    expect(updateSecond.eq).toHaveBeenCalledWith('id', 'tx-2');
    expect(getUpdatePayload(updateFirst)).toEqual(
      expect.objectContaining({
        description: 'Acordo Acordo atualizado (1/2)',
        amount: 250,
        date: '2026-07-05',
        debt_id: 'debt-1',
        installment_group_id: 'group-existing',
        installment_number: 1,
        installment_total: 2,
      }),
    );
    expect(getUpdatePayload(updateSecond)).toEqual(
      expect.objectContaining({
        description: 'Acordo Acordo atualizado (2/2)',
        amount: 250,
        date: '2026-08-05',
        installment_number: 2,
        installment_total: 2,
      }),
    );
    expect(supabaseMock.from).toHaveBeenCalledTimes(4);
    expect(response.syncReport).toEqual(
      expect.objectContaining({ created: 0, updated: 2, preservedPaid: 0 }),
    );
  });

  it('ao aumentar a quantidade de parcelas atualiza as existentes e cria apenas as ausentes', async () => {
    const debtUpdate = createDebtUpdateQuery(
      baseDebtRow({
        installment_amount: 150,
        total_installments: 4,
        start_date: '2026-08-20',
      }),
    );
    const fetchInstallments = createFetchInstallmentsQuery([
      baseInstallmentRow({ id: 'tx-1', installment_number: 1, installment_total: 2 }),
      baseInstallmentRow({ id: 'tx-2', installment_number: 2, installment_total: 2 }),
    ]);
    const updateFirst = createUpdateTransactionQuery();
    const updateSecond = createUpdateTransactionQuery();
    const insertThird = createInsertTransactionQuery();
    const insertFourth = createInsertTransactionQuery();

    supabaseMock.from
      .mockReturnValueOnce(debtUpdate)
      .mockReturnValueOnce(fetchInstallments)
      .mockReturnValueOnce(updateFirst)
      .mockReturnValueOnce(updateSecond)
      .mockReturnValueOnce(insertThird)
      .mockReturnValueOnce(insertFourth);

    const { result } = renderHook(() => useUpdateDebt(), { wrapper: createWrapper() });

    const response = await result.current.mutateAsync({
      id: 'debt-1',
      updates: {
        installmentAmount: 150,
        totalInstallments: 4,
        startDate: '2026-08-20',
      },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(updateFirst.eq).toHaveBeenCalledWith('id', 'tx-1');
    expect(updateSecond.eq).toHaveBeenCalledWith('id', 'tx-2');

    const insertedPayloads = [getInsertPayload(insertThird), getInsertPayload(insertFourth)];
    expect(insertedPayloads.map((payload) => payload.installment_number)).toEqual([3, 4]);
    expect(insertedPayloads.map((payload) => payload.date)).toEqual([
      '2026-10-20',
      '2026-11-20',
    ]);
    expect(insertedPayloads).toEqual([
      expect.objectContaining({
        debt_id: 'debt-1',
        is_paid: false,
        transaction_type: 'installment',
        type: 'expense',
        installment_group_id: 'group-existing',
        installment_total: 4,
      }),
      expect.objectContaining({
        debt_id: 'debt-1',
        is_paid: false,
        transaction_type: 'installment',
        type: 'expense',
        installment_group_id: 'group-existing',
        installment_total: 4,
      }),
    ]);
    expect(response.syncReport).toEqual(
      expect.objectContaining({ created: 2, updated: 2, preservedPaid: 0 }),
    );
  });

  it('preserva parcela paga e nao cria outra pendente com o mesmo numero', async () => {
    const debtUpdate = createDebtUpdateQuery(
      baseDebtRow({
        installment_amount: 450,
        total_installments: 2,
        start_date: '2026-09-15',
      }),
    );
    const fetchInstallments = createFetchInstallmentsQuery([
      baseInstallmentRow({
        id: 'tx-paid',
        installment_number: 1,
        is_paid: true,
        payment_date: '2026-09-16',
        account_id: 'account-paid',
        card_id: 'card-paid',
      }),
      baseInstallmentRow({
        id: 'tx-pending',
        installment_number: 2,
        is_paid: false,
      }),
    ]);
    const updatePending = createUpdateTransactionQuery();

    supabaseMock.from
      .mockReturnValueOnce(debtUpdate)
      .mockReturnValueOnce(fetchInstallments)
      .mockReturnValueOnce(updatePending);

    const { result } = renderHook(() => useUpdateDebt(), { wrapper: createWrapper() });

    const response = await result.current.mutateAsync({
      id: 'debt-1',
      updates: {
        installmentAmount: 450,
        totalInstallments: 2,
        startDate: '2026-09-15',
      },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(updatePending.eq).toHaveBeenCalledWith('id', 'tx-pending');
    expect(getUpdatePayload(updatePending)).not.toEqual(
      expect.objectContaining({
        is_paid: expect.anything(),
        payment_date: expect.anything(),
        account_id: expect.anything(),
        card_id: expect.anything(),
      }),
    );
    expect(supabaseMock.from).toHaveBeenCalledTimes(3);
    expect(response.syncReport).toEqual(
      expect.objectContaining({ created: 0, updated: 1, preservedPaid: 1 }),
    );
  });

  it('useRenegotiateDebt preserva parcela paga e cria somente parcelas ausentes', async () => {
    const debtUpdate = createDebtUpdateQuery(
      baseDebtRow({
        status: 'renegotiated',
        installment_amount: 300,
        total_installments: 3,
        start_date: '2026-10-01',
      }),
    );
    const fetchInstallments = createFetchInstallmentsQuery([
      baseInstallmentRow({
        id: 'tx-paid',
        installment_number: 1,
        is_paid: true,
        payment_date: '2026-10-02',
        account_id: 'account-paid',
        card_id: 'card-paid',
      }),
      baseInstallmentRow({
        id: 'tx-pending',
        installment_number: 2,
        is_paid: false,
      }),
    ]);
    const updatePending = createUpdateTransactionQuery();
    const insertThird = createInsertTransactionQuery();

    supabaseMock.from
      .mockReturnValueOnce(debtUpdate)
      .mockReturnValueOnce(fetchInstallments)
      .mockReturnValueOnce(updatePending)
      .mockReturnValueOnce(insertThird);

    const { result } = renderHook(() => useRenegotiateDebt(), { wrapper: createWrapper() });

    const response = await result.current.mutateAsync({
      debt: baseDebt({
        installmentAmount: 300,
        totalInstallments: 3,
        startDate: '2026-10-01',
      }),
      firstInstallmentDate: '2026-10-01',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(debtUpdate.update).toHaveBeenCalledWith({
      status: 'renegotiated',
      start_date: '2026-10-01',
    });
    expect(fetchInstallments.eq).toHaveBeenCalledWith('debt_id', 'debt-1');
    expect(updatePending.eq).toHaveBeenCalledWith('id', 'tx-pending');
    expect(getUpdatePayload(updatePending)).not.toEqual(
      expect.objectContaining({
        deleted_at: expect.anything(),
        is_paid: expect.anything(),
        payment_date: expect.anything(),
      }),
    );

    const insertedPayload = getInsertPayload(insertThird);
    expect(insertedPayload).toEqual(
      expect.objectContaining({
        debt_id: 'debt-1',
        installment_number: 3,
        transaction_type: 'installment',
        type: 'expense',
        is_paid: false,
      }),
    );
    expect(response.syncReport).toEqual(
      expect.objectContaining({ created: 1, updated: 1, preservedPaid: 1 }),
    );
  });

  it('renegociacao vinculada ao cartao usa regra central de invoiceMonthYear com historico', async () => {
    financeStoreMock.useFinanceStore.mockReturnValue({
      categories: [{ id: 'cat-reneg', name: 'Acordo' }],
      creditCards: [
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
      ],
    });

    const debtUpdate = createDebtUpdateQuery(
      baseDebtRow({
        status: 'renegotiated',
        installment_amount: 300,
        total_installments: 3,
        start_date: '2026-05-05',
        card_id: 'card-1',
        debt_type: 'invoice_installment',
      }),
    );
    const fetchInstallments = createFetchInstallmentsQuery([]);
    const insertFirst = createInsertTransactionQuery();
    const insertSecond = createInsertTransactionQuery();
    const insertThird = createInsertTransactionQuery();

    supabaseMock.from
      .mockReturnValueOnce(debtUpdate)
      .mockReturnValueOnce(fetchInstallments)
      .mockReturnValueOnce(insertFirst)
      .mockReturnValueOnce(insertSecond)
      .mockReturnValueOnce(insertThird);

    const { result } = renderHook(() => useRenegotiateDebt(), { wrapper: createWrapper() });

    await result.current.mutateAsync({
      debt: baseDebt({
        installmentAmount: 300,
        totalInstallments: 3,
        startDate: '2026-05-05',
        cardId: 'card-1',
        debtType: 'invoice_installment',
      }),
      firstInstallmentDate: '2026-05-05',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const payloads = [getInsertPayload(insertFirst), getInsertPayload(insertSecond), getInsertPayload(insertThird)];
    expect(payloads.map((payload) => payload.invoice_month_year)).toEqual(['2026-06', '2026-07', '2026-08']);
  });
});
