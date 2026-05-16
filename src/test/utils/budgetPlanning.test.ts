import { describe, expect, it } from 'vitest';
import { buildMonthlyCategoryBudgets } from '@/utils/budgetPlanning';
import { Category, Transaction } from '@/types/finance';

function category(overrides: Partial<Category>): Category {
  return {
    id: overrides.id ?? 'cat-1',
    userId: 'user-1',
    groupId: 'group-1',
    name: overrides.name ?? 'Categoria',
    type: overrides.type ?? 'expense',
    budgetGroup: overrides.budgetGroup ?? 'lifestyle',
    isActive: true,
    budgetLimit: overrides.budgetLimit ?? null,
    color: overrides.color ?? '#0d9488',
  };
}

function transaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: overrides.id ?? 'tx-1',
    userId: 'user-1',
    type: overrides.type ?? 'expense',
    transactionType: overrides.transactionType ?? 'punctual',
    description: overrides.description ?? 'Transacao',
    amount: overrides.amount ?? 0,
    date: overrides.date ?? '2026-05-10',
    isPaid: overrides.isPaid ?? false,
    categoryId: overrides.categoryId,
    cardId: overrides.cardId,
    invoiceMonthYear: overrides.invoiceMonthYear,
    isInvoicePayment: overrides.isInvoicePayment,
    isTransfer: overrides.isTransfer,
    isRecurring: overrides.isRecurring,
    isVirtual: overrides.isVirtual,
    deleted_at: overrides.deleted_at,
  };
}

describe('budgetPlanning', () => {
  it('calcula planejado x realizado e saldo disponivel por categoria', () => {
    const result = buildMonthlyCategoryBudgets({
      month: new Date(2026, 4, 1),
      categories: [category({ id: 'food', name: 'Alimentacao', budgetLimit: 800 })],
      transactions: [transaction({ categoryId: 'food', amount: 620 })],
    });

    expect(result.totalPlanned).toBe(800);
    expect(result.totalRealized).toBe(620);
    expect(result.rows[0]).toMatchObject({
      categoryName: 'Alimentacao',
      planned: 800,
      realized: 620,
      difference: 180,
      status: 'within',
    });
    expect(result.rows[0].usagePercent).toBeCloseTo(77.5);
  });

  it('marca categoria estourada e calcula excedente', () => {
    const result = buildMonthlyCategoryBudgets({
      month: new Date(2026, 4, 1),
      categories: [category({ id: 'market', name: 'Mercado', budgetLimit: 700 })],
      transactions: [transaction({ categoryId: 'market', amount: 920 })],
    });

    expect(result.rows[0]).toMatchObject({
      categoryName: 'Mercado',
      planned: 700,
      realized: 920,
      difference: -220,
      status: 'over',
    });
    expect(result.rows[0].usagePercent).toBeCloseTo(131.4285);
  });

  it('inclui compra no cartao na categoria da compra', () => {
    const result = buildMonthlyCategoryBudgets({
      month: new Date(2026, 4, 1),
      categories: [category({ id: 'food', name: 'Alimentacao', budgetLimit: 800 })],
      transactions: [
        transaction({
          categoryId: 'food',
          amount: 300,
          cardId: 'card-1',
          invoiceMonthYear: '2026-06',
          date: '2026-05-15',
        }),
      ],
    });

    expect(result.rows[0].realized).toBe(300);
  });

  it('ignora pagamento de fatura no orcamento por categoria', () => {
    const result = buildMonthlyCategoryBudgets({
      month: new Date(2026, 4, 1),
      categories: [category({ id: 'food', name: 'Alimentacao', budgetLimit: 800 })],
      transactions: [
        transaction({
          categoryId: 'food',
          amount: 1000,
          cardId: 'card-1',
          isInvoicePayment: true,
          invoiceMonthYear: '2026-05',
        }),
      ],
    });

    expect(result.rows[0].realized).toBe(0);
  });

  it('nao duplica compra no cartao com pagamento de fatura', () => {
    const result = buildMonthlyCategoryBudgets({
      month: new Date(2026, 4, 1),
      categories: [category({ id: 'food', name: 'Alimentacao', budgetLimit: 800 })],
      transactions: [
        transaction({ id: 'purchase', categoryId: 'food', amount: 300, cardId: 'card-1' }),
        transaction({ id: 'invoice', categoryId: 'food', amount: 300, cardId: 'card-1', isInvoicePayment: true }),
      ],
    });

    expect(result.rows[0].realized).toBe(300);
  });

  it('ignora transferencia, receita e despesa deletada', () => {
    const result = buildMonthlyCategoryBudgets({
      month: new Date(2026, 4, 1),
      categories: [category({ id: 'food', name: 'Alimentacao', budgetLimit: 800 })],
      transactions: [
        transaction({ id: 'transfer', categoryId: 'food', amount: 100, isTransfer: true }),
        transaction({ id: 'income', type: 'income', categoryId: 'food', amount: 200 }),
        transaction({ id: 'deleted', categoryId: 'food', amount: 300, deleted_at: '2026-05-11T00:00:00Z' }),
      ],
    });

    expect(result.rows[0].realized).toBe(0);
  });

  it('inclui recorrente projetada no mes correto', () => {
    const result = buildMonthlyCategoryBudgets({
      month: new Date(2026, 5, 1),
      categories: [category({ id: 'home', name: 'Moradia', budgetLimit: 1200 })],
      transactions: [
        transaction({
          id: 'rent-virtual',
          categoryId: 'home',
          amount: 1200,
          date: '2026-06-05',
          isRecurring: true,
          isVirtual: true,
        }),
      ],
    });

    expect(result.rows[0].realized).toBe(1200);
  });

  it('exibe categoria movimentada sem orcamento como sem orcamento definido', () => {
    const result = buildMonthlyCategoryBudgets({
      month: new Date(2026, 4, 1),
      categories: [category({ id: 'leisure', name: 'Lazer', budgetLimit: null })],
      transactions: [transaction({ categoryId: 'leisure', amount: 150 })],
    });

    expect(result.rows[0]).toMatchObject({
      categoryName: 'Lazer',
      planned: 0,
      realized: 150,
      status: 'unplanned',
    });
  });
});
