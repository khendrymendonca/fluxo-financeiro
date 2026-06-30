import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useGlobalFlag, useGlobalFlags } from '@/hooks/useFeatureFlags';

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
];


const ACCENT_STORAGE_KEY = 'accent-color';
const TORCIDA_STORAGE_KEY = 'modo-torcida';

function readStoredAccentColor(userId?: string) {
    if (!userId) {
        return localStorage.getItem(ACCENT_STORAGE_KEY);
    }
    return localStorage.getItem(`${ACCENT_STORAGE_KEY}:${userId}`);
}

function readStoredTorcida(userId?: string) {
    if (!userId) {
        return localStorage.getItem(TORCIDA_STORAGE_KEY) === 'true';
    }
    return localStorage.getItem(`${TORCIDA_STORAGE_KEY}:${userId}`) === 'true';
}

export interface CustomPalette {
    primary: string;
    border: string;
    icon: string;
    active: boolean;
}

interface ThemeColorContextType {
    accentColor: string;
    setAccentColor: (color: string) => void;
    accentColors: typeof accentColors;
    modoTorcida: boolean;
    setModoTorcida: (active: boolean) => void;
    customPalette: CustomPalette;
    setCustomPalette: (palette: CustomPalette) => void;
}

const ThemeColorContext = createContext<ThemeColorContextType | undefined>(undefined);

const PALETTE_STORAGE_KEY = 'custom-palette';

function hexToHslString(hex: string): string {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    let l = (max + min) / 2;
    
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }
        h /= 6;
    }
    
    h = Math.round(h * 360);
    s = Math.round(s * 100);
    l = Math.round(l * 100);
    
    return `${h} ${s}% ${l}%`;
}

function readStoredPalette(userId?: string): CustomPalette | null {
    const key = userId ? `${PALETTE_STORAGE_KEY}:${userId}` : PALETTE_STORAGE_KEY;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export function ThemeColorProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const { data: flags = [], isSuccess: flagsLoaded } = useGlobalFlags();
    const copaInternalEnabled = flags.find((f) => f.key === 'theme_copa_internal')?.enabled ?? false;
    const easterInternalEnabled = flags.find((f) => f.key === 'theme_easter_internal')?.enabled ?? false;
    const christmasInternalEnabled = flags.find((f) => f.key === 'theme_christmas_internal')?.enabled ?? false;
    const halloweenInternalEnabled = flags.find((f) => f.key === 'theme_halloween_internal')?.enabled ?? false;
    const hasHydratedRemoteAccentRef = useRef(false);

    const persistAccentLocally = useCallback((nextAccentColor: string, userId?: string) => {
        localStorage.setItem(ACCENT_STORAGE_KEY, nextAccentColor);
        if (userId) {
            localStorage.setItem(`${ACCENT_STORAGE_KEY}:${userId}`, nextAccentColor);
        }
    }, []);

    const persistTorcidaLocally = useCallback((active: boolean, userId?: string) => {
        localStorage.setItem(TORCIDA_STORAGE_KEY, String(active));
        if (userId) {
            localStorage.setItem(`${TORCIDA_STORAGE_KEY}:${userId}`, String(active));
        }
    }, []);

    const [accentColor, setAccentColorState] = useState(() => {
        return 'blue';
    });

    const [modoTorcida, setModoTorcidaState] = useState(() => {
        return false;
    });

    const [customPalette, setCustomPaletteState] = useState<CustomPalette>(() => {
        return {
            primary: '#0d9488',
            border: '#e2e8f0',
            icon: '#64748b',
            active: false
        };
    });

    const applyPaletteState = useCallback((nextPalette: CustomPalette, userId?: string) => {
        setCustomPaletteState(nextPalette);
        const key = userId ? `${PALETTE_STORAGE_KEY}:${userId}` : PALETTE_STORAGE_KEY;
        localStorage.setItem(key, JSON.stringify(nextPalette));
    }, []);

    const syncPaletteRemotely = useCallback(async (nextPalette: CustomPalette) => {
        if (!user) return;
        try {
            await supabase.auth.updateUser({
                data: { ...user.user_metadata, custom_palette: nextPalette }
            });
        } catch (error) {
            console.error('[syncPaletteRemotely] Failed to update user metadata:', error);
        }
    }, [user]);

    const setCustomPalette = useCallback((nextPalette: CustomPalette) => {
        applyPaletteState(nextPalette, user?.id);
        void syncPaletteRemotely(nextPalette);
    }, [applyPaletteState, syncPaletteRemotely, user]);

    const applyAccentColorState = useCallback((nextAccentColor: string, userId?: string) => {
        const normalizedAccentColor = (
            accentColors.some((color) => color.id === nextAccentColor) || 
            nextAccentColor === 'pascoa' || 
            nextAccentColor === 'christmas' || 
            nextAccentColor === 'halloween'
        )
            ? nextAccentColor
            : accentColors[0].id;

        setAccentColorState(normalizedAccentColor);
        persistAccentLocally(normalizedAccentColor, userId);
        return normalizedAccentColor;
    }, [persistAccentLocally]);

    const applyTorcidaState = useCallback((active: boolean, userId?: string) => {
        setModoTorcidaState(active);
        persistTorcidaLocally(active, userId);
        return active;
    }, [persistTorcidaLocally]);

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

    const syncTorcidaRemotely = useCallback(async (active: boolean) => {
        if (!user) {
            return;
        }

        try {
            await supabase.auth.updateUser({
                data: { ...user.user_metadata, modo_torcida: active }
            });
        } catch (error) {
            console.error('[syncTorcidaRemotely] Failed to update user metadata:', error);
        }
    }, [user]);

    const setAccentColor = useCallback((nextAccentColor: string) => {
        const normalizedAccentColor = applyAccentColorState(nextAccentColor, user?.id);
        void syncAccentColorRemotely(normalizedAccentColor);
    }, [applyAccentColorState, syncAccentColorRemotely, user]);

    const setModoTorcida = useCallback((active: boolean) => {
        const nextActive = applyTorcidaState(active, user?.id);
        void syncTorcidaRemotely(nextActive);
    }, [applyTorcidaState, syncTorcidaRemotely, user]);

    useEffect(() => {
        const root = window.document.documentElement;
        
        // Remove all seasonal and custom classes to ensure clean transition
        root.classList.remove('theme-copa', 'theme-easter', 'theme-christmas', 'theme-halloween', 'theme-custom-palette');
        root.style.removeProperty('--primary');
        root.style.removeProperty('--border');
        root.style.removeProperty('--icon-custom');
        
        if (modoTorcida) {
            root.classList.add('theme-copa');
        } else if (customPalette.active) {
            root.classList.add('theme-custom-palette');
            root.style.setProperty('--primary', hexToHslString(customPalette.primary));
            root.style.setProperty('--border', hexToHslString(customPalette.border));
            root.style.setProperty('--icon-custom', hexToHslString(customPalette.icon));
        } else if (accentColor === 'pascoa') {
            root.classList.add('theme-easter');
        } else if (accentColor === 'christmas') {
            root.classList.add('theme-christmas');
        } else if (accentColor === 'halloween') {
            root.classList.add('theme-halloween');
        } else {
            const color = accentColors.find((entry) => entry.id === accentColor) || accentColors[0];
            root.style.setProperty('--primary', color.hsl);
        }
    }, [accentColor, modoTorcida, customPalette]);

    useEffect(() => {
        if (!flagsLoaded) return;
        if (!copaInternalEnabled && modoTorcida) {
            setModoTorcida(false);
        }
    }, [modoTorcida, copaInternalEnabled, flagsLoaded, setModoTorcida]);

    useEffect(() => {
        if (!flagsLoaded) return;
        if (!easterInternalEnabled && accentColor === 'pascoa') {
            setAccentColor('blue');
        }
        if (!christmasInternalEnabled && accentColor === 'christmas') {
            setAccentColor('blue');
        }
        if (!halloweenInternalEnabled && accentColor === 'halloween') {
            setAccentColor('blue');
        }
    }, [accentColor, easterInternalEnabled, christmasInternalEnabled, halloweenInternalEnabled, flagsLoaded, setAccentColor]);

    useEffect(() => {
        if (!user) {
            hasHydratedRemoteAccentRef.current = false;
            
            // Hidratação local para visitante
            const legacyStored = readStoredAccentColor();
            if (legacyStored) {
                setAccentColorState(legacyStored);
            } else {
                setAccentColorState('blue');
            }
            
            const legacyTorcida = readStoredTorcida();
            setModoTorcidaState(legacyTorcida);

            const legacyPalette = readStoredPalette();
            if (legacyPalette) {
                setCustomPaletteState(legacyPalette);
            } else {
                setCustomPaletteState({
                    primary: '#0d9488',
                    border: '#e2e8f0',
                    icon: '#64748b',
                    active: false
                });
            }
            return;
        }

        if (hasHydratedRemoteAccentRef.current) {
            return;
        }

        // Determinar cor de destaque inicial
        const remoteAccentColor = user.user_metadata?.accent_color;
        let targetAccent = 'blue';

        if (typeof remoteAccentColor === 'string' && remoteAccentColor.length > 0) {
            targetAccent = remoteAccentColor;
        } else {
            const userStoredAccent = readStoredAccentColor(user.id);
            if (userStoredAccent) {
                targetAccent = userStoredAccent;
            } else {
                const legacyStored = readStoredAccentColor();
                if (legacyStored) {
                    targetAccent = legacyStored;
                }
            }
        }

        // Determinar modo torcida inicial
        const remoteTorcida = user.user_metadata?.modo_torcida;
        let targetTorcida = false;

        if (typeof remoteTorcida === 'boolean') {
            targetTorcida = remoteTorcida;
        } else {
            const userStoredTorcida = readStoredTorcida(user.id);
            if (userStoredTorcida) {
                targetTorcida = userStoredTorcida;
            } else {
                targetTorcida = readStoredTorcida();
            }
        }

        // Determinar paleta customizada inicial
        const remotePalette = user.user_metadata?.custom_palette;
        let targetPalette: CustomPalette = {
            primary: '#0d9488',
            border: '#e2e8f0',
            icon: '#64748b',
            active: false
        };

        if (remotePalette && typeof remotePalette === 'object') {
            targetPalette = {
                primary: remotePalette.primary ?? '#0d9488',
                border: remotePalette.border ?? '#e2e8f0',
                icon: remotePalette.icon ?? '#64748b',
                active: !!remotePalette.active
            };
        } else {
            const userStored = readStoredPalette(user.id);
            if (userStored) {
                targetPalette = userStored;
            } else {
                const legacyStored = readStoredPalette();
                if (legacyStored) {
                    targetPalette = legacyStored;
                }
            }
        }

        applyAccentColorState(targetAccent, user.id);
        applyTorcidaState(targetTorcida, user.id);
        applyPaletteState(targetPalette, user.id);
        hasHydratedRemoteAccentRef.current = true;
    }, [applyAccentColorState, applyTorcidaState, applyPaletteState, user]);

    return (
        <ThemeColorContext.Provider value={{ accentColor, setAccentColor, accentColors, modoTorcida, setModoTorcida, customPalette, setCustomPalette }}>
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
