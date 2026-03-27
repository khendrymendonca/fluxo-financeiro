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
      "card-elevated animate-fade-in overflow-hidden h-full",
      isCompact ? "p-3" : "p-4 sm:p-5",
      variant === 'positive' && 'border-l-4 border-l-success',
      variant === 'negative' && 'border-l-4 border-l-danger',
      variant === 'neutral' && 'border-l-4 border-l-info',
      className
    )}>
      <div className={cn("flex justify-between gap-2", isCompact ? "items-center" : "items-start")}>
        <div className={cn("min-w-0 flex-1", isCompact ? "space-y-0" : "space-y-1")}>
          <p className={cn("font-medium text-muted-foreground truncate", isCompact ? "text-[10px]" : "text-xs sm:text-sm")}>{title}</p>
          <p className={cn(
            "font-semibold tracking-tight break-words",
            isCompact ? "text-base" : "text-lg sm:text-xl lg:text-2xl",
            variant === 'positive' && 'text-success',
            variant === 'negative' && 'text-danger',
            variant === 'neutral' && 'text-info',
          )}>
            {formatValue(value)}
          </p>
          {subtitle && !isCompact && (
            <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2">{subtitle}</p>
          )}
        </div>
        <div className={cn(
          "rounded-xl shrink-0",
          isCompact ? "p-1.5" : "p-2 sm:p-2.5",
          variant === 'positive' && 'bg-success-light text-success',
          variant === 'negative' && 'bg-danger-light text-danger',
          variant === 'neutral' && 'bg-info-light text-info',
          variant === 'default' && 'bg-muted text-muted-foreground',
        )}>
          {icon}
        </div>
      </div>
    </div>
  );
}


