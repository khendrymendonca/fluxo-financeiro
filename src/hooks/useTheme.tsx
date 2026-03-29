import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeType = 'original' | 'green-black';

interface ThemeContextType {
    theme: ThemeType;
    setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<ThemeType>(() => {
        return (localStorage.getItem('app-theme') as ThemeType) || 'original';
    });

    const setTheme = (newTheme: ThemeType) => {
        setThemeState(newTheme);
        localStorage.setItem('app-theme', newTheme);
    };

    useEffect(() => {
        const root = window.document.documentElement;
        const body = window.document.body;

        // Tailwind darkMode: 'class' looks at the html element
        if (theme === 'green-black') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }

        // Keep body classes for CSS variables if needed, but the .dark on html is the key for Tailwind
        body.classList.remove('theme-original', 'theme-green-black');
        body.classList.add(`theme-${theme}`);
    }, [theme]);

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


