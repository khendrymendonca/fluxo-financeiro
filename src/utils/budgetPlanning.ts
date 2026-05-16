import { format } from 'date-fns';
import { Category, Transaction } from '@/types/finance';
import { parseLocalDate } from '@/utils/dateUtils';

export type BudgetStatus = 'within' | 'warning' | 'over' | 'unplanned';

export interface CategoryBudgetRow {
  categoryId: string;
  categoryName: string;
  categoryColor?: string;
  planned: number;
  realized: number;
  difference: number;
  usagePercent: number;
  status: BudgetStatus;
}

export interface MonthlyBudgetSummary {
  totalPlanned: number;
  totalRealized: number;
  remaining: number;
  usagePercent: number;
  rows: CategoryBudgetRow[];
}

function isBudgetExpense(transaction: Transaction, targetMonthKey: string) {
  if (transaction.type !== 'expense') return false;
  if (transaction.isTransfer) return false;
  if (transaction.deleted_at) return false;
  if (transaction.isInvoicePayment) return false;
  if (!transaction.categoryId) return false;

  return format(parseLocalDate(transaction.date), 'yyyy-MM') === targetMonthKey;
}

function getBudgetStatus(planned: number, realized: number): BudgetStatus {
  if (planned <= 0) return 'unplanned';
  const usage = (realized / planned) * 100;
  if (usage > 100) return 'over';
  if (usage >= 80) return 'warning';
  return 'within';
}

export function buildMonthlyCategoryBudgets({
  categories,
  transactions,
  month,
}: {
  categories: Category[];
  transactions: Transaction[];
  month: Date;
}): MonthlyBudgetSummary {
  const targetMonthKey = format(month, 'yyyy-MM');
  const realizedByCategory = new Map<string, number>();

  transactions.forEach((transaction) => {
    if (!isBudgetExpense(transaction, targetMonthKey)) return;
    realizedByCategory.set(
      transaction.categoryId!,
      (realizedByCategory.get(transaction.categoryId!) ?? 0) + Number(transaction.amount || 0)
    );
  });

  const rows = categories
    .filter((category) => category.type === 'expense')
    .map((category) => {
      const planned = Number(category.budgetLimit || 0);
      const realized = realizedByCategory.get(category.id) ?? 0;
      const difference = planned - realized;
      const usagePercent = planned > 0 ? (realized / planned) * 100 : realized > 0 ? 100 : 0;

      return {
        categoryId: category.id,
        categoryName: category.name,
        categoryColor: category.color,
        planned,
        realized,
        difference,
        usagePercent,
        status: getBudgetStatus(planned, realized),
      };
    })
    .filter((row) => row.planned > 0 || row.realized > 0)
    .sort((a, b) => {
      if (a.status !== b.status) {
        const order: Record<BudgetStatus, number> = { over: 0, warning: 1, unplanned: 2, within: 3 };
        return order[a.status] - order[b.status];
      }
      return b.realized - a.realized;
    });

  const totalPlanned = rows.reduce((sum, row) => sum + row.planned, 0);
  const totalRealized = rows.reduce((sum, row) => sum + row.realized, 0);
  const remaining = totalPlanned - totalRealized;
  const usagePercent = totalPlanned > 0 ? (totalRealized / totalPlanned) * 100 : 0;

  return {
    totalPlanned,
    totalRealized,
    remaining,
    usagePercent,
    rows,
  };
}
