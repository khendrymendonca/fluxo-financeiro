import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DebtsManager } from '@/components/debts/DebtsManager';

const financeStoreMock = vi.hoisted(() => ({
  useFinanceStore: vi.fn(),
}));

vi.mock('@/hooks/useFinanceStore', () => financeStoreMock);

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
});
