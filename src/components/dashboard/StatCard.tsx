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
      "card-elevated animate-fade-in overflow-hidden h-full w-full",
      isCompact ? "p-3" : "p-4 sm:p-6",
      variant === 'positive' && 'border-l-4 border-l-success',
      variant === 'negative' && 'border-l-4 border-l-danger',
      variant === 'neutral' && 'border-l-4 border-l-info',
      className
    )}>
      <div className={cn("flex justify-between gap-3", isCompact ? "items-center" : "items-start")}>
        <div className={cn("min-w-0 flex-1", isCompact ? "space-y-0" : "space-y-1.5")}>
          <p className={cn("font-bold text-muted-foreground uppercase tracking-widest truncate", isCompact ? "text-[8px]" : "text-[10px] sm:text-xs")}>{title}</p>
          <p className={cn(
            "font-black tracking-tighter break-words leading-tight",
            isCompact ? "text-lg" : "text-xl sm:text-2xl lg:text-3xl",
            variant === 'positive' && 'text-success',
            variant === 'negative' && 'text-danger',
            variant === 'neutral' && 'text-info',
          )}>
            {formatValue(value)}
          </p>
          {subtitle && !isCompact && (
            <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2 mt-1 opacity-80">{subtitle}</p>
          )}
        </div>
        <div className={cn(
          "rounded-2xl shrink-0 shadow-sm",
          isCompact ? "p-2" : "p-3 sm:p-4",
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


