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
      "card-elevated p-5 animate-fade-in",
      variant === 'positive' && 'border-l-4 border-l-success',
      variant === 'negative' && 'border-l-4 border-l-danger',
      variant === 'neutral' && 'border-l-4 border-l-info',
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className={cn(
            "text-2xl font-semibold tracking-tight",
            variant === 'positive' && 'text-success',
            variant === 'negative' && 'text-danger',
            variant === 'neutral' && 'text-info',
          )}>
            {formatValue(value)}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className={cn(
          "p-2.5 rounded-xl",
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
