import { Category, Transaction } from '@/types/finance';

export function getTransactionCategoryLabel(
  transaction: Pick<Transaction, 'debtId' | 'categoryId'>,
  categories: Pick<Category, 'id' | 'name'>[],
  fallback = 'Sem Categoria'
) {
  if (transaction.debtId) {
    return 'Acordo';
  }

  return categories.find((category) => category.id === transaction.categoryId)?.name || fallback;
}
