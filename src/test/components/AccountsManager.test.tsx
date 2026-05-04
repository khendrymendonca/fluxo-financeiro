import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountsManager } from '@/components/accounts/AccountsManager';

const financeStoreMock = vi.hoisted(() => ({
  useFinanceStore: vi.fn(),
}));

const featureFlagsMock = vi.hoisted(() => ({
  useFeatureFlag: vi.fn(),
}));

const toastMock = vi.hoisted(() => ({
  toast: vi.fn(),
}));

vi.mock('@/hooks/useFinanceStore', () => financeStoreMock);
vi.mock('@/hooks/useFeatureFlags', () => featureFlagsMock);
vi.mock('@/components/ui/use-toast', () => toastMock);
vi.mock('@/hooks/useAccountMutations', () => ({
  useTransferBetweenAccounts: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock('@/hooks/useTransactionMutations', () => ({
  useAddTransaction: () => ({ mutateAsync: vi.fn() }),
}));

describe('AccountsManager - limite Free', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    featureFlagsMock.useFeatureFlag.mockReturnValue(false);
    financeStoreMock.useFinanceStore.mockReturnValue({
      viewDate: new Date(2026, 3, 15),
      currentMonthTransactions: [],
      categories: [{ id: 'cat-1', name: 'Ajuste', type: 'income' }],
    });
  });

  it('bloqueia a abertura do formulario ao atingir 2 contas sem unlimited_accounts', () => {
    render(
      <AccountsManager
        accounts={[
          {
            id: 'acc-1',
            userId: 'user-1',
            name: 'Conta 1',
            bank: 'Banco 1',
            institution: 'Banco 1',
            balance: 100,
            color: '#111111',
            accountType: 'corrente',
            hasOverdraft: false,
            overdraftLimit: 0,
          },
          {
            id: 'acc-2',
            userId: 'user-1',
            name: 'Conta 2',
            bank: 'Banco 2',
            institution: 'Banco 2',
            balance: 200,
            color: '#222222',
            accountType: 'corrente',
            hasOverdraft: false,
            overdraftLimit: 0,
          },
        ]}
        onAddAccount={vi.fn()}
        onUpdateAccount={vi.fn()}
        onDeleteAccount={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /adicionar conta/i }));

    expect(screen.queryByText('Nova Conta')).not.toBeInTheDocument();
    expect(toastMock.toast).toHaveBeenCalledWith({
      title: 'Limite do plano Free atingido',
      description: 'Você pode cadastrar até 2 contas/carteiras no plano Free. Para adicionar mais, libere contas ilimitadas.',
    });
  });
});
