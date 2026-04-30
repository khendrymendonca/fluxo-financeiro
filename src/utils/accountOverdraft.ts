type OverdraftInput = {
  balance: number;
  hasOverdraft?: boolean;
  overdraftLimit?: number;
};

export type AccountOverdraftMetrics = {
  realBalance: number;
  limit: number;
  usedLimit: number;
  availableLimit: number;
  overLimit: number;
};

export function getAccountOverdraftMetrics(account: OverdraftInput): AccountOverdraftMetrics {
  const realBalance = Number(account.balance) || 0;
  const limit = account.hasOverdraft ? Math.max(Number(account.overdraftLimit) || 0, 0) : 0;
  const debtAgainstLimit = Math.max(-realBalance, 0);
  const usedLimit = Math.min(debtAgainstLimit, limit);
  const availableLimit = Math.max(limit - usedLimit, 0);
  const overLimit = Math.max(debtAgainstLimit - limit, 0);

  return {
    realBalance,
    limit,
    usedLimit,
    availableLimit,
    overLimit,
  };
}
