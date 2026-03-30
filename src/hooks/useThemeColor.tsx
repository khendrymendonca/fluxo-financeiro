import { useEffect, useState } from 'react';

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

export function useThemeColor() {
    const [accentColor, setAccentColor] = useState(() => {
        return localStorage.getItem('accent-color') || 'blue';
    });

    useEffect(() => {
        const color = accentColors.find(c => c.id === accentColor) || accentColors[0];
        const root = window.document.documentElement;

        // Atualiza a variável --primary do Tailwind
        root.style.setProperty('--primary', color.hsl);

        // Atualiza o ring e outras dependências se necessário (o primary do shadcn costuma seguir --primary)
        localStorage.setItem('accent-color', accentColor);
    }, [accentColor]);

    return { accentColor, setAccentColor, accentColors };
}
