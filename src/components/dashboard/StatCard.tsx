import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

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
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(val);
    }
    return val;
  };

  return (
    <div className={cn(
      "bg-card rounded-[1.5rem] border border-border/50 animate-fade-in overflow-hidden h-full w-full min-w-0 transition-all hover:shadow-md hover:border-border",
      isCompact ? "p-3" : "p-4 md:p-5",
      className
    )}>
      <div className={cn("flex justify-between gap-3", isCompact ? "items-center" : "items-start")}>
        <div className={cn("min-w-0 flex-1 overflow-hidden", isCompact ? "space-y-0" : "space-y-1")}>
          <p className={cn(
            "font-semibold text-muted-foreground uppercase tracking-wider truncate",
            isCompact ? "text-[8px]" : "text-[10px] md:text-xs"
          )}>
            {title}
          </p>
          <p
            className={cn(
              "text-xl md:text-lg lg:text-2xl font-bold tracking-tight truncate block w-full",
              variant === 'positive' && 'text-emerald-500 dark:text-emerald-400',
              variant === 'negative' && 'text-danger',
              variant === 'neutral' && 'text-info',
            )}
            title={formatValue(value) as string}
          >
            {formatValue(value)}
          </p>
          {subtitle && !isCompact && (
            <p className="text-[10px] md:text-xs text-muted-foreground line-clamp-1 mt-0.5 opacity-70 italic">{subtitle}</p>
          )}
        </div>
        <div className={cn(
          "rounded-full shrink-0 flex items-center justify-center transition-transform group-hover:scale-110",
          isCompact ? "p-2 w-8 h-8" : "p-3 w-10 h-10 md:w-12 md:h-12",
          variant === 'positive' && 'bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20',
          variant === 'negative' && 'bg-danger/10 text-danger dark:bg-danger/20',
          variant === 'neutral' && 'bg-info/10 text-info dark:bg-info/20',
          variant === 'default' && 'bg-muted/50 text-muted-foreground',
        )}>
          {icon}
        </div>
      </div>
    </div>
  );
}
