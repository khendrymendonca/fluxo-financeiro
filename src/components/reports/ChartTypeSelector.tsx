// Extraído de src/pages/ReportsDashboard.tsx (organização de arquivo, sem
// mudança de comportamento). Seletor de tipo de gráfico (linha/barra/área)
// usado nas seções de análise dos Relatórios.
import { cn } from '@/lib/utils';

export function ChartTypeSelector({
  value,
  onChange
}: {
  value: 'line' | 'bar' | 'area',
  onChange: (val: 'line' | 'bar' | 'area') => void
}) {
  return (
    <div className="relative flex p-0.5 bg-gray-100 dark:bg-zinc-800 rounded-xl h-8 items-center shrink-0 w-[170px] select-none border border-border/10">
      <div
        className="absolute top-0.5 bottom-0.5 bg-white dark:bg-zinc-700 rounded-lg shadow-sm transition-all duration-200 ease-out"
        style={{
          width: 'calc(33.333% - 2px)',
          transform: `translateX(${
            value === 'line' ? '0%' : value === 'bar' ? '100%' : '200%'
          })`
        }}
      />
      {(['line', 'bar', 'area'] as const).map((type) => (
        <button
          key={type}
          onClick={() => onChange(type)}
          className={cn(
            "relative z-10 flex-1 py-1 text-center font-bold text-[9px] uppercase tracking-wider transition-colors duration-200",
            value === type ? "text-gray-900 dark:text-zinc-50" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {type === 'line' ? 'Linhas' : type === 'bar' ? 'Barras' : 'Área'}
        </button>
      ))}
    </div>
  );
}
