// Extraído de src/pages/ReportsDashboard.tsx (organização de arquivo, sem
// mudança de comportamento). Selo de comparação "vs período anterior" usado
// nos cards e nas seções de análise dos Relatórios.
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/formatters';
import { PeriodComparison } from '@/utils/reportComparisons';

export function ComparisonBadge({
  comparison,
  periodLabel,
  invertColors = false,
  isPercentPoints = false,
  compact = false,
  className
}: {
  comparison: PeriodComparison,
  periodLabel: string,
  invertColors?: boolean,
  isPercentPoints?: boolean,
  compact?: boolean,
  className?: string
}) {
  if (!comparison.hasBase) {
    return (
      <div className={cn(
        "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-lg bg-gray-50 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400 flex items-center justify-center shrink-0 border border-gray-100 dark:border-zinc-700/50",
        className
      )}>
        <span>{compact ? '→ 0%' : `sem base no ${periodLabel}`}</span>
      </div>
    );
  }

  const isPositive = comparison.direction === 'up';
  const isNeutral = comparison.direction === 'flat';

  let badgeColorClass = "bg-gray-50 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400 border border-gray-100 dark:border-zinc-750";
  if (!isNeutral) {
    const isGood = isPositive !== invertColors;
    if (isGood) {
      badgeColorClass = "bg-emerald-50/70 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-500/10";
    } else {
      badgeColorClass = "bg-rose-50/70 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 border border-rose-500/10";
    }
  }

  const arrow = isNeutral ? "→" : (isPositive ? "↑" : "↓");
  const compactPercent = isPercentPoints
    ? Math.abs(comparison.diff)
    : Math.abs(comparison.percent ?? 0);
  const value = isPercentPoints
    ? `${Math.abs(comparison.diff).toFixed(1)} p.p.`
    : formatCurrency(Math.abs(comparison.diff));

  const percentText = !isPercentPoints && comparison.percent !== null
    ? ` (${Math.abs(comparison.percent).toFixed(1)}%)`
    : "";

  return (
    <div className={cn(
      "text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 px-2 py-0.5 rounded-lg shrink-0 transition-colors",
      badgeColorClass,
      className
    )}>
      {compact ? (
        <span>{arrow} {compactPercent.toFixed(1)}%</span>
      ) : (
        <>
          <span>{arrow} {value}{percentText}</span>
          <span className="opacity-60 font-medium">vs {periodLabel}</span>
        </>
      )}
    </div>
  );
}
