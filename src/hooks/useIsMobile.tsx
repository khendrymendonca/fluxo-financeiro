import { useState, useEffect } from 'react';

export function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(max-width: 768px)');

        // Define o valor inicial
        setIsMobile(mediaQuery.matches);

        // Listener para mudanças no tamanho da tela
        const handler = (event: MediaQueryListEvent) => {
            setIsMobile(event.matches);
        };

        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    return isMobile;
}
