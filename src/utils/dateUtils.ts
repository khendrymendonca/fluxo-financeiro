import { parseISO } from 'date-fns';

export const parseLocalDate = (dateStr: string) => {
    if (!dateStr) return new Date();

    // Extrair apenas YYYY-MM-DD para evitar disparidade de fuso horário
    // (Ignora T00:00:00Z ou qualquer offset vindo do Supabase)
    const literalDate = dateStr.split('T')[0];
    const [year, month, day] = literalDate.split('-').map(Number);

    return new Date(year, month - 1, day);
};

export const todayLocalString = (): string => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
};

export const toLocalDateString = (year: number, month: number, day: number): string => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};


