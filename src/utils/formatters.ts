export const formatCompactCurrency = (value: number): string => {
  const absValue = Math.abs(value);
  const isNegative = value < 0;
  const sign = isNegative ? '-' : '';

  if (absValue >= 1000000) {
    const rounded = Math.ceil((absValue / 1000000) * 100) / 100;
    return `${sign}R$\u00A0${rounded.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}\u00A0mi`;
  }
  if (absValue >= 100000) {
    const rounded = Math.ceil(absValue / 1000);
    return `${sign}R$\u00A0${rounded.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}\u00A0mil`;
  }
  
  // Até 99.999,99 mostra o valor completo com centavos, arredondado para cima
  const roundedValue = Math.ceil(value * 100) / 100;
  const formatted = new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  }).format(roundedValue);
  return formatted.replace(/\s/g, '\u00A0');
};

export const formatCurrency = (value: number | string | null | undefined): string => {
    if (value === null || value === undefined) return 'R$\u00A00,00';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return 'R$\u00A00,00';
    const roundedValue = Math.ceil(numValue * 100) / 100;
    const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(roundedValue);
    return formatted.replace(/\s/g, '\u00A0');
};

export const normalizeDateForInput = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    return dateStr.split('T')[0];
};
export const formatCurrencyCompact = (value: number | string | null | undefined): string => {
    if (value === null || value === undefined) return 'R$\u00A00';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return 'R$\u00A00';
    const roundedValue = Math.ceil(numValue * 100) / 100;
    const formatted = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        notation: 'compact',
        maximumFractionDigits: 1
    }).format(roundedValue);
    return formatted.replace(/\s/g, '\u00A0');
};
