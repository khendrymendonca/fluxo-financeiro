import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { BudgetOverview } from '@/components/budgets/BudgetOverview';
import { TRACKED_BUDGET_CATEGORIES_KEY_PREFIX } from '@/utils/trackedBudgetCategories';

const category = (overrides: any) => ({
  id: 'cat-1',
  name: 'Category 1',
  type: 'expense',
  isActive: true,
  budgetLimit: null,
  userId: 'user-1',
  ...overrides
});

const transaction = (overrides: any) => ({
  id: 'tx-1',
  amount: 100,
  type: 'expense',
  date: '2026-05-10',
  isPaid: true,
  userId: 'user-1',
  ...overrides
});

describe('BudgetOverview Visibility Bug', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function expandBudgets() {
    fireEvent.click(screen.getByRole('button', { name: /Orçamentos/i }));
  }

  it('SHOULD NOT show untracked categories even if they have movement', async () => {
    const categories = [
      category({ id: 'energy', name: 'Energia', budgetLimit: 100 }), // Auto-tracked at first
      category({ id: 'food', name: 'Alimentacao', budgetLimit: null }), // Not auto-tracked
    ];
    
    const transactions = [
      transaction({ categoryId: 'food', amount: 200 })
    ];

    const { rerender } = render(
      <BudgetOverview
        viewDate={new Date(2026, 4, 1)}
        period="month"
        reportMode="realized"
        periodIncome={5000}
        categories={categories}
        transactions={transactions}
      />
    );

    expandBudgets();
    // Initial state: Energia is auto-tracked (has limit), Alimentacao is not.
    const rows = within(screen.getByTestId('budget-rows-container'));
    expect(rows.getByText('Energia')).toBeInTheDocument();
    expect(rows.queryByText('Alimentacao')).not.toBeInTheDocument();

    // Untrack Energia
    fireEvent.click(screen.getByRole('button', { name: /Gerenciar categorias acompanhadas/i }));
    fireEvent.click(screen.getByLabelText('Acompanhar Energia'));
    
    // Close modal (dialog) - not strictly needed for state update in this component
    
    // NOW Energia should be gone, even with budget limit.
    await waitFor(() => {
      expect(rows.queryByText('Energia')).not.toBeInTheDocument();
    });

    // Track Alimentacao
    fireEvent.click(screen.getByLabelText('Acompanhar Alimentacao'));
    await waitFor(() => {
      expect(rows.getByText('Alimentacao')).toBeInTheDocument();
    });
  });

  it('preserves untracked state after reload even if category has budgetLimit', () => {
    const userKey = 'user-1';
    const storageKey = `${TRACKED_BUDGET_CATEGORIES_KEY_PREFIX}:${userKey}`;
    
    // User explicitly untracked 'energy'
    localStorage.setItem(storageKey, JSON.stringify({
      initialized: true,
      trackedCategoryIds: []
    }));

    const categories = [
      category({ id: 'energy', name: 'Energia', budgetLimit: 100, userId: 'user-1' }),
    ];

    render(
      <BudgetOverview
        viewDate={new Date(2026, 4, 1)}
        period="month"
        reportMode="realized"
        periodIncome={5000}
        categories={categories}
        transactions={[]}
      />
    );

    expandBudgets();
    // Should NOT show Energia because it was explicitly untracked
    expect(screen.queryByText('Energia')).not.toBeInTheDocument();
  });
});
