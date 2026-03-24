import { parseISO } from 'date-fns';

export const parseLocalDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    // Se já for uma data ISO completa, o parseISO resolve
    if (dateStr.includes('T')) return parseISO(dateStr);

    // Trata o formato YYYY-MM-DD para evitar problemas de fuso horário
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
};

export const todayLocalString = (): string => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
};

export const toLocalDateString = (year: number, month: number, day: number): string => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};


