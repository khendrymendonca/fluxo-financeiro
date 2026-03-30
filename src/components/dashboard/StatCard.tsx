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
      "card-elevated animate-fade-in overflow-hidden h-full w-full min-w-0",
      isCompact ? "p-3" : "p-4 sm:p-6",
      variant === 'positive' && 'border-l-4 border-l-success',
      variant === 'negative' && 'border-l-4 border-l-danger',
      variant === 'neutral' && 'border-l-4 border-l-info',
      className
    )}>
      <div className={cn("flex justify-between gap-2", isCompact ? "items-center" : "items-start")}>
        <div className={cn("min-w-0 flex-1 overflow-hidden", isCompact ? "space-y-0" : "space-y-1.5")}>
          <p className={cn(
            "font-bold text-muted-foreground uppercase tracking-widest truncate",
            isCompact ? "text-[8px]" : "text-[10px] sm:text-xs"
          )}>
            {title}
          </p>
          <p
            className={cn(
              "text-[clamp(1.2rem,2.5vw,1.8rem)] font-black truncate block w-full",
              variant === 'positive' && 'text-success',
              variant === 'negative' && 'text-danger',
              variant === 'neutral' && 'text-info',
            )}
            title={formatValue(value) as string}
          >
            {formatValue(value)}
          </p>
          {subtitle && !isCompact && (
            <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2 mt-1 opacity-80">{subtitle}</p>
          )}
        </div>
        <div className={cn(
          "rounded-2xl shrink-0 shadow-sm",
          isCompact ? "p-2" : "p-3",
          variant === 'positive' && 'bg-success/10 text-success',
          variant === 'negative' && 'bg-danger/10 text-danger',
          variant === 'neutral' && 'bg-info/10 text-info',
          variant === 'default' && 'bg-muted/50 text-muted-foreground',
        )}>
          {icon}
        </div>
      </div>
    </div>
  );
}
