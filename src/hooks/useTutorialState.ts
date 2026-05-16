import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type TutorialStatus = 'unseen' | 'dismissed' | 'completed' | 'started';
type DontShowReason = 'dismissed' | 'completed' | 'started';

export const TUTORIAL_STORAGE_PREFIX = 'fluxo_tutorial_state';
export const TUTORIAL_AUTO_OFFER_DISABLED_KEY = 'fluxo_tutorial_auto_offer_disabled';

interface PersistedState {
  status: TutorialStatus;
  autoOfferHandled: boolean;
  dontShowTutorialAgain: boolean;
  tutorialCompleted?: boolean;
  dismissedAt?: string;
  completedAt?: string;
  startedAt?: string;
  updatedAt?: string;
}

interface LoadedTutorialState {
  state: PersistedState;
  isLoaded: boolean;
  storageKey: string | null;
  migrated: boolean;
}

function debugTutorial(...args: unknown[]) {
  console.log('[Tutorial]', ...args);
}

function emptyState(): PersistedState {
  return { status: 'unseen', autoOfferHandled: false, dontShowTutorialAgain: false };
}

export function getTutorialStorageKey(userId?: string | null) {
  if (!userId) return null;
  return `${TUTORIAL_STORAGE_PREFIX}:${userId}`;
}

export function isTutorialAutoOfferDisabled() {
  try {
    const value = localStorage.getItem(TUTORIAL_AUTO_OFFER_DISABLED_KEY);
    console.log('[Tutorial] global disabled', value);
    return value === 'true';
  } catch (error) {
    console.log('[Tutorial] global disabled read error', error);
    return false;
  }
}

export function disableTutorialAutoOffer(reason: string) {
  try {
    console.log('[Tutorial] dismiss clicked - saving global disabled', reason);
    localStorage.setItem(TUTORIAL_AUTO_OFFER_DISABLED_KEY, 'true');
    console.log('[Tutorial] global disabled after save', localStorage.getItem(TUTORIAL_AUTO_OFFER_DISABLED_KEY));
    return true;
  } catch (error) {
    console.log('[Tutorial] global disabled save error', error);
    return false;
  }
}

function normalizeStatus(value: unknown): TutorialStatus {
  if (value === 'dismissed' || value === 'completed' || value === 'started') return value;
  if (value === 'seen') return 'completed';
  return 'unseen';
}

function hasLegacyHandledState(state: Record<string, unknown>, status: TutorialStatus) {
  return (
    state.tutorialCompleted === true ||
    state.autoOfferHandled === true ||
    state.seen === true ||
    state.dismissed === true ||
    status === 'completed' ||
    status === 'dismissed'
  );
}

export function readTutorialState(userId?: string | null): LoadedTutorialState {
  const storageKey = getTutorialStorageKey(userId);

  debugTutorial('userId', userId);
  debugTutorial('storageKey', storageKey);

  if (!storageKey) {
    debugTutorial('read skipped: missing userId');
    return { state: emptyState(), isLoaded: false, storageKey: null, migrated: false };
  }

  try {
    const raw = localStorage.getItem(storageKey);
    debugTutorial('loaded raw', raw);

    if (!raw) {
      return { state: emptyState(), isLoaded: true, storageKey, migrated: false };
    }

    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        const rawState = parsed as Record<string, unknown>;
        const status = normalizeStatus(
          rawState.status ||
          (rawState.tutorialCompleted === true || rawState.seen === true
            ? 'completed'
            : rawState.dismissed === true
              ? 'dismissed'
              : 'unseen')
        );
        const legacyHandled = hasLegacyHandledState(rawState, status);
        const dontShowTutorialAgain = rawState.dontShowTutorialAgain === true || legacyHandled;
        const state: PersistedState = {
          ...emptyState(),
          ...(rawState as Partial<PersistedState>),
          status,
          autoOfferHandled: rawState.autoOfferHandled === true || legacyHandled,
          dontShowTutorialAgain,
        };

        return {
          state,
          isLoaded: true,
          storageKey,
          migrated: dontShowTutorialAgain && rawState.dontShowTutorialAgain !== true,
        };
      }
    } catch (error) {
      debugTutorial('parse error', error);
      if (raw === 'seen' || raw === 'dismissed') {
        return {
          state: {
            status: raw === 'seen' ? 'completed' : 'dismissed',
            autoOfferHandled: true,
            dontShowTutorialAgain: true,
          },
          isLoaded: true,
          storageKey,
          migrated: true,
        };
      }
    }
  } catch (error) {
    debugTutorial('read error', error);
    return { state: emptyState(), isLoaded: true, storageKey, migrated: false };
  }

  return { state: emptyState(), isLoaded: true, storageKey, migrated: false };
}

export function writeTutorialState(userId: string | null | undefined, nextState: PersistedState) {
  const storageKey = getTutorialStorageKey(userId);

  if (!storageKey) {
    debugTutorial('save skipped: missing userId', userId, nextState);
    return false;
  }

  try {
    debugTutorial('saving', storageKey, nextState);
    localStorage.setItem(storageKey, JSON.stringify(nextState));
    debugTutorial('after save', localStorage.getItem(storageKey));
    return true;
  } catch (error) {
    debugTutorial('save error', storageKey, error);
    return false;
  }
}

function timestamp() {
  return new Date().toISOString();
}

export function useTutorialState(userId?: string | null) {
  const loadedInitialState = useMemo(() => readTutorialState(userId), [userId]);
  const [state, setState] = useState<PersistedState>(loadedInitialState.state);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(() => userId || null);
  const stateRef = useRef<PersistedState>(loadedInitialState.state);

  useEffect(() => {
    const loaded = readTutorialState(userId);
    const nextState = loaded.migrated
      ? { ...loaded.state, dontShowTutorialAgain: true, updatedAt: loaded.state.updatedAt || timestamp() }
      : loaded.state;

    if (loaded.migrated) {
      writeTutorialState(userId, nextState);
    }

    stateRef.current = nextState;
    setState(nextState);
    setLoadedUserId(loaded.isLoaded && userId ? userId : null);
  }, [userId]);

  const isLoaded = !!userId && loadedUserId === userId;
  const storageKey = getTutorialStorageKey(userId);
  const globalAutoOfferDisabled = isTutorialAutoOfferDisabled();
  const shouldShowInitialOffer = !globalAutoOfferDisabled && isLoaded && !!userId && state.dontShowTutorialAgain !== true;

  useEffect(() => {
    debugTutorial('shouldShowInitialOffer', shouldShowInitialOffer, {
      userId,
      storageKey,
      globalAutoOfferDisabled,
      isLoaded,
      loadedUserId,
      state,
    });
  }, [globalAutoOfferDisabled, isLoaded, loadedUserId, shouldShowInitialOffer, state, storageKey, userId]);

  const markDontShowTutorialAgain = useCallback((reason: DontShowReason) => {
    disableTutorialAutoOffer(reason);

    const now = timestamp();
    const nextState: PersistedState = {
      ...stateRef.current,
      status: reason === 'completed' ? 'completed' : reason === 'started' ? 'started' : 'dismissed',
      autoOfferHandled: true,
      dontShowTutorialAgain: true,
      tutorialCompleted: reason === 'completed' ? true : stateRef.current.tutorialCompleted,
      dismissedAt: reason === 'dismissed' ? now : stateRef.current.dismissedAt,
      completedAt: reason === 'completed' ? now : stateRef.current.completedAt,
      startedAt: reason === 'started' ? now : stateRef.current.startedAt,
      updatedAt: now,
    };

    const saved = writeTutorialState(userId, nextState);
    if (saved) {
      stateRef.current = nextState;
      setState(nextState);
      setLoadedUserId(userId || null);
    }
  }, [userId]);

  const dismissTutorialOffer = useCallback(() => {
    markDontShowTutorialAgain('dismissed');
  }, [markDontShowTutorialAgain]);

  const completeTutorial = useCallback(() => {
    markDontShowTutorialAgain('completed');
  }, [markDontShowTutorialAgain]);

  const markInitialOfferHandled = useCallback(() => {
    markDontShowTutorialAgain('started');
  }, [markDontShowTutorialAgain]);

  const resetTutorial = useCallback(() => {
    const nextState = { ...emptyState(), updatedAt: timestamp() };
    if (writeTutorialState(userId, nextState)) {
      stateRef.current = nextState;
      setState(nextState);
      setLoadedUserId(userId || null);
    }
  }, [userId]);

  return {
    state,
    status: state.status,
    isLoaded,
    tutorialStateLoaded: isLoaded,
    dontShowTutorialAgain: state.dontShowTutorialAgain,
    storageKey,
    globalAutoOfferDisabled,
    shouldShowInitialOffer,
    shouldOfferTutorial: shouldShowInitialOffer,
    dismissTutorialOffer,
    markDontShowAgain: dismissTutorialOffer,
    completeTutorial,
    openTutorialManually: () => undefined,
    markTutorialSeen: completeTutorial,
    dismissTutorial: dismissTutorialOffer,
    resetTutorial,
    handleAutoOffer: markInitialOfferHandled,
    markInitialOfferHandled,
  };
}
