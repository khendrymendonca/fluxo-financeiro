import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { BudgetOverview } from '@/components/budgets/BudgetOverview';
import { Category, Transaction } from '@/types/finance';
import { getTrackedBudgetCategoriesStorageKey } from '@/utils/trackedBudgetCategories';

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
    icon: overrides.icon ?? 'Tag',
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
    isInvoicePayment: overrides.isInvoicePayment,
    isTransfer: overrides.isTransfer,
  };
}

describe('BudgetOverview', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function expandBudgets() {
    fireEvent.click(screen.getByRole('button', { name: /Orçamentos/i }));
  }

  it('inicia recolhido por padrao e alterna expandir/recolher', () => {
    render(
      <BudgetOverview
        viewDate={new Date(2026, 4, 1)}
        period="month"
        reportMode="projected"
        periodIncome={4000}
        categories={[category({ id: 'food', name: 'Alimentacao', budgetLimit: 800, icon: 'UtensilsCrossed' })]}
        transactions={[transaction({ categoryId: 'food', amount: 200 })]}
      />
    );

    expect(screen.queryByTestId('budget-rows-container')).not.toBeInTheDocument();
    expect(screen.queryByText('Planejado')).not.toBeInTheDocument();
    expect(screen.queryByText(/RECOLHIDO POR PADRÃO/i)).not.toBeInTheDocument();

    expandBudgets();
    expect(screen.getByTestId('budget-rows-container')).toBeInTheDocument();
    expect(screen.getByText('Planejado')).toBeInTheDocument();

    expandBudgets();
    expect(screen.queryByTestId('budget-rows-container')).not.toBeInTheDocument();
  });

  it('permite escolher explicitamente categorias acompanhadas e persiste no localStorage', () => {
    render(
      <BudgetOverview
        viewDate={new Date(2026, 4, 1)}
        period="month"
        reportMode="projected"
        periodIncome={4000}
        categories={[
          category({ id: 'energy', name: 'Energia', budgetLimit: null, icon: 'Zap' }),
          category({ id: 'food', name: 'Alimentacao', budgetLimit: 800, icon: 'UtensilsCrossed' }),
        ]}
        transactions={[transaction({ categoryId: 'food', amount: 200 })]}
      />
    );

    expandBudgets();
    expect(screen.queryByText('Energia')).not.toBeInTheDocument();
    expect(screen.getByText('Alimentacao')).toBeInTheDocument();
    expect(screen.queryByText(/Algumas categorias com movimento/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Gerenciar categorias acompanhadas/i }));
    fireEvent.click(screen.getByLabelText('Acompanhar Energia'));

    expect(screen.getAllByText('Energia').length).toBeGreaterThan(0);
    expect(localStorage.getItem(getTrackedBudgetCategoriesStorageKey('user-1'))).toBe(JSON.stringify({ initialized: true, trackedCategoryIds: ['food', 'energy'] }));
  });

  it('mostra icone da categoria na linha acompanhada', () => {
    render(
      <BudgetOverview
        viewDate={new Date(2026, 4, 1)}
        period="month"
        reportMode="projected"
        periodIncome={4000}
        categories={[category({ id: 'home', name: 'Moradia', budgetLimit: 1200, icon: 'Home' })]}
        transactions={[]}
      />
    );

    expandBudgets();
    const row = screen.getByText('Moradia').closest('.rounded-2xl');
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getByText('Moradia')).toBeInTheDocument();
  });

  it('calcula tetos por agrupamento com base no percentual da receita do periodo', () => {
    // Setup initial local storage for budget groups
    localStorage.setItem('fluxo_budget_groups:test-user', JSON.stringify([
      { id: 'group-essencial', name: 'Essencial', budgetPercent: 25, color: '#000000' }
    ]));
    localStorage.setItem('fluxo_category_group_assignments:test-user', JSON.stringify({
      'cat-moradia': 'group-essencial',
      'cat-saude': 'group-essencial'
    }));

    render(
      <BudgetOverview
        viewDate={new Date(2026, 4, 1)}
        period="month"
        reportMode="projected"
        periodIncome={4000} // 25% = 1000
        categories={[
          category({ id: 'cat-moradia', name: 'Moradia', budgetLimit: null }),
          category({ id: 'cat-saude', name: 'Saude', budgetLimit: null }),
        ]}
        transactions={[
          transaction({ categoryId: 'cat-moradia', amount: 700 }),
          transaction({ categoryId: 'cat-saude', amount: 200 }),
          transaction({ categoryId: 'cat-saude', amount: 200, isInvoicePayment: true }), // should be ignored
          transaction({ categoryId: 'cat-moradia', amount: 50, isTransfer: true }), // ignored
        ]}
      />
    );

    expandBudgets();
    // Switch to group view
    fireEvent.click(screen.getByRole('button', { name: 'Por Agrupamento' }));

    expect(screen.getByText('Essencial')).toBeInTheDocument();
    
    // Teto = 1000
    expect(screen.getAllByText('R$ 1.000,00').length).toBeGreaterThan(0);
    // Consumo = 900 (700 + 200)
    expect(screen.getAllByText('R$ 900,00').length).toBeGreaterThan(0);
    // Uso = 90%
    expect(screen.getByText('90%')).toBeInTheDocument();
    // Disponível = 100
    expect(screen.getAllByText('R$ 100,00').length).toBeGreaterThan(0);
    // Status
    expect(screen.getByText('Atenção')).toBeInTheDocument();
  });

});
