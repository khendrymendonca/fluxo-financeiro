export const formatCurrency = (value: number | string | null | undefined): string => {
    if (value === null || value === undefined) return 'R$ 0,00';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numValue);
};

export const normalizeDateForInput = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    return dateStr.split('T')[0];
};
