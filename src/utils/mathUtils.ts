/**
 * Utilitários para cálculos financeiros precisos evitando problemas de ponto flutuante.
 */

export const safeAdd = (a: number | string, b: number | string): number => {
    const valA = typeof a === 'string' ? parseFloat(a) || 0 : a;
    const valB = typeof b === 'string' ? parseFloat(b) || 0 : b;
    return Math.round((valA * 100) + (valB * 100)) / 100;
};

export const safeSubtract = (a: number | string, b: number | string): number => {
    const valA = typeof a === 'string' ? parseFloat(a) || 0 : a;
    const valB = typeof b === 'string' ? parseFloat(b) || 0 : b;
    return Math.round((valA * 100) - (valB * 100)) / 100;
};

export const safeMultiply = (a: number | string, b: number | string): number => {
    const valA = typeof a === 'string' ? parseFloat(a) || 0 : a;
    const valB = typeof b === 'string' ? parseFloat(b) || 0 : b;
    return Math.round((valA * valB) * 100) / 100;
};

export const safeDivide = (a: number | string, b: number | string): number => {
    const valA = typeof a === 'string' ? parseFloat(a) || 0 : a;
    const valB = typeof b === 'string' ? parseFloat(b) || 0 : b;
    if (valB === 0) return 0;
    return Math.round((valA / valB) * 100) / 100;
};
