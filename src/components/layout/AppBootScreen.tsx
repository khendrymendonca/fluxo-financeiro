import { AppLogo } from '@/components/branding/AppLogo';
import { cn } from '@/lib/utils';

interface AppBootScreenProps {
  message?: string;
  detail?: string;
  className?: string;
}

export function AppBootScreen({
  message = 'Abrindo o Fluxo...',
  detail = 'Preparando seu ambiente financeiro',
  className,
}: AppBootScreenProps) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-[200] flex min-h-screen items-center justify-center bg-background text-foreground',
        className
      )}
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-5 px-8 text-center">
        <div className="text-primary animate-in fade-in zoom-in-95 duration-700">
          <AppLogo className="h-20 w-60" />
        </div>

        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-700">
          <p className="text-sm font-black uppercase tracking-widest text-primary">
            {message}
          </p>
          <p className="text-xs font-semibold text-muted-foreground">
            {detail}
          </p>
        </div>

        <div className="h-1 w-32 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/2 animate-[bootProgress_1.2s_ease-in-out_infinite] rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}
