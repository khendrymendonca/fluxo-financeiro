import React, { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAddAccount, useUpdateAccount, useTransferBetweenAccounts } from '@/hooks/useAccountMutations';

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: supabaseMock,
  logSafeError: vi.fn(),
}));

vi.mock('@/components/ui/use-toast', () => ({
  toast: vi.fn(),
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, signOut: vi.fn() }),
}));

function createBuilder() {
  const builder: Record<string, any> = {};
  builder.select = vi.fn(() => builder);
  builder.insert = vi.fn(() => builder);
  builder.update = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.is = vi.fn(() => builder);
  builder.maybeSingle = vi.fn(async () => ({ data: { id: 'cat-transferencia' }, error: null }));
  builder.single = vi.fn(async () => ({ data: { id: 'acc-1' }, error: null }));
  builder.then = (onfulfilled: any) => {
    return Promise.resolve({ data: [{ id: 'acc-1' }], error: null }).then(onfulfilled);
  };
  return builder;
}

function wrapper({ children }: PropsWithChildren) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useAccountMutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cria conta enviando apenas bank para o Supabase', async () => {
    const builder = createBuilder();
    supabaseMock.from.mockReturnValue(builder);

    const { result } = renderHook(() => useAddAccount(), { wrapper });

    await result.current.mutateAsync({
      name: 'Conta Principal',
      bank: 'Itaú',
      institution: 'Itaú',
      balance: 100,
      color: '#000',
      icon: 'wallet',
      accountType: 'corrente',
      hasOverdraft: false,
      overdraftLimit: 0,
    } as any);

    expect(supabaseMock.from).toHaveBeenCalledWith('accounts');
    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        name: 'Conta Principal',
        bank: 'Itaú',
      })
    );
    expect(builder.insert.mock.calls[0][0]).not.toHaveProperty('institution');
  });

  it('edita conta enviando bank e removendo institution do payload', async () => {
    const builder = createBuilder();
    supabaseMock.from.mockReturnValue(builder);

    const { result } = renderHook(() => useUpdateAccount(), { wrapper });

    await result.current.mutateAsync({
      id: 'acc-1',
      updates: {
        name: 'Conta Ajustada',
        institution: 'Nubank',
      } as any,
    });

    expect(supabaseMock.from).toHaveBeenCalledWith('accounts');
    expect(builder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Conta Ajustada',
        bank: 'Nubank',
      })
    );
    expect(builder.update.mock.calls[0][0]).not.toHaveProperty('institution');
    expect(builder.eq).toHaveBeenCalledWith('id', 'acc-1');
  });

  it('mantem a UI de contas usando bank na criacao e nos seletores', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/components/accounts/AccountsManager.tsx'),
      'utf8'
    );

    expect(source).toContain('bank: accountInstitution');
    expect(source).not.toContain('institution: accountInstitution');
    expect(source).toContain('{a.bank} - {a.name}');
  });

  describe('useTransferBetweenAccounts', () => {
    it('realiza transferencia entre contas normais com is_transfer true', async () => {
      const builder = createBuilder();
      const insertCalls: any[] = [];
      builder.insert = vi.fn((payload) => {
        insertCalls.push(payload);
        return {
          select: vi.fn(() => ({
            single: vi.fn(async () => ({ data: { id: 'tx-out-id' }, error: null }))
          }))
        };
      });
      supabaseMock.from.mockReturnValue(builder);

      const { result } = renderHook(() => useTransferBetweenAccounts(), { wrapper });

      await result.current.mutateAsync({
        from: 'acc-1',
        to: 'acc-2',
        amount: 250,
        description: 'Pix normal',
        date: '2026-06-26',
        type: 'account',
        fromType: 'account',
      });

      expect(supabaseMock.from).toHaveBeenCalledWith('transactions');
      expect(insertCalls).toHaveLength(2);
      expect(insertCalls[0]).toEqual(expect.objectContaining({
        user_id: 'user-1',
        description: '[Saída] Pix normal',
        amount: 250,
        type: 'expense',
        account_id: 'acc-1',
        card_id: null,
        is_paid: true,
        is_transfer: true,
      }));
      expect(insertCalls[1]).toEqual(expect.objectContaining({
        user_id: 'user-1',
        description: '[Entrada] Pix normal',
        amount: 250,
        type: 'income',
        account_id: 'acc-2',
        card_id: null,
        is_paid: true,
        is_transfer: true,
      }));
    });

    it('realiza transferencia com origem cartao de credito com is_transfer false e despesa nao paga', async () => {
      const builder = createBuilder();
      const insertCalls: any[] = [];
      builder.insert = vi.fn((payload) => {
        insertCalls.push(payload);
        return {
          select: vi.fn(() => ({
            single: vi.fn(async () => ({ data: { id: 'tx-out-id' }, error: null }))
          }))
        };
      });
      supabaseMock.from.mockReturnValue(builder);

      const { result } = renderHook(() => useTransferBetweenAccounts(), { wrapper });

      await result.current.mutateAsync({
        from: 'card-1',
        to: 'acc-2',
        amount: 500,
        description: 'Pix no credito',
        date: '2026-06-26',
        type: 'account',
        fromType: 'card',
        fromInvoiceMonthYear: '2026-07',
      });

      expect(supabaseMock.from).toHaveBeenCalledWith('transactions');
      expect(insertCalls).toHaveLength(2);
      expect(insertCalls[0]).toEqual(expect.objectContaining({
        user_id: 'user-1',
        description: '[Saída] Pix no credito',
        amount: 500,
        type: 'expense',
        account_id: null,
        card_id: 'card-1',
        is_paid: false,
        is_transfer: false,
        invoice_month_year: '2026-07',
      }));
      expect(insertCalls[1]).toEqual(expect.objectContaining({
        user_id: 'user-1',
        description: '[Entrada] Pix no credito',
        amount: 500,
        type: 'income',
        account_id: 'acc-2',
        card_id: null,
        is_paid: true,
        is_transfer: false,
      }));
    });
  });
});
