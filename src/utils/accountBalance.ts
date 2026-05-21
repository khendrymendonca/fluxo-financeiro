import { Transaction } from '@/types/finance';

type AccountBalanceTransaction = Pick<Transaction, 'accountId' | 'type' | 'amount' | 'isPaid' | 'deleted_at'>;

export function doesTransactionAffectAccountBalance(
  transaction: AccountBalanceTransaction,
  targetAccountId: string
) {
  return (
    transaction.accountId === targetAccountId &&
    transaction.isPaid === true &&
    !transaction.deleted_at
  );
}

export function getTransactionAccountBalanceImpact(transaction: Pick<Transaction, 'type' | 'amount'>) {
  return transaction.type === 'income' ? transaction.amount : -transaction.amount;
}

export function calculateAccountBalance(
  transactions: AccountBalanceTransaction[],
  targetAccountId: string
) {
  return transactions.reduce((sum, transaction) => {
    if (!doesTransactionAffectAccountBalance(transaction, targetAccountId)) {
      return sum;
    }

    return sum + getTransactionAccountBalanceImpact(transaction);
  }, 0);
}
