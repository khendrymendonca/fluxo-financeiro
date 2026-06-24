import {
  ArrowUpDown,
  Calculator,
  Database,
  LayoutDashboard,
  LineChart,
  LogOut,
  Moon,
  Receipt,
  Settings2,
  Settings,
  Sun,
  Shield,
  User,
  Rocket,
  Wallet,
  Home,
  CreditCard as CardIcon,
  BarChart3,
  History,
  TrendingDown,
  Target,
  ChevronDown,
  TrendingUp,
  UserCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';
import { ReactNode, useMemo, useState, useRef } from 'react';
import { Portal } from '@/components/ui/Portal';
import { AppLogo } from '@/components/branding/AppLogo';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getGreetingForHour, getUserDisplayName, getUserInitials } from '@/utils/userIdentity';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { useIsSuperAdmin } from '@/hooks/useFeatureFlags';

// Grupos de navegação para cabeçalho compacto
const navGroups = [
  {
    label: 'Financeiro',
    items: [
      { id: 'bills', icon: Receipt, label: 'Gestão de Contas', featureKey: 'accounts' },
      { id: 'cards', icon: CardIcon, label: 'Cartões', featureKey: 'cards_dashboard' },
      { id: 'accounts', icon: Wallet, label: 'Minhas Contas', featureKey: 'accounts' },
      { id: 'transactions', icon: ArrowUpDown, label: 'Lançamentos', featureKey: 'transactions' },
    ],
  },
  {
    label: 'Planejamento',
    items: [
      { id: 'emergency', icon: Shield, label: 'Reserva de Emergência', featureKey: 'emergency_fund' },
      { id: 'goals', icon: Rocket, label: 'Sonhos & Projetos', featureKey: 'goals_manager' },
      { id: 'debts', icon: History, label: 'Acordos', featureKey: 'debts_manager' },
      { id: 'simulator', icon: Calculator, label: 'Simulador', featureKey: 'simulator' },
    ],
  },
  {
    label: 'Análise',
    items: [
      { id: 'reports', icon: BarChart3, label: 'Relatórios', featureKey: 'reports_dashboard' },
      { id: 'categories', icon: Settings2, label: 'Categorias' },
      { id: 'export', icon: Database, label: 'Exportar', featureKey: 'export_data' },
    ],
  },
  {
    label: 'Conta',
    items: [
      { id: 'profile', icon: User, label: 'Meu Perfil' },
    ],
  },
];

function NavItemGuard({
  item,
  children,
}: {
  item: { featureKey?: string };
  children: ReactNode;
}) {
  const isEnabled = useFeatureFlag(item.featureKey ?? '');
  if (item.featureKey && !isEnabled) return null;
  return <>{children}</>;
}

function NavGroupDropdown({
  group,
  currentView,
  onNavigate,
  open,
  onOpen,
  onClose,
}: {
  group: typeof navGroups[number];
  currentView: string;
  onNavigate: (v: string) => void;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const isGroupActive = group.items.some(i => i.id === currentView);

  const handleOpen = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 6, left: rect.left });
    }
    if (open) {
      onClose();
    } else {
      onOpen();
    }
  };

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={handleOpen}
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap",
          isGroupActive || open
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        {group.label}
        <ChevronDown className={cn(
          "w-3.5 h-3.5 transition-transform duration-200",
          open && "rotate-180"
        )} />
      </button>

      {open && (
        <Portal>
          {/* Overlay para fechar ao clicar fora */}
          <div className="fixed inset-0 z-40" onClick={onClose} />

          {/* Dropdown — posicionado via fixed com coordenadas reais */}
          <div
            className={cn(
              "fixed z-50 min-w-[200px]",
              "bg-card border border-border rounded-2xl shadow-xl p-1.5",
              "flex flex-col gap-0.5",
              "animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-150"
            )}
            style={{ top: pos.top, left: pos.left }}
          >
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <NavItemGuard key={item.id} item={item}>
                  <button
                    onClick={() => { onNavigate(item.id); onClose(); }}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-left w-full",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </button>
                </NavItemGuard>
              );
            })}
          </div>
        </Portal>
      )}
    </div>
  );
}

const THEMES = [
  { id: 'light',  icon: Sun,  label: 'Claro'  },
  { id: 'dark',   icon: Moon, label: 'Escuro' },
] as const;

function ThemeButton({ theme, setTheme }: { theme: string; setTheme: (t: string) => void }) {
  const activeTheme = theme === 'dark' ? 'dark' : 'light';

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-2xl border border-border p-1 shadow-sm",
        activeTheme === 'dark'
          ? "bg-muted/55 backdrop-blur-sm"
          : "bg-muted"
      )}
      role="tablist"
      aria-label="Selecionar tema"
    >
      {THEMES.map((option) => {
        const OptionIcon = option.icon;
        const isActive = activeTheme === option.id;

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => setTheme(option.id)}
            className={cn(
              "inline-flex min-w-[104px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              isActive
                ? "bg-background text-foreground shadow-[0_10px_24px_rgba(15,23,42,0.10)] ring-1 ring-border"
                : "text-muted-foreground hover:bg-background/65 hover:text-foreground"
            )}
            aria-pressed={isActive}
          >
            <OptionIcon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

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

interface NavigationRailProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export function NavigationRail({ currentView, onNavigate }: NavigationRailProps) {
  const navigate = useNavigate();
  const isSuperAdmin = useIsSuperAdmin();
  const { theme, setTheme } = useTheme();
  let modoTorcida = false;
  try {
    const context = useThemeColor();
    modoTorcida = context?.modoTorcida || false;
  } catch {
    // Fallback para testes unitários sem provider
  }
  const { user, signOut } = useAuth();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const greeting = useMemo(() => getGreetingForHour(new Date().getHours()), []);
  const profileName = useMemo(() => getUserDisplayName(user), [user]);
  const profileInitials = useMemo(() => getUserInitials(user), [user]);

  return (
    <nav className="flex items-center justify-between w-full h-16 px-6 bg-card">
      
      {/* Lado Esquerdo: Logo + Início + Separador + Abas */}
      <div className="flex items-center gap-4 min-w-0 flex-1">
        {/* Logo clicável */}
        <div className="flex items-center shrink-0">
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center text-primary group"
          >
            <AppLogo className={cn(
              "group-hover:opacity-80 transition-opacity duration-200",
              modoTorcida ? "h-12 w-32" : "h-12 w-36"
            )} />
          </button>
        </div>

        {/* Separador visual */}
        <div className="w-px h-6 bg-border shrink-0" />

        {/* Botão casinha — fixo no início */}
        <button
          onClick={() => onNavigate('dashboard')}
          title="Início"
          className={cn(
            "flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200 shrink-0",
            currentView === 'dashboard'
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Home className="w-5 h-5" />
        </button>

        {/* Separador visual */}
        <div className="w-px h-6 bg-border shrink-0" />

        {/* Grupos — overflow horizontal */}
        <div className="flex flex-row items-center gap-0.5 overflow-x-auto no-scrollbar min-w-0">
          {navGroups.map((group) => (
            <NavGroupDropdown
              key={group.label}
              group={group}
              currentView={currentView}
              onNavigate={onNavigate}
              open={openGroup === group.label}
              onOpen={() => setOpenGroup(group.label)}
              onClose={() => setOpenGroup(null)}
            />
          ))}
        </div>
      </div>

      {/* Lado Direito: Saudação + Tema + Perfil */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="hidden lg:block min-w-0 text-right">
          <p className="truncate text-[10px] font-black text-muted-foreground leading-none mb-1">
            {greeting}
          </p>
          <p className="truncate text-sm font-black text-foreground leading-none">
            {profileName}
          </p>
        </div>
        
        <ThemeButton theme={theme} setTheme={setTheme} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-2.5 py-2 text-sm font-bold text-foreground transition-all hover:border-primary/30 hover:bg-primary/5"
              aria-label="Abrir menu de perfil"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-xs font-black text-primary">
                  {profileInitials}
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
            <DropdownMenuItem className="font-bold cursor-pointer" onClick={() => onNavigate('profile')}>
              <Settings className="mr-2 h-4 w-4" />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuItem className="font-bold text-rose-600 focus:text-rose-600 cursor-pointer" onClick={() => void signOut()}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

    </nav>
  );
}
