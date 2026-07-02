import { Debt, Transaction } from '@/types/finance';

export const AGREEMENT_ENTRY_PREFIX = 'Entrada acordo';

export function roundCurrency(value: number) {
  return Math.ceil((Number(value || 0)) * 100) / 100;
}

export function buildAgreementEntryDescription(name: string) {
  return `${AGREEMENT_ENTRY_PREFIX} ${String(name || '').trim()}`.trim();
}

export function buildAgreementInstallmentDescription(name: string, installmentNumber: number, installmentTotal: number) {
  return `Parcela ${installmentNumber}/${installmentTotal} acordo ${String(name || '').trim()}`.trim();
}

export function isAgreementEntryTransaction(transaction: Partial<Transaction> | null | undefined, debtId?: string) {
  if (!transaction) return false;
  if (debtId && transaction.debtId !== debtId) return false;
  if (transaction.type !== 'expense') return false;
  if (transaction.installmentNumber || transaction.installmentTotal) return false;
  return String(transaction.description || '').startsWith(AGREEMENT_ENTRY_PREFIX);
}

export function calculateAgreementTotal(entryAmount: number, installmentAmount: number, totalInstallments: number) {
  const safeEntry = Math.max(0, Number(entryAmount || 0));
  const safeInstallmentAmount = Math.max(0, Number(installmentAmount || 0));
  const safeInstallments = Math.max(0, Math.trunc(Number(totalInstallments || 0)));
  return roundCurrency(safeEntry + (safeInstallments * safeInstallmentAmount));
}

export function calculateAgreementRemaining(
  entryAmount: number,
  installmentAmount: number,
  totalInstallments: number,
  entryIsPaid: boolean
) {
  const total = calculateAgreementTotal(entryAmount, installmentAmount, totalInstallments);
  return roundCurrency(Math.max(0, total - (entryIsPaid ? Math.max(0, Number(entryAmount || 0)) : 0)));
}

export function getAgreementEntryState(debt?: Partial<Debt>) {
  const entryAmount = roundCurrency(Number(debt?.entryAmount || 0));
  const hasEntry = entryAmount > 0;

  return {
    hasEntry,
    entryAmount,
    entryDate: debt?.entryDate || '',
    entryAccountId: debt?.entryAccountId || '',
    entryIsPaid: hasEntry ? Boolean(debt?.entryIsPaid) : false,
  };
}
