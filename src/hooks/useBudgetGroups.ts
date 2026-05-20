import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface CustomBudgetGroup {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  budgetPercent?: number | null; // % da receita
  budgetAmount?: number | null;  // valor fixo
}

// Chaves no localStorage
const GROUPS_KEY_PREFIX = 'fluxo_budget_groups:';
const ASSIGNMENTS_KEY_PREFIX = 'fluxo_category_group_assignments:';

export function useBudgetGroups() {
  const [userId, setUserId] = useState<string | null>(
    typeof process !== 'undefined' && process.env.NODE_ENV === 'test' ? 'test-user' : null
  );

  const [groups, setGroups] = useState<CustomBudgetGroup[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({}); // Record<categoryId, groupId>

  useEffect(() => {
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') return;
    
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  useEffect(() => {
    if (!userId) {
      setGroups([]);
      setAssignments({});
      return;
    }

    try {
      const storedGroups = localStorage.getItem(`${GROUPS_KEY_PREFIX}${userId}`);
      if (storedGroups) setGroups(JSON.parse(storedGroups));

      const storedAssignments = localStorage.getItem(`${ASSIGNMENTS_KEY_PREFIX}${userId}`);
      if (storedAssignments) setAssignments(JSON.parse(storedAssignments));
    } catch (e) {
      console.error('Failed to load budget groups from localStorage', e);
    }
  }, [userId]);

  const saveGroups = useCallback((newGroups: CustomBudgetGroup[]) => {
    if (!userId) return;
    setGroups(newGroups);
    localStorage.setItem(`${GROUPS_KEY_PREFIX}${userId}`, JSON.stringify(newGroups));
    
    // Atualizar store ou despachar evento para atualizar outras abas/componentes, 
    // mas o state local já atualizará quem usa o hook.
    window.dispatchEvent(new Event('fluxo_budget_groups_changed'));
  }, [userId]);

  const saveAssignments = useCallback((newAssignments: Record<string, string>) => {
    if (!userId) return;
    setAssignments(newAssignments);
    localStorage.setItem(`${ASSIGNMENTS_KEY_PREFIX}${userId}`, JSON.stringify(newAssignments));
    window.dispatchEvent(new Event('fluxo_budget_groups_changed'));
  }, [userId]);

  // Listener para sincronizar abas e componentes montados sem refresh
  useEffect(() => {
    const handleStorageChange = () => {
      if (!userId) return;
      try {
        const storedGroups = localStorage.getItem(`${GROUPS_KEY_PREFIX}${userId}`);
        if (storedGroups) setGroups(JSON.parse(storedGroups));

        const storedAssignments = localStorage.getItem(`${ASSIGNMENTS_KEY_PREFIX}${userId}`);
        if (storedAssignments) setAssignments(JSON.parse(storedAssignments));
      } catch (e) {
        // Silently ignore parse errors on storage sync
      }

    };

    window.addEventListener('fluxo_budget_groups_changed', handleStorageChange);
    // Para sincronizar com outras abas
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('fluxo_budget_groups_changed', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [userId]);

  const addGroup = useCallback((group: Omit<CustomBudgetGroup, 'id'>) => {
    const newGroup = { ...group, id: crypto.randomUUID() };
    saveGroups([...groups, newGroup]);
    return newGroup;
  }, [groups, saveGroups]);

  const updateGroup = useCallback((id: string, updates: Partial<CustomBudgetGroup>) => {
    saveGroups(groups.map(g => g.id === id ? { ...g, ...updates } : g));
  }, [groups, saveGroups]);

  const deleteGroup = useCallback((id: string) => {
    saveGroups(groups.filter(g => g.id !== id));
    
    // Remover associações
    const newAssignments = { ...assignments };
    let changed = false;
    Object.keys(newAssignments).forEach(catId => {
      if (newAssignments[catId] === id) {
        delete newAssignments[catId];
        changed = true;
      }
    });
    if (changed) saveAssignments(newAssignments);
  }, [groups, assignments, saveGroups, saveAssignments]);

  const assignCategory = useCallback((categoryId: string, groupId: string | null) => {
    const newAssignments = { ...assignments };
    if (groupId) {
      newAssignments[categoryId] = groupId;
    } else {
      delete newAssignments[categoryId];
    }
    saveAssignments(newAssignments);
  }, [assignments, saveAssignments]);

  return {
    budgetGroups: groups,
    categoryAssignments: assignments,
    addGroup,
    updateGroup,
    deleteGroup,
    assignCategory
  };
}
