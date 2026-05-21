import { AppLogo } from '@/components/branding/AppLogo';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { LogOut, Menu, Settings2 } from 'lucide-react';

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
  return (
    <div className="flex w-full items-center justify-between gap-3">
      <button
        onClick={onGoHome}
        className="flex min-w-0 items-center gap-3 text-left text-primary transition-opacity hover:opacity-85"
        aria-label="Ir para o início"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/8 shadow-sm shadow-primary/10">
          <AppLogo className="h-7 w-7" />
        </div>
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
          <DropdownMenuContent align="end" className="w-44 rounded-2xl">
            <div className="px-3 py-2">
              <p className="truncate text-sm font-black text-foreground">{userName}</p>
            </div>
            <DropdownMenuItem className="font-bold" onClick={onOpenProfile}>
              <Settings2 className="mr-2 h-4 w-4" />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuItem className="font-bold text-rose-600 focus:text-rose-600" onClick={() => void onSignOut()}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
