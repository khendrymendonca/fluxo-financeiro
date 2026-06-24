import { AppLogo } from '@/components/branding/AppLogo';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useThemeColor } from '@/hooks/useThemeColor';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { LogOut, Menu, Settings, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useIsSuperAdmin } from '@/hooks/useFeatureFlags';

const BandeiraBrasilSvg = ({ className = "w-5 h-3.5" }: { className?: string }) => (
  <svg 
    viewBox="0 0 20 14" 
    className={cn("rounded-sm shadow-sm shrink-0", className)}
  >
    <rect width="20" height="14" fill="#009B3A" />
    <polygon points="10,2 18,7 10,12 2,7" fill="#FEDF00" />
    <circle cx="10" cy="7" r="3.2" fill="#002776" />
    <path d="M 6.8,7.3 Q 10,6 13.2,7.3" stroke="#FFFFFF" strokeWidth="0.5" fill="none" />
  </svg>
);

interface MobileTopHeaderProps {
  greeting: string;
  userName: string;
  userInitial: string;
  onGoHome: () => void;
  onOpenNavigation: () => void;
  onOpenProfile: () => void;
  onSignOut: () => void | Promise<void>;
}

export function MobileTopHeader({
  greeting,
  userName,
  userInitial,
  onGoHome,
  onOpenNavigation,
  onOpenProfile,
  onSignOut,
}: MobileTopHeaderProps) {
  const navigate = useNavigate();
  const isSuperAdmin = useIsSuperAdmin();
  let modoTorcida = false;
  try {
    const context = useThemeColor();
    modoTorcida = context?.modoTorcida || false;
  } catch {
    // Fallback para testes unitários sem provider
  }

  return (
    <div className="flex w-full items-center justify-between gap-3">
      <button
        onClick={onGoHome}
        className="flex min-w-0 items-center gap-3 text-left text-primary transition-opacity hover:opacity-85"
        aria-label="Ir para o início"
      >
        {modoTorcida ? (
          <AppLogo className="h-10 w-26 shrink-0" />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/8 shadow-sm shadow-primary/10">
            <AppLogo className="h-7 w-7" />
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">
            {greeting}
          </p>
          <p className="truncate text-lg font-black leading-tight text-foreground">
            {userName}
          </p>
        </div>
      </button>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onOpenNavigation}
          className="h-11 w-11 rounded-2xl border border-border/70 bg-card/80 shadow-sm"
          aria-label="Abrir menu de navegação"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/15 bg-card shadow-sm transition-colors hover:bg-primary/5"
              aria-label="Abrir menu de perfil"
            >
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-sm font-black text-primary">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-2xl">
            {isSuperAdmin && (
              <DropdownMenuItem className="font-bold text-white focus:text-white focus:bg-primary/10 cursor-pointer" onClick={() => navigate('/super')}>
                <Shield className="mr-2 h-4 w-4" />
                Painel Super
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="font-bold cursor-pointer" onClick={onOpenProfile}>
              <Settings className="mr-2 h-4 w-4" />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuItem className="font-bold text-rose-600 focus:text-rose-600 cursor-pointer" onClick={() => void onSignOut()}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
