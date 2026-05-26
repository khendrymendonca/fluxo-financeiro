import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { useToast } from '@/components/ui/use-toast';
import { useAppRefresh } from '@/hooks/useAppRefresh';
import { AppBootScreen } from '@/components/layout/AppBootScreen';

export const APP_INTRO_SESSION_KEY = 'fluxo_intro_seen_this_session';
export const APP_BOOT_PHASE_STORAGE_KEY = 'fluxo_boot_phase';

const BOOT_MIN_MS = import.meta.env.MODE === 'test' ? 0 : 1300;
const BOOT_MAX_MS = import.meta.env.MODE === 'test' ? 50 : 8000;

function getSessionFlag(key: string) {
  try {
    return sessionStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
}

function setSessionFlag(key: string, value: boolean) {
  try {
    if (value) sessionStorage.setItem(key, 'true');
    else sessionStorage.removeItem(key);
  } catch {
    // Storage can be blocked in private/browser-restricted contexts.
  }
}

interface AppBootGateProps {
  user: User | null;
  authLoading: boolean;
  children: ReactNode;
}

export function AppBootGate({ user, authLoading, children }: AppBootGateProps) {
  const { toast } = useToast();
  const refreshAppData = useAppRefresh();
  const userId = user?.id;
  const bootStartedAt = useRef(Date.now());
  const refreshedUserRef = useRef<string | null>(null);

  const shouldShowIntro = useMemo(() => !getSessionFlag(APP_INTRO_SESSION_KEY), []);

  const [isBooting, setIsBooting] = useState(shouldShowIntro || authLoading || !!userId);
  const [message, setMessage] = useState('Abrindo o Fluxo...');
  const [detail, setDetail] = useState('Preparando seu ambiente financeiro');

  useEffect(() => {
    setSessionFlag(APP_BOOT_PHASE_STORAGE_KEY, isBooting);
    return () => setSessionFlag(APP_BOOT_PHASE_STORAGE_KEY, false);
  }, [isBooting]);

  useEffect(() => {
    let cancelled = false;

    async function runBootSequence() {
      if (authLoading) {
        setIsBooting(true);
        return;
      }

      if (!userId) {
        refreshedUserRef.current = null;
      }

      const shouldRefreshFinance = !!userId && refreshedUserRef.current !== userId;
      const shouldRunIntro = shouldShowIntro;

      if (!shouldRefreshFinance && !shouldRunIntro) {
        setIsBooting(false);
        setSessionFlag(APP_BOOT_PHASE_STORAGE_KEY, false);
        return;
      }

      setIsBooting(true);
      setSessionFlag(APP_INTRO_SESSION_KEY, true);

      const elapsed = Date.now() - bootStartedAt.current;
      const minimumWait = Math.max(0, BOOT_MIN_MS - elapsed);
      const waitForIntro = new Promise<void>((resolve) => window.setTimeout(resolve, minimumWait));

      if (!userId) {
        await waitForIntro;
        if (!cancelled) setIsBooting(false);
        return;
      }

      setMessage('Sincronizando dados financeiros...');
      setDetail('Buscando contas, lançamentos e configurações');

      try {
        const refreshResult = await Promise.race([
          refreshAppData().then(() => 'ok' as const),
          new Promise<'timeout'>((resolve) => window.setTimeout(() => resolve('timeout'), BOOT_MAX_MS)),
        ]);

        refreshedUserRef.current = userId;

        if (refreshResult === 'timeout') {
          toast({
            title: 'Sincronização inicial demorou mais que o esperado',
            description: 'Você já pode usar o app com os dados disponíveis e tentar Atualizar novamente.',
          });
        }
      } catch (error) {
        refreshedUserRef.current = userId;
        console.error('Erro durante sincronização inicial:', error);
        toast({
          title: 'Não foi possível atualizar os dados agora',
          description: 'O app será aberto com os dados disponíveis. Use Atualizar para tentar novamente.',
          variant: 'destructive',
        });
      }

      await waitForIntro;
      if (cancelled) return;

      setIsBooting(false);
      setSessionFlag(APP_BOOT_PHASE_STORAGE_KEY, false);
    }

    runBootSequence();

    return () => {
      cancelled = true;
    };
  }, [authLoading, refreshAppData, shouldShowIntro, toast, userId]);

  if (isBooting) {
    return <AppBootScreen message={message} detail={detail} />;
  }

  return <>{children}</>;
}
