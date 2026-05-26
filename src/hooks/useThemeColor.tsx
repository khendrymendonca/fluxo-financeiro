import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useGlobalFlag } from '@/hooks/useFeatureFlags';

export const accentColors = [
    { id: 'blue', name: 'Azul Real', hsl: '221.2 83.2% 53.3%' },
    { id: 'indigo', name: 'Índigo', hsl: '243.4 75.4% 58.6%' },
    { id: 'violet', name: 'Violeta', hsl: '262.1 83.3% 57.8%' },
    { id: 'purple', name: 'Roxo', hsl: '271.5 81.3% 55.9%' },
    { id: 'pink', name: 'Pink Safira', hsl: '330.4 81.2% 60.4%' },
    { id: 'rose', name: 'Rosa Rubi', hsl: '346.8 77.2% 49.8%' },
    { id: 'red', name: 'Vermelho Fogo', hsl: '0 84.2% 60.2%' },
    { id: 'orange', name: 'Laranja Solar', hsl: '24.6 95% 53.1%' },
    { id: 'amber', name: 'Âmbar', hsl: '37.7 92.1% 50.2%' },
    { id: 'emerald', name: 'Esmeralda', hsl: '142.1 76.2% 36.3%' },
    { id: 'teal', name: 'Turquesa', hsl: '173.4 80.4% 40%' },
    { id: 'cyan', name: 'Ciano', hsl: '188.7 94.5% 42.7%' },
    { id: 'pascoa', name: 'Páscoa', hsl: '267 60% 72%' },
];

const ACCENT_STORAGE_KEY = 'accent-color';

function readStoredAccentColor(userId?: string) {
    if (!userId) {
        return localStorage.getItem(ACCENT_STORAGE_KEY);
    }
    return localStorage.getItem(`${ACCENT_STORAGE_KEY}:${userId}`);
}

interface ThemeColorContextType {
    accentColor: string;
    setAccentColor: (color: string) => void;
    accentColors: typeof accentColors;
}

const ThemeColorContext = createContext<ThemeColorContextType | undefined>(undefined);

export function ThemeColorProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const easterEnabled = useGlobalFlag('theme_easter');
    const hasHydratedRemoteAccentRef = useRef(false);

    const persistAccentLocally = useCallback((nextAccentColor: string, userId?: string) => {
        localStorage.setItem(ACCENT_STORAGE_KEY, nextAccentColor);
        if (userId) {
            localStorage.setItem(`${ACCENT_STORAGE_KEY}:${userId}`, nextAccentColor);
        }
    }, []);

    const [accentColor, setAccentColorState] = useState(() => {
        return 'blue';
    });

    const applyAccentColorState = useCallback((nextAccentColor: string, userId?: string) => {
        const normalizedAccentColor = accentColors.some((color) => color.id === nextAccentColor)
            ? nextAccentColor
            : accentColors[0].id;

        setAccentColorState(normalizedAccentColor);
        persistAccentLocally(normalizedAccentColor, userId);
        return normalizedAccentColor;
    }, [persistAccentLocally]);

    const syncAccentColorRemotely = useCallback(async (nextAccentColor: string) => {
        if (!user) {
            return;
        }

        try {
            await supabase.auth.updateUser({
                data: { ...user.user_metadata, accent_color: nextAccentColor }
            });
        } catch (error) {
            console.error('[syncAccentColorRemotely] Failed to update user metadata:', error);
        }
    }, [user]);

    const setAccentColor = useCallback((nextAccentColor: string) => {
        const normalizedAccentColor = applyAccentColorState(nextAccentColor, user?.id);
        void syncAccentColorRemotely(normalizedAccentColor);
    }, [applyAccentColorState, syncAccentColorRemotely, user]);

    useEffect(() => {
        const color = accentColors.find((entry) => entry.id === accentColor) || accentColors[0];
        const root = window.document.documentElement;

        root.style.setProperty('--primary', color.hsl);
    }, [accentColor]);

    useEffect(() => {
        if (!easterEnabled && accentColor === 'pascoa') {
            setAccentColor('teal');
        }
    }, [accentColor, easterEnabled, setAccentColor]);

    useEffect(() => {
        if (!user) {
            hasHydratedRemoteAccentRef.current = false;
            const legacyStored = readStoredAccentColor();
            if (legacyStored) {
                setAccentColorState(legacyStored);
            } else {
                setAccentColorState('blue');
            }
            return;
        }

        if (hasHydratedRemoteAccentRef.current) {
            return;
        }

        // Prioridade 1: Cor remota do perfil no Supabase
        const remoteAccentColor = user.user_metadata?.accent_color;
        if (typeof remoteAccentColor === 'string' && remoteAccentColor.length > 0) {
            applyAccentColorState(remoteAccentColor, user.id);
            hasHydratedRemoteAccentRef.current = true;
            return;
        }

        // Prioridade 2: Cor local do usuário no localStorage
        const userStoredAccent = readStoredAccentColor(user.id);
        if (userStoredAccent) {
            applyAccentColorState(userStoredAccent, user.id);
            hasHydratedRemoteAccentRef.current = true;
            return;
        }

        // Prioridade 3: Cor genérica herdada do localStorage (migração de estado anterior)
        const legacyStored = readStoredAccentColor();
        if (legacyStored) {
            applyAccentColorState(legacyStored, user.id);
            hasHydratedRemoteAccentRef.current = true;
            return;
        }

        // Fallback padrão
        applyAccentColorState('blue', user.id);
        hasHydratedRemoteAccentRef.current = true;
    }, [applyAccentColorState, user, setAccentColor]);

    return (
        <ThemeColorContext.Provider value={{ accentColor, setAccentColor, accentColors }}>
            {children}
        </ThemeColorContext.Provider>
    );
}

export function useThemeColor() {
    const context = useContext(ThemeColorContext);
    if (context === undefined) {
        throw new Error('useThemeColor must be used within a ThemeColorProvider');
    }
    return context;
}
