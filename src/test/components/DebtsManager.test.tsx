import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DebtsManager } from '@/components/debts/DebtsManager';

const financeStoreMock = vi.hoisted(() => ({
  useFinanceStore: vi.fn(),
}));

const featureFlagsMock = vi.hoisted(() => ({
  useFeatureFlag: vi.fn(),
  usePlanLimits: vi.fn(() => ({ data: { accounts_limit: -1, cards_limit: -1, debts_limit: -1 } })),
}));

const toastMock = vi.hoisted(() => ({
  toast: vi.fn(),
}));

vi.mock('@/hooks/useFinanceStore', () => financeStoreMock);
vi.mock('@/hooks/useFeatureFlags', () => featureFlagsMock);
vi.mock('@/components/ui/use-toast', () => toastMock);
vi.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, id }: any) => (
    <button
      type="button"
      aria-label={id === 'agreement-entry-toggle' ? 'Tem entrada?' : 'Entrada paga no ato?'}
      aria-pressed={checked}
      onClick={() => onCheckedChange?.(!checked)}
    />
  ),
}));

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
    description: `Parcela ${id === 'tx-1' ? 1 : 2}/2 acordo Acordo banco`,
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

function buildEntryTransaction(isPaid: boolean) {
  return {
    id: 'entry-1',
    userId: 'user-1',
    description: 'Entrada acordo Acordo banco',
    amount: 79.6,
    type: 'expense' as const,
    transactionType: isPaid ? 'punctual' as const : 'adjustment' as const,
    date: '2026-04-05',
    isPaid,
    paymentDate: isPaid ? '2026-04-05' : null,
    debtId: 'debt-1',
    accountId: isPaid ? 'acc-1' : null,
    installmentNumber: null,
    installmentTotal: null,
    isVirtual: false,
  };
}

function buildStore(transactions: any[] = []) {
  return {
    transactions,
    accounts: [{ id: 'acc-1', name: 'Conta principal' }],
  };
}

function openNewAgreement() {
  fireEvent.click(screen.getByRole('button', { name: /adicionar acordo/i }));
}

function getAgreementInputs() {
  return {
    name: screen.getByLabelText('Nome/Descrição') as HTMLInputElement,
    installmentAmount: screen.getByLabelText('Parcela do Acordo (R$)') as HTMLInputElement,
    totalInstallments: screen.getByLabelText('Nº de Parcelas') as HTMLInputElement,
    firstInstallmentDate: screen.getByLabelText('Data da 1ª Parcela') as HTMLInputElement,
    dueDay: screen.getByLabelText('Dia de Vencimento') as HTMLInputElement,
  };
}

describe('DebtsManager - acordos em pagamento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    featureFlagsMock.useFeatureFlag.mockReturnValue(true);
  });

  it('reflete parcela paga e recalcula os valores do acordo', () => {
    financeStoreMock.useFinanceStore.mockReturnValue(buildStore([
      buildInstallment('tx-1', true),
      buildInstallment('tx-2', false),
    ]));

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

  it('não conta a entrada como parcela do acordo', () => {
    financeStoreMock.useFinanceStore.mockReturnValue(buildStore([
      buildEntryTransaction(true),
      buildInstallment('tx-1', false),
      buildInstallment('tx-2', false),
    ]));

    render(
      <DebtsManager
        debts={[{ ...baseDebt, totalAmount: 279.6, remainingAmount: 200 }]}
        onAddDebt={vi.fn()}
        onUpdateDebt={vi.fn()}
        onDeleteDebt={vi.fn()}
      />
    );

    expect(screen.getByText(/0\/2 pagas/)).toBeInTheDocument();
    expect(screen.getByText(/Parcela 1\/2/)).toBeInTheDocument();
    expect(screen.getByText('Pago: R$ 79,60')).toBeInTheDocument();
    expect(screen.getByText('Restante: R$ 200,00')).toBeInTheDocument();
  });

  it('reflete estorno da parcela e volta o acordo para o estado pendente correto', () => {
    const currentStore = buildStore([
      buildInstallment('tx-1', true),
      buildInstallment('tx-2', false),
    ]);

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

  it('permite cadastrar acordo com entrada e total calculado', () => {
    const onAddDebt = vi.fn();
    financeStoreMock.useFinanceStore.mockReturnValue(buildStore());

    render(
      <DebtsManager
        debts={[]}
        onAddDebt={onAddDebt}
        onUpdateDebt={vi.fn()}
        onDeleteDebt={vi.fn()}
      />
    );

    openNewAgreement();
    fireEvent.change(screen.getByPlaceholderText('Ex: Acordo banco'), { target: { value: 'Acordo real' } });
    fireEvent.click(screen.getByLabelText('Tem entrada?'));
    fireEvent.change(screen.getByLabelText('Valor da Entrada (R$)'), { target: { value: '79.60' } });
    fireEvent.change(screen.getByLabelText('Data da Entrada'), { target: { value: '2026-05-22' } });
    fireEvent.click(screen.getByLabelText('Entrada paga no ato?'));
    fireEvent.change(screen.getByLabelText('Conta/Carteira da Entrada'), { target: { value: 'acc-1' } });
    fireEvent.change(screen.getByLabelText('Parcela do Acordo (R$)'), { target: { value: '90.39' } });
    fireEvent.change(screen.getByLabelText('Nº de Parcelas'), { target: { value: '11' } });
    fireEvent.change(screen.getByLabelText('Data da 1ª Parcela'), { target: { value: '2026-06-22' } });
    fireEvent.change(screen.getByLabelText('Dia de Vencimento'), { target: { value: '10' } });

    expect(screen.getByText('R$ 79,60 + 11x de R$ 90,39 = R$ 1.073,89')).toBeInTheDocument();

    fireEvent.submit(screen.getAllByRole('button', { name: /adicionar acordo/i })[1].closest('form')!);

    expect(onAddDebt).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Acordo real',
      totalAmount: 1073.89,
      remainingAmount: 994.29,
      installmentAmount: 90.39,
      totalInstallments: 11,
      status: 'renegotiated',
      entryAmount: 79.6,
      entryDate: '2026-05-22',
      entryIsPaid: true,
      entryAccountId: 'acc-1',
      startDate: '2026-06-22',
    }));
  });

  it('abre Novo Acordo com formulário limpo e sem valores herdados', () => {
    financeStoreMock.useFinanceStore.mockReturnValue(buildStore());

    render(
      <DebtsManager
        debts={[]}
        onAddDebt={vi.fn()}
        onUpdateDebt={vi.fn()}
        onDeleteDebt={vi.fn()}
      />
    );

    openNewAgreement();

    const { name, installmentAmount, totalInstallments, firstInstallmentDate, dueDay } = getAgreementInputs();

    expect(screen.getByText('Novo Acordo')).toBeInTheDocument();
    expect(name.value).toBe('');
    expect(installmentAmount.value).toBe('');
    expect(totalInstallments.value).toBe('');
    expect(firstInstallmentDate.value).toBe('');
    expect(dueDay.value).toBe('');
    expect(screen.getAllByText(/R\$\s*0,00/).length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Tem entrada?')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByDisplayValue('90.39')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('11')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('Inter')).not.toBeInTheDocument();
  });

  it('abre edição com os dados reais do acordo existente', () => {
    financeStoreMock.useFinanceStore.mockReturnValue(buildStore([
      {
        ...buildEntryTransaction(true),
        description: 'Entrada acordo Inter',
        debtId: 'debt-inter',
      },
    ]));

    render(
      <DebtsManager
        debts={[{
          ...baseDebt,
          id: 'debt-inter',
          name: 'Inter',
          installmentAmount: 90.39,
          totalInstallments: 11,
          startDate: '2026-05-19',
          dueDay: 10,
        }]}
        onAddDebt={vi.fn()}
        onUpdateDebt={vi.fn()}
        onDeleteDebt={vi.fn()}
      />
    );

    fireEvent.click(screen.getAllByTitle('Editar')[0]);

    const { name, installmentAmount, totalInstallments, firstInstallmentDate, dueDay } = getAgreementInputs();

    expect(screen.getByText('Editar Acordo')).toBeInTheDocument();
    expect(name.value).toBe('Inter');
    expect(installmentAmount.value).toBe('90.39');
    expect(totalInstallments.value).toBe('11');
    expect(firstInstallmentDate.value).toBe('2026-05-19');
    expect(dueDay.value).toBe('10');
    expect(screen.getByLabelText('Tem entrada?')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Valor da Entrada (R$)')).toHaveValue(79.6);
    expect(screen.getByLabelText('Data da Entrada')).toHaveValue('2026-04-05');
  });

  it('editar e depois criar novo não herda dados da edição anterior', () => {
    financeStoreMock.useFinanceStore.mockReturnValue(buildStore([
      {
        ...buildEntryTransaction(true),
        description: 'Entrada acordo Inter',
        debtId: 'debt-inter',
      },
    ]));

    render(
      <DebtsManager
        debts={[{
          ...baseDebt,
          id: 'debt-inter',
          name: 'Inter',
          installmentAmount: 90.39,
          totalInstallments: 11,
          startDate: '2026-05-19',
          dueDay: 10,
        }]}
        onAddDebt={vi.fn()}
        onUpdateDebt={vi.fn()}
        onDeleteDebt={vi.fn()}
      />
    );

    fireEvent.click(screen.getAllByTitle('Editar')[0]);
    expect((screen.getByLabelText('Nome/Descrição') as HTMLInputElement).value).toBe('Inter');

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    openNewAgreement();

    const { name, installmentAmount, totalInstallments, firstInstallmentDate, dueDay } = getAgreementInputs();

    expect(screen.getByText('Novo Acordo')).toBeInTheDocument();
    expect(name.value).toBe('');
    expect(installmentAmount.value).toBe('');
    expect(totalInstallments.value).toBe('');
    expect(firstInstallmentDate.value).toBe('');
    expect(dueDay.value).toBe('');
    expect(screen.getByLabelText('Tem entrada?')).toHaveAttribute('aria-pressed', 'false');
  });

  it('fechar e reabrir Novo Acordo mantém o formulário limpo', () => {
    financeStoreMock.useFinanceStore.mockReturnValue(buildStore());

    render(
      <DebtsManager
        debts={[]}
        onAddDebt={vi.fn()}
        onUpdateDebt={vi.fn()}
        onDeleteDebt={vi.fn()}
      />
    );

    openNewAgreement();
    fireEvent.change(screen.getByLabelText('Nome/Descrição'), { target: { value: 'Inter' } });
    fireEvent.change(screen.getByLabelText('Parcela do Acordo (R$)'), { target: { value: '90.39' } });
    fireEvent.change(screen.getByLabelText('Nº de Parcelas'), { target: { value: '11' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    openNewAgreement();

    const { name, installmentAmount, totalInstallments } = getAgreementInputs();
    expect(name.value).toBe('');
    expect(installmentAmount.value).toBe('');
    expect(totalInstallments.value).toBe('');
    expect(screen.queryByDisplayValue('Inter')).not.toBeInTheDocument();
  });

  it('renderiza os textos corretos e mantém área rolável no formulário', () => {
    financeStoreMock.useFinanceStore.mockReturnValue(buildStore());

    render(
      <DebtsManager
        debts={[]}
        onAddDebt={vi.fn()}
        onUpdateDebt={vi.fn()}
        onDeleteDebt={vi.fn()}
      />
    );

    openNewAgreement();
    fireEvent.click(screen.getByLabelText('Tem entrada?'));

    expect(screen.getByText('Nome/Descrição')).toBeInTheDocument();
    expect(screen.getByText('A entrada é separada das parcelas do acordo.')).toBeInTheDocument();
    expect(screen.getByText('Nº de Parcelas')).toBeInTheDocument();
    expect(screen.getByText('Data da 1ª Parcela')).toBeInTheDocument();
    expect(screen.getByTestId('agreement-modal-body')).toHaveClass('overflow-y-auto');
  });

  it('bloqueia a abertura do formulário ao atingir o limite Free sem unlimited_debts', () => {
    featureFlagsMock.useFeatureFlag.mockReturnValue(false);
    featureFlagsMock.usePlanLimits.mockReturnValue({ data: { accounts_limit: 2, cards_limit: 1, debts_limit: 3 } });
    financeStoreMock.useFinanceStore.mockReturnValue(buildStore());

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

    openNewAgreement();

    expect(screen.queryByText('Novo Acordo')).not.toBeInTheDocument();
    expect(toastMock.toast).toHaveBeenCalledWith({
      title: 'Limite de dívidas atingido',
      description: 'Seu plano atual permite cadastrar até 3 dívidas/acordos. Faça o upgrade para adicionar mais.',
      variant: 'destructive',
    });
  });
});
