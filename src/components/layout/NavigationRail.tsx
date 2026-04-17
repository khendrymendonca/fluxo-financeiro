import {
  ArrowUpDown,
  Calculator,
  Database,
  LayoutDashboard,
  LineChart,
  List,
  LogOut,
  Moon,
  Receipt,
  Settings2,
  Sun,
  Shield,
  Zap,
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
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';
import { ReactNode, useState, useRef } from 'react';
import { Portal } from '@/components/ui/Portal';

// Grupos de navegação para cabeçalho compacto
const navGroups = [
  {
    label: 'Financeiro',
    items: [
      { id: 'bills', icon: Receipt, label: 'Gestão de Contas', featureKey: 'accounts' },
      { id: 'cards', icon: CardIcon, label: 'Cartões', featureKey: 'cards_dashboard' },
      { id: 'accounts', icon: Wallet, label: 'Minhas Contas', featureKey: 'accounts' },
      { id: 'transactions', icon: List, label: 'Lançamentos', featureKey: 'transactions' },
    ],
  },
  {
    label: 'Planejamento',
    items: [
      { id: 'projection', icon: TrendingUp, label: 'Projeção', featureKey: 'reports_dashboard' },
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
      { id: 'export', icon: Database, label: 'Exportar' },
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
    open ? onClose() : onOpen();
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
  { id: 'amoled', icon: Zap,  label: 'AMOLED' },
] as const;

function ThemeButton({ theme, setTheme }: { theme: string; setTheme: (t: string) => void }) {
  const [open, setOpen] = useState(false);
  const current = THEMES.find(t => t.id === theme) ?? THEMES[0];
  const Icon = current.icon;

  return (
    <div className="relative">
      {/* Botão gatilho */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-200 text-sm font-bold",
          "bg-muted/50 border-border hover:border-primary/40 hover:bg-primary/5",
          "text-foreground"
        )}
      >
        <Icon className="w-4 h-4 text-primary" />
        <span>{current.label}</span>
        <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
      </button>

      {/* Dropdown grid */}
      {open && (
        <>
          {/* Overlay para fechar ao clicar fora */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className={cn(
            "absolute right-0 top-full mt-2 z-50",
            "bg-card border border-border rounded-2xl shadow-xl p-3",
            "grid grid-cols-3 gap-2 w-52",
            "animate-in fade-in zoom-in-95 duration-150"
          )}>
            {THEMES.map((t) => {
              const TIcon = t.icon;
              const isActive = theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => { setTheme(t.id); setOpen(false); }}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200",
                    isActive
                      ? "bg-primary/10 border-primary text-primary"
                      : "border-transparent hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <TIcon className="w-5 h-5" />
                  <span className="text-xs font-bold">{t.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

interface NavigationRailProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export function NavigationRail({ currentView, onNavigate }: NavigationRailProps) {
  const { theme, setTheme } = useTheme();
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  return (
    <nav className="flex flex-col w-full">

      {/* ── LINHA 1: Logo (clicável) + Tema ── */}
      <div className="flex items-center justify-between px-6 pt-3 pb-1.5">

        {/* Logo clicável */}
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-3 shrink-0 group"
        >
          <div className="w-9 h-9 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform duration-200">
            <span className="text-primary-foreground font-bold text-base">F</span>
          </div>
          <span className="font-bold text-xl tracking-tight text-primary font-mono lowercase group-hover:opacity-80 transition-opacity duration-200">
            Fluxo
          </span>
        </button>

        {/* Tema */}
        <ThemeButton theme={theme} setTheme={setTheme} />
      </div>

      {/* ── LINHA 2: 🏠 + Grupos de nav ── */}
      <div className="flex flex-row items-center px-4 pb-2.5">

        {/* Botão casinha — fixo no início */}
        <button
          onClick={() => onNavigate('dashboard')}
          title="Início"
          className={cn(
            "flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200 shrink-0 mr-1",
            currentView === 'dashboard'
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Home className="w-5 h-5" />
        </button>

        {/* Separador visual */}
        <div className="w-px h-5 bg-border shrink-0 mr-1" />

        {/* Grupos — overflow SOMENTE aqui, no eixo X */}
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

    </nav>
  );
}
