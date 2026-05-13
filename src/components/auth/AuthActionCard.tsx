import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AuthActionCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  children?: ReactNode;
  actions?: ReactNode;
  contentClassName?: string;
}

export function AuthActionCard({
  icon,
  title,
  description,
  children,
  actions,
  contentClassName,
}: AuthActionCardProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 animate-fade-in">
      <div className="w-full max-w-md bg-card p-8 rounded-3xl shadow-xl border border-border text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
          {icon}
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        </div>

        {children ? <div className={cn("space-y-4", contentClassName)}>{children}</div> : null}
        {actions ? <div className="space-y-3">{actions}</div> : null}
      </div>
    </div>
  );
}
