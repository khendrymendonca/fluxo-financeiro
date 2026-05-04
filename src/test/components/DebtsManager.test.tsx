import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DebtsManager } from '@/components/debts/DebtsManager';

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

vi.mock('@/hooks/useDebtMutations', () => ({
  useRenegotiateDebt: () => ({ mutateAsync: vi.fn() }),
}));

const baseDebt = {
  id: 'debt-1',
  userId: 'user-1',
  name: 'Acordo banco',
  totalAmount: 1000,
  remainingAmount: 1000,
  installmentAmount: 100,
  interestRateMonthly: 0,
  startDate: '2026-04-10',
  dueDay: 10,
  status: 'renegotiated' as const,
  totalInstallments: 2,
  debtType: 'agreement' as const,
};

function buildInstallment(id: string, isPaid: boolean) {
  return {
    id,
    userId: 'user-1',
    description: `Acordo banco ${id}`,
    amount: 100,
    type: 'expense' as const,
    transactionType: 'installment' as const,
    date: id === 'tx-1' ? '2026-04-10' : '2026-05-10',
    isPaid,
    paymentDate: isPaid ? '2026-04-10' : null,
    debtId: 'debt-1',
    installmentNumber: id === 'tx-1' ? 1 : 2,
    installmentTotal: 2,
    isVirtual: false,
  };
}

describe('DebtsManager - acordos em pagamento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    featureFlagsMock.useFeatureFlag.mockReturnValue(true);
  });

  it('reflete parcela paga e recalcula os valores do acordo', () => {
    financeStoreMock.useFinanceStore.mockReturnValue({
      transactions: [
        buildInstallment('tx-1', true),
        buildInstallment('tx-2', false),
      ],
    });

    render(
      <DebtsManager
        debts={[baseDebt]}
        onAddDebt={vi.fn()}
        onUpdateDebt={vi.fn()}
        onDeleteDebt={vi.fn()}
      />
    );

    expect(screen.getByText(/1\/2 pagas/)).toBeInTheDocument();
    expect(screen.getByText(/Parcela 2\/2/)).toBeInTheDocument();
    expect(screen.getByText('Pago: R$ 100,00')).toBeInTheDocument();
    expect(screen.getByText('Restante: R$ 100,00')).toBeInTheDocument();
  });

  it('reflete estorno da parcela e volta o acordo para o estado pendente correto', () => {
    const currentStore = {
      transactions: [
        buildInstallment('tx-1', true),
        buildInstallment('tx-2', false),
      ],
    };

    financeStoreMock.useFinanceStore.mockImplementation(() => currentStore);

    const view = render(
      <DebtsManager
        debts={[baseDebt]}
        onAddDebt={vi.fn()}
        onUpdateDebt={vi.fn()}
        onDeleteDebt={vi.fn()}
      />
    );

    currentStore.transactions = [
      buildInstallment('tx-1', false),
      buildInstallment('tx-2', false),
    ];

    view.rerender(
      <DebtsManager
        debts={[baseDebt]}
        onAddDebt={vi.fn()}
        onUpdateDebt={vi.fn()}
        onDeleteDebt={vi.fn()}
      />
    );

    expect(screen.getByText(/0\/2 pagas/)).toBeInTheDocument();
    expect(screen.getByText(/Parcela 1\/2/)).toBeInTheDocument();
    expect(screen.getByText('Pago: R$ 0,00')).toBeInTheDocument();
    expect(screen.getByText('Restante: R$ 200,00')).toBeInTheDocument();
  });

  it('bloqueia a abertura do formulario ao atingir o limite Free sem unlimited_debts', () => {
    featureFlagsMock.useFeatureFlag.mockReturnValue(false);

    financeStoreMock.useFinanceStore.mockReturnValue({
      transactions: [],
    });

    render(
      <DebtsManager
        debts={[
          { ...baseDebt, id: 'debt-1' },
          { ...baseDebt, id: 'debt-2', name: 'Acordo 2' },
          { ...baseDebt, id: 'debt-3', name: 'Acordo 3' },
        ]}
        onAddDebt={vi.fn()}
        onUpdateDebt={vi.fn()}
        onDeleteDebt={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /adicionar acordo/i }));

    expect(screen.queryByText('Novo Acordo')).not.toBeInTheDocument();
    expect(toastMock.toast).toHaveBeenCalledWith({
      title: 'Limite do plano Free atingido',
      description: 'Você pode cadastrar até 3 dívidas/acordos no plano Free. Para adicionar mais, libere dívidas ilimitadas.',
    });
  });
});
