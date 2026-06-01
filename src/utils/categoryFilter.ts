import { Category, Transaction } from '@/types/finance';
import { getTransactionCategoryBucket } from '@/utils/transactionCategory';

export type CategoryFilterOption = {
  key: string;
  label: string;
  type?: 'income' | 'expense' | 'logical';
};

export function buildCanonicalCategoryFilterOptions(
  transactions: Pick<Transaction, 'debtId' | 'categoryId' | 'description' | 'transactionType' | 'cardId' | 'invoiceMonthYear' | 'isInvoicePayment'>[],
  categories: Pick<Category, 'id' | 'name' | 'type' | 'isActive'>[],
  fallback = 'Não identificados'
) {
  const optionMap = new Map<string, CategoryFilterOption>();

  categories
    .filter((category) => category.isActive !== false)
    .forEach((category) => {
      optionMap.set(`category:${category.id}`, {
        key: `category:${category.id}`,
        label: category.name,
        type: category.type as 'income' | 'expense',
      });
    });

  transactions.forEach((transaction) => {
    const bucket = getTransactionCategoryBucket(transaction, categories, fallback);
    if (!optionMap.has(bucket.key)) {
      optionMap.set(bucket.key, {
        key: bucket.key,
        label: bucket.label,
        type: 'logical',
      });
    }
  });

  return Array.from(optionMap.values()).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
}

export function matchesCanonicalCategoryFilter(
  transaction: Pick<Transaction, 'debtId' | 'categoryId' | 'description' | 'transactionType' | 'cardId' | 'invoiceMonthYear' | 'isInvoicePayment'>,
  categories: Pick<Category, 'id' | 'name'>[],
  selectedCategoryKey: string,
  fallback = 'Não identificados'
) {
  if (selectedCategoryKey === 'all') return true;
  return getTransactionCategoryBucket(transaction, categories, fallback).key === selectedCategoryKey;
}
