import { Category, Transaction } from '@/types/finance';

export const TRACKED_BUDGET_CATEGORIES_KEY_PREFIX = 'fluxo_budget_tracked_categories';

export interface TrackedCategoriesData {
  initialized: boolean;
  trackedCategoryIds: string[];
}

export function getBudgetTrackingUserKey(categories: Category[], transactions: Transaction[]) {
  return categories[0]?.userId || transactions[0]?.userId || 'local';
}

export function getTrackedBudgetCategoriesStorageKey(userKey: string) {
  return `${TRACKED_BUDGET_CATEGORIES_KEY_PREFIX}:${userKey}`;
}

export function readTrackedBudgetData(userKey: string): TrackedCategoriesData | null {
  try {
    const raw = localStorage.getItem(getTrackedBudgetCategoriesStorageKey(userKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    
    // Suporte para o formato antigo (apenas array de strings)
    if (Array.isArray(parsed)) {
      return {
        initialized: true,
        trackedCategoryIds: parsed.filter((id): id is string => typeof id === 'string')
      };
    }

    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.trackedCategoryIds)) {
      return {
        initialized: Boolean(parsed.initialized),
        trackedCategoryIds: parsed.trackedCategoryIds.filter((id: any): id is string => typeof id === 'string')
      };
    }

    return null;
  } catch {
    return null;
  }
}

export function writeTrackedBudgetData(userKey: string, data: TrackedCategoriesData) {
  localStorage.setItem(getTrackedBudgetCategoriesStorageKey(userKey), JSON.stringify(data));
}

// Helpers mantidos para compatibilidade se necessário, mas marcados para refatoração
export function readTrackedBudgetCategoryIds(userKey: string) {
  const data = readTrackedBudgetData(userKey);
  return data?.trackedCategoryIds || null;
}

export function writeTrackedBudgetCategoryIds(userKey: string, ids: string[]) {
  writeTrackedBudgetData(userKey, { initialized: true, trackedCategoryIds: ids });
}
