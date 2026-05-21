import React, { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAddAccount, useUpdateAccount } from '@/hooks/useAccountMutations';

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
  builder.select = vi.fn(async () => ({ data: [{ id: 'acc-1' }], error: null }));
  builder.insert = vi.fn(() => builder);
  builder.update = vi.fn(() => builder);
  builder.eq = vi.fn(async () => ({ error: null }));
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
});
