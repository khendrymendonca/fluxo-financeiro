import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export type ThemeType = 'light' | 'dark' | 'amoled' | 'system';

const DESKTOP_BREAKPOINT = 1024;
const THEME_STORAGE_KEY = 'app-theme';

function normalizeThemeForViewport(theme: ThemeType, viewportWidth: number): ThemeType {
    if (theme === 'amoled' && viewportWidth >= DESKTOP_BREAKPOINT) {
        return 'dark';
    }

    return theme;
}

function readStoredTheme(): ThemeType | null {
    return (localStorage.getItem(THEME_STORAGE_KEY) as ThemeType | null) ?? null;
}

interface ThemeContextType {
    theme: ThemeType;
    setTheme: (theme: ThemeType) => void;
    cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const hasHydratedRemoteThemeRef = useRef(false);

    const persistThemeLocally = useCallback((nextTheme: ThemeType) => {
        if (readStoredTheme() !== nextTheme) {
            localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
        }
    }, []);

    const [theme, setThemeState] = useState<ThemeType>(() => {
        const storedTheme = readStoredTheme() ?? 'system';
        const normalizedTheme = normalizeThemeForViewport(storedTheme, window.innerWidth);

        if (normalizedTheme !== storedTheme) {
            localStorage.setItem(THEME_STORAGE_KEY, normalizedTheme);
        }

        return normalizedTheme;
    });

    const applyThemeState = useCallback((nextTheme: ThemeType) => {
        const normalizedTheme = normalizeThemeForViewport(nextTheme, window.innerWidth);
        setThemeState((currentTheme) => (currentTheme === normalizedTheme ? currentTheme : normalizedTheme));
        persistThemeLocally(normalizedTheme);
        return normalizedTheme;
    }, [persistThemeLocally]);

    const syncThemeRemotely = useCallback(async (nextTheme: ThemeType) => {
        if (!user) {
            return;
        }

        try {
            await supabase.auth.updateUser({
                data: { ...user.user_metadata, theme: nextTheme }
            });
        } catch {
            // Mantem a preferencia local como fonte da verdade da sessao.
        }
    }, [user]);

    const setTheme = useCallback((newTheme: ThemeType) => {
        const normalizedTheme = applyThemeState(newTheme);
        void syncThemeRemotely(normalizedTheme);
    }, [applyThemeState, syncThemeRemotely]);

    const cycleTheme = useCallback(() => {
        const root = document.documentElement;
        const isDark = root.classList.contains('dark');
        const isAmoled = root.classList.contains('theme-amoled');
        const isMobile = window.innerWidth < DESKTOP_BREAKPOINT;

        if (!isDark) {
            setTheme('dark');
        } else if (isDark && !isAmoled && isMobile) {
            setTheme('amoled');
        } else {
            setTheme('light');
        }
    }, [setTheme]);

    useEffect(() => {
        const root = window.document.documentElement;

        const applyThemeClassNames = () => {
            root.classList.remove('dark', 'amoled', 'theme-amoled');

            let effectiveTheme = theme;
            if (theme === 'system') {
                effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }

            if (effectiveTheme === 'dark') {
                root.classList.add('dark');
            } else if (effectiveTheme === 'amoled') {
                root.classList.add('dark', 'theme-amoled');
            }
        };

        applyThemeClassNames();

        if (theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = () => applyThemeClassNames();
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
    }, [theme]);

    useEffect(() => {
        const handleResize = () => {
            setThemeState((currentTheme) => {
                const normalizedTheme = normalizeThemeForViewport(currentTheme, window.innerWidth);

                if (normalizedTheme !== currentTheme) {
                    persistThemeLocally(normalizedTheme);
                    return normalizedTheme;
                }

                return currentTheme;
            });
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [persistThemeLocally]);

    useEffect(() => {
        if (!user) {
            hasHydratedRemoteThemeRef.current = false;
            return;
        }

        const storedTheme = readStoredTheme();
        if (storedTheme) {
            const normalizedStoredTheme = normalizeThemeForViewport(storedTheme, window.innerWidth);
            if (normalizedStoredTheme !== storedTheme) {
                persistThemeLocally(normalizedStoredTheme);
            }
            setThemeState((currentTheme) => (currentTheme === normalizedStoredTheme ? currentTheme : normalizedStoredTheme));
            hasHydratedRemoteThemeRef.current = true;
            return;
        }

        if (hasHydratedRemoteThemeRef.current) {
            return;
        }

        const remoteTheme = user.user_metadata?.theme as ThemeType | undefined;
        if (remoteTheme) {
            applyThemeState(remoteTheme);
        }

        hasHydratedRemoteThemeRef.current = true;
    }, [applyThemeState, persistThemeLocally, user]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, cycleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
