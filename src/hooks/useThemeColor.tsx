import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

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

interface ThemeColorContextType {
    accentColor: string;
    setAccentColor: (color: string) => void;
    accentColors: typeof accentColors;
}

const ThemeColorContext = createContext<ThemeColorContextType | undefined>(undefined);

export function ThemeColorProvider({ children }: { children: React.ReactNode }) {
    const [accentColor, setAccentColorState] = useState(() => {
        return localStorage.getItem('accent-color') || 'blue';
    });

    const { user } = useAuth();

    const setAccentColor = async (color: string) => {
        setAccentColorState(color);
        if (user) {
            await supabase.auth.updateUser({
                data: { ...user.user_metadata, accent_color: color }
            });
        }
    };

    useEffect(() => {
        const color = accentColors.find(c => c.id === accentColor) || accentColors[0];
        const root = window.document.documentElement;

        // Atualiza a variável --primary do Tailwind
        root.style.setProperty('--primary', color.hsl);
        localStorage.setItem('accent-color', accentColor);
    }, [accentColor]);

    // Restauração via Supabase Auth (v6.4)
    useEffect(() => {
        const savedColor = user?.user_metadata?.accent_color;
        if (savedColor && savedColor !== accentColor) {
            setAccentColor(savedColor);
        }
    }, [user]);

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
