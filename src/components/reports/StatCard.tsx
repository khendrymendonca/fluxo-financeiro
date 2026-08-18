// Extraído de src/pages/ReportsDashboard.tsx (organização de arquivo, sem
// mudança de comportamento). Card de estatística (label + valor + comparação)
// usado no topo dos Relatórios.
import React from 'react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/formatters';
import { PeriodComparison } from '@/utils/reportComparisons';
import { ComparisonBadge } from './ComparisonBadge';

export function StatCard({
  label,
  value,
  icon,
  comparison,
  periodLabel,
  isNeutral,
  forceRed,
  invertColors,
  compact = false,
  isPercentValue = false,
  projectedValue,
  realizedValue,
  reportMode,
}: {
  label: string,
  value: number,
  icon: React.ReactNode,
  comparison?: PeriodComparison,
  periodLabel?: string,
  isNeutral?: boolean,
  forceRed?: boolean,
  invertColors?: boolean,
  compact?: boolean,
  isPercentValue?: boolean,
  projectedValue?: number,
  realizedValue?: number,
  reportMode?: 'projected' | 'realized',
}) {
  const hasFooter = projectedValue !== undefined && realizedValue !== undefined;

  return (
    <div className={cn(
      "bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 shadow-sm group transition-all relative overflow-hidden flex flex-col justify-between rounded-2xl w-full",
      compact
        ? "p-3.5"
        : "p-5 hover:scale-[1.01]"
    )}>
      {/* Topo do card: Ícone e Badge de Comparação */}
      <div className="flex justify-between items-center w-full gap-2 mb-3 shrink-0">
        <div className={cn(
          "rounded-xl bg-zinc-50 dark:bg-zinc-800/60 group-hover:bg-primary/10 transition-colors flex items-center justify-center shrink-0",
          compact ? "p-1.5 h-7 w-7" : "p-2 h-9 w-9"
        )}>
          {React.cloneElement(icon as React.ReactElement, { className: cn((icon as React.ReactElement).props.className, compact ? "w-3.5 h-3.5" : "w-4.5 h-4.5") })}
        </div>
        {comparison && periodLabel && (
          <ComparisonBadge
            comparison={comparison}
            periodLabel={periodLabel}
            invertColors={invertColors}
            compact={true}
          />
        )}
      </div>

      {/* Conteúdo Principal (Label + Valor) */}
      <div className="flex-1 flex flex-col justify-end min-w-0">
        <p className={cn(
          "font-bold text-muted-foreground uppercase tracking-[0.12em] block select-none truncate w-full",
          compact ? "text-[8.5px] mb-0.5" : "text-[9.5px] mb-1"
        )}>
          {label}
        </p>
        <p className={cn(
          "font-black tracking-tight tabular-nums leading-none whitespace-nowrap truncate w-full",
          compact
            ? "text-lg"
            : "text-xl sm:text-2xl md:text-3xl",
          forceRed ? "text-rose-500" : (!isNeutral && (value >= 0 ? "text-emerald-500" : "text-rose-500")),
          isNeutral && "text-gray-900 dark:text-zinc-50"
        )}>
          {isPercentValue ? `${value.toFixed(1)}%` : formatCurrency(value)}
        </p>
      </div>

      {/* Rodapé: Detalhes Previsto vs Realizado */}
      {hasFooter && (
        <div className="pt-2.5 mt-2.5 border-t border-gray-150/40 dark:border-zinc-800/50 flex items-center justify-between text-[9.5px] font-bold text-muted-foreground/80 w-full gap-2 shrink-0 min-w-0">
          <div className="flex items-center justify-between w-full gap-1.5 truncate">
            <div className="flex items-center gap-0.5 truncate">
              <span className="opacity-60 shrink-0">Prev:</span>
              <span className="font-black text-gray-700 dark:text-zinc-200 tabular-nums truncate">{formatCurrency(projectedValue)}</span>
            </div>
            <div className="flex items-center gap-0.5 truncate">
              <span className="opacity-60 shrink-0">Real:</span>
              <span className="font-black text-gray-700 dark:text-zinc-200 tabular-nums truncate">{formatCurrency(realizedValue)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
