import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { formatCompactCurrency } from '@/utils/formatters';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  variant?: 'positive' | 'negative' | 'neutral' | 'default';
  className?: string;
  isCompact?: boolean;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  variant = 'default',
  className,
  isCompact
}: StatCardProps) {
  const displayValue = typeof value === 'number' ? formatCompactCurrency(value) : value;

  return (
    <div className={cn(
      "bg-card rounded-[1.5rem] border border-border/40 animate-fade-in overflow-hidden h-full w-full min-w-0 transition-all shadow-sm dark:shadow-none",
      isCompact ? "p-3" : "p-4 md:p-5",
      className
    )}>
      <div className={cn("flex justify-between gap-3", isCompact ? "items-center" : "items-start")}>
        <div className={cn("min-w-0 flex-1 overflow-hidden", isCompact ? "space-y-0" : "space-y-1")}>
          <p className={cn(
            "font-semibold text-muted-foreground uppercase tracking-wider truncate",
            isCompact ? "text-[11px]" : "text-xs md:text-xs"
          )}>
            {title}
          </p>
          <p
            className={cn(
              "text-xl md:text-2xl font-bold tracking-tight whitespace-nowrap overflow-hidden text-ellipsis block w-full",
              variant === 'positive' && 'text-green-500 dark:text-green-500 md:dark:text-emerald-400',
              variant === 'negative' && 'text-red-500 dark:text-red-500 md:dark:text-rose-400',
              variant === 'neutral' && 'text-blue-500 dark:text-blue-500 md:dark:text-blue-400',
            )}
            title={displayValue}
          >
            {displayValue}
          </p>
          {subtitle && !isCompact && (
            <p className="text-xs md:text-xs text-muted-foreground line-clamp-1 mt-0.5 opacity-70 italic">{subtitle}</p>
          )}
        </div>
        <div className={cn(
          "rounded-full shrink-0 flex items-center justify-center transition-transform",
          isCompact ? "p-2 w-8 h-8" : "p-3 w-10 h-10 md:w-12 md:h-12",
          variant === 'positive' && 'bg-green-500/20 text-green-600 dark:bg-green-500/20 dark:text-green-400 md:dark:bg-emerald-500/10 md:dark:text-emerald-400',
          variant === 'negative' && 'bg-red-500/20 text-red-600 dark:bg-red-500/20 dark:text-red-400 md:dark:bg-rose-500/10 md:dark:text-rose-400',
          variant === 'neutral' && 'bg-blue-500/20 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 md:dark:bg-blue-500/10 md:dark:text-blue-400',
          variant === 'default' && 'bg-muted/50 text-muted-foreground',
        )}>
          {icon}
        </div>
      </div>
    </div>
  );
}
