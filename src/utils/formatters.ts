export const formatCompactCurrency = (value: number): string => {
  const absValue = Math.abs(value);
  const isNegative = value < 0;
  const sign = isNegative ? '-' : '';

  if (absValue >= 1000000) {
    return `${sign}R$ ${(absValue / 1000000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} mi`;
  }
  if (absValue >= 100000) {
    return `${sign}R$ ${(absValue / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mil`;
  }
  
  // Até 99.999,99 mostra o valor completo com centavos
  return new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  }).format(value);
};

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
export const formatCurrencyCompact = (value: number | string | null | undefined): string => {
    if (value === null || value === undefined) return 'R$ 0';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return 'R$ 0';
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        notation: 'compact',
        maximumFractionDigits: 1
    }).format(numValue);
};


