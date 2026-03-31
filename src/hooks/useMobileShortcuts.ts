import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type ShortcutId = 'dashboard' | 'transactions' | 'cards' | 'accounts' | 'goals' | 'bills' | 'categories' | 'reports' | 'debts' | 'simulator' | 'export' | 'emergency' | 'profile';

export const DEFAULT_SHORTCUTS: ShortcutId[] = ['dashboard', 'transactions', 'cards', 'goals'];

export function useMobileShortcuts() {
  const { user } = useAuth();
  const [shortcuts, setShortcuts] = useState<ShortcutId[]>(() => {
    try {
      const saved = localStorage.getItem('mobile_shortcuts');
      return saved ? JSON.parse(saved) : DEFAULT_SHORTCUTS;
    } catch {
      return DEFAULT_SHORTCUTS;
    }
  });

  useEffect(() => {
    if (user?.user_metadata?.mobile_shortcuts) {
      const metadataShortcuts = user.user_metadata.mobile_shortcuts;
      setShortcuts(metadataShortcuts);
      try {
        localStorage.setItem('mobile_shortcuts', JSON.stringify(metadataShortcuts));
      } catch (e) {
        console.warn('LocalStorage indisponível');
      }
    }
  }, [user]);

  const saveShortcuts = async (newShortcuts: ShortcutId[]) => {
    if (newShortcuts.length > 5) {
      toast.error('Máximo de 5 atalhos permitidos');
      return false;
    }

    setShortcuts(newShortcuts);
    try {
      localStorage.setItem('mobile_shortcuts', JSON.stringify(newShortcuts));
    } catch (e) {
      console.warn('LocalStorage indisponível');
    }

    if (user) {
      try {
        const { error } = await supabase.auth.updateUser({
          data: {
            ...user.user_metadata,
            mobile_shortcuts: newShortcuts
          }
        });
        if (error) throw error;
        return true;
      } catch (error) {
        console.error('Erro ao salvar atalhos:', error);
        toast.error('Erro ao sincronizar atalhos com a nuvem');
        return false;
      }
    }
    return true;
  };

  return { shortcuts, saveShortcuts };
}
