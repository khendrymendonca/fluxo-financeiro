import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  variant?: 'positive' | 'negative' | 'neutral' | 'default';
  className?: string;
}

export function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  variant = 'default',
  className 
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
      "card-elevated p-4 sm:p-5 animate-fade-in overflow-hidden",
      variant === 'positive' && 'border-l-4 border-l-success',
      variant === 'negative' && 'border-l-4 border-l-danger',
      variant === 'neutral' && 'border-l-4 border-l-info',
      className
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{title}</p>
          <p className={cn(
            "text-lg sm:text-xl lg:text-2xl font-semibold tracking-tight break-words",
            variant === 'positive' && 'text-success',
            variant === 'negative' && 'text-danger',
            variant === 'neutral' && 'text-info',
          )}>
            {formatValue(value)}
          </p>
          {subtitle && (
            <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2">{subtitle}</p>
          )}
        </div>
        <div className={cn(
          "p-2 sm:p-2.5 rounded-xl shrink-0",
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


