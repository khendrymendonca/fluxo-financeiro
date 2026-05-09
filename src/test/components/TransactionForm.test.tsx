import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TransactionForm } from '@/components/transactions/TransactionForm';

const financeStoreMock = vi.hoisted(() => ({
  useFinanceStore: vi.fn(),
}));

vi.mock('@/hooks/useFinanceStore', () => financeStoreMock);

vi.mock('@/components/ui/use-toast', () => ({
  toast: vi.fn(),
}));

describe('TransactionForm - parcelamento no cartao', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    financeStoreMock.useFinanceStore.mockReturnValue({
      categories: [{ id: 'cat-1', name: 'Tecnologia', type: 'expense' }],
      subcategories: [],
      transferBetweenAccounts: vi.fn(),
      getAccountViewBalance: vi.fn(() => 0),
      getCardExpenses: vi.fn(() => 0),
      isAddingTransaction: false,
      isUpdatingTransaction: false,
      isTransferring: false,
    });
  });

  it('abre compra parcelada no cartao em modo de correcao assistida do grupo inteiro', async () => {
    const onSubmit = vi.fn(async () => undefined);

    render(
      <TransactionForm
        accounts={[]}
        creditCards={[
          {
            id: 'card-1',
            userId: 'user-1',
            name: 'Cartao teste',
            bank: 'Banco A',
            color: '#222222',
            limit: 5000,
            dueDay: 10,
            closingDay: 15,
            institution: 'Banco A',
          } as any,
        ]}
        initialData={{
          id: 'inst-card-1',
          userId: 'user-1',
          description: 'Notebook (1/10)',
          amount: 300,
          type: 'expense',
          transactionType: 'installment',
          date: '2026-04-20',
          isPaid: true,
          paymentDate: '2026-04-20',
          cardId: 'card-1',
          categoryId: 'cat-1',
          installmentGroupId: 'group-card-1',
          installmentNumber: 1,
          installmentTotal: 10,
          invoiceMonthYear: '2026-04',
        }}
        onSubmit={onSubmit}
        onClose={vi.fn()}
      />
    );

    expect(screen.getAllByText('Corrigir compra parcelada')).toHaveLength(2);
    expect(screen.getByText('Esta compra foi parcelada no cartão. A correção será aplicada ao grupo inteiro para manter fatura e limite coerentes.')).toBeInTheDocument();
    expect(screen.getByText('Todas as parcelas desta compra')).toBeInTheDocument();
    expect(screen.queryByText('Somente este lançamento')).not.toBeInTheDocument();
    expect(screen.queryByText('Este e todos os futuros')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Corrigir compra parcelada' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionType: 'installment',
          installmentGroupId: 'group-card-1',
          installmentNumber: 1,
          installmentTotal: 10,
          invoiceMonthYear: '2026-06',
          cardId: 'card-1',
        }),
        undefined,
        'all'
      );
    });
  });
});

describe('TransactionForm - correcao de transferencia', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    financeStoreMock.useFinanceStore.mockReturnValue({
      categories: [{ id: 'cat-1', name: 'Transferencia', type: 'expense' }],
      subcategories: [],
      transferBetweenAccounts: vi.fn(),
      getAccountViewBalance: vi.fn(() => 1000),
      getCardExpenses: vi.fn(() => 0),
      isAddingTransaction: false,
      isUpdatingTransaction: false,
      isTransferring: false,
    });
  });

  it('abre transferencia em modo de correcao e nao como lancamento pontual comum', async () => {
    const onSubmit = vi.fn(async () => undefined);

    render(
      <TransactionForm
        accounts={[
          {
            id: 'acc-origin',
            userId: 'user-1',
            name: 'Origem',
            bank: 'Banco A',
            institution: 'Banco A',
            balance: 1000,
            color: '#111111',
            accountType: 'corrente',
          } as any,
          {
            id: 'acc-dest',
            userId: 'user-1',
            name: 'Destino',
            bank: 'Banco B',
            institution: 'Banco B',
            balance: 500,
            color: '#222222',
            accountType: 'poupanca',
          } as any,
        ]}
        creditCards={[]}
        initialData={{
          id: 'tx-out',
          userId: 'user-1',
          description: '[Saída] Reserva',
          amount: 500,
          type: 'expense',
          transactionType: 'punctual',
          date: '2026-04-10',
          isPaid: true,
          paymentDate: '2026-04-10',
          accountId: 'acc-origin',
          isTransfer: true,
          transferGroupId: 'group-1',
          transferCounterpart: {
            id: 'tx-in',
            userId: 'user-1',
            description: '[Entrada] Reserva',
            amount: 500,
            type: 'income',
            transactionType: 'punctual',
            date: '2026-04-10',
            isPaid: true,
            paymentDate: '2026-04-10',
            accountId: 'acc-dest',
            isTransfer: true,
            transferGroupId: 'group-1',
          },
        } as any}
        onSubmit={onSubmit}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Transferência')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Corrigir transferência' })).toBeInTheDocument();
    expect(screen.queryByText('Lançamento Pontual')).not.toBeInTheDocument();
    expect(screen.queryByText('Categoria')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Reserva')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Corrigir transferência' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionType: 'punctual',
          description: 'Reserva',
          transferDescription: 'Reserva',
          amount: 500,
          date: '2026-04-10',
          accountId: 'acc-origin',
          transferFrom: 'acc-origin',
          transferTo: 'acc-dest',
          transferToType: 'account',
          isPaid: true,
          paymentDate: '2026-04-10',
          isTransfer: true,
          transferGroupId: 'group-1',
        }),
        undefined,
        'this'
      );
    });
  });
});
