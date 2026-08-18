import { startOfDay } from 'date-fns';

export const parseLocalDate = (dateStr: string) => {
    if (!dateStr) return new Date();

    // Extrair apenas YYYY-MM-DD para evitar disparidade de fuso horário
    // (Ignora T00:00:00Z ou qualquer offset vindo do Supabase)
    const literalDate = dateStr.split('T')[0];
    const [year, month, day] = literalDate.split('-').map(Number);

    // Guarda contra string em formato inesperado (year/month/day viram NaN):
    // sem isso, "new Date(NaN, NaN, NaN)" retorna um Invalid Date que passa
    // batido aqui, mas explode mais tarde em qualquer format(...) do
    // date-fns ("RangeError: Invalid time value") — um crash sem stack
    // trace útil em quem chamou, muito depois da causa real.
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
        return new Date();
    }

    return new Date(year, month - 1, day);
};

export const isDateOverdue = (dueDate: Date | string, currentDate: Date | string) => {
    const normalizedDueDate = startOfDay(typeof dueDate === 'string' ? parseLocalDate(dueDate) : dueDate);
    const normalizedCurrentDate = startOfDay(typeof currentDate === 'string' ? parseLocalDate(currentDate) : currentDate);

    return normalizedCurrentDate > normalizedDueDate;
};

export const todayLocalString = (): string => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
};

export const toLocalDateString = (year: number, month: number, day: number): string => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};
