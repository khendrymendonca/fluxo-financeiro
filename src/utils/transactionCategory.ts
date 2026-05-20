import { Category, Transaction } from '@/types/finance';

export const LOGICAL_AGREEMENT_CATEGORY_KEY = 'logical:agreement';
export const LOGICAL_RENEGOTIATION_CATEGORY_KEY = 'logical:renegotiation';
export const LOGICAL_UNCATEGORIZED_CATEGORY_KEY = 'logical:uncategorized';
export const LOGICAL_MISSING_CATEGORY_KEY_PREFIX = 'logical:missing-category:';

type CategoryBucket = {
  key: string;
  label: string;
  category?: Pick<Category, 'id' | 'name' | 'budgetLimit' | 'color'>;
};

type CategoryTransaction = Pick<
  Transaction,
  'debtId' | 'categoryId' | 'description' | 'transactionType' | 'cardId' | 'invoiceMonthYear' | 'isInvoicePayment'
>;

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase();
}

function isAgreementCategoryName(name: string) {
  return normalizeText(name) === 'acordo';
}

function isUncategorizedCategoryName(name: string) {
  return normalizeText(name) === 'nao identificados';
}

function hasRenegotiationDescription(description?: string) {
  const normalizedDescription = normalizeText(description || '');

  return (
    normalizedDescription.includes('renegociacao de pendencias') ||
    normalizedDescription.includes('renegociacao') ||
    normalizedDescription.includes('parcela fatura') ||
    normalizedDescription.includes('saldo restante')
  );
}

export function isRenegotiationTransaction(transaction: Pick<Transaction, 'description' | 'transactionType' | 'cardId' | 'invoiceMonthYear' | 'isInvoicePayment'>) {
  const isInvoiceDerivedInstallment =
    Boolean(transaction.cardId) &&
    Boolean(transaction.invoiceMonthYear) &&
    transaction.isInvoicePayment !== true &&
    (transaction.transactionType === 'installment' || transaction.transactionType === 'adjustment');

  if (isInvoiceDerivedInstallment && hasRenegotiationDescription(transaction.description)) {
    return true;
  }

  return hasRenegotiationDescription(transaction.description);
}

export function getTransactionCategoryBucket(
  transaction: CategoryTransaction,
  categories: Pick<Category, 'id' | 'name' | 'budgetLimit' | 'color'>[],
  fallback = 'Sem Categoria'
): CategoryBucket {
  if (transaction.debtId) {
    return {
      key: LOGICAL_AGREEMENT_CATEGORY_KEY,
      label: 'Acordo',
    };
  }

  if (isRenegotiationTransaction(transaction)) {
    return {
      key: LOGICAL_RENEGOTIATION_CATEGORY_KEY,
      label: 'Renegociação',
    };
  }

  const explicitCategory = categories.find((category) => category.id === transaction.categoryId);

  if (explicitCategory) {
    if (isAgreementCategoryName(explicitCategory.name)) {
      return {
        key: LOGICAL_AGREEMENT_CATEGORY_KEY,
        label: 'Acordo',
        category: explicitCategory,
      };
    }

    if (!isUncategorizedCategoryName(explicitCategory.name)) {
      return {
        key: `category:${explicitCategory.id}`,
        label: explicitCategory.name,
        category: explicitCategory,
      };
    }

    return {
      key: LOGICAL_UNCATEGORIZED_CATEGORY_KEY,
      label: 'Não identificados',
    };
  }

  if (transaction.categoryId) {
    return {
      key: `${LOGICAL_MISSING_CATEGORY_KEY_PREFIX}${transaction.categoryId}`,
      label: 'Categoria não encontrada',
    };
  }

  return {
    key: LOGICAL_UNCATEGORIZED_CATEGORY_KEY,
    label: fallback,
  };
}

export function getTransactionCategoryLabel(
  transaction: CategoryTransaction,
  categories: Pick<Category, 'id' | 'name'>[],
  fallback = 'Sem Categoria'
) {
  return getTransactionCategoryBucket(transaction, categories, fallback).label;
}
