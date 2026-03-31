import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export type ThemeType = 'light' | 'dark' | 'amoled' | 'system';

interface ThemeContextType {
    theme: ThemeType;
    setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<ThemeType>(() => {
        return (localStorage.getItem('app-theme') as ThemeType) || 'system';
    });

    const { user } = useAuth();

    const setTheme = async (newTheme: ThemeType) => {
        setThemeState(newTheme);
        localStorage.setItem('app-theme', newTheme);
        if (user) {
            await supabase.auth.updateUser({
                data: { ...user.user_metadata, theme: newTheme }
            });
        }
    };

    useEffect(() => {
        const root = window.document.documentElement;

        const applyTheme = () => {
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

        applyTheme();

        if (theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = () => applyTheme();
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
    }, [theme]);

    // Restauração via Supabase Auth (v6.4)
    useEffect(() => {
        const savedTheme = user?.user_metadata?.theme;
        if (savedTheme && savedTheme !== theme) {
            setTheme(savedTheme as ThemeType);
        }
    }, [user]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
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


