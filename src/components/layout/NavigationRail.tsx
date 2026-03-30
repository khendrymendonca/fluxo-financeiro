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
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';

const navItems = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Início' },
  { id: 'transactions', icon: List, label: 'Lançamentos' },
  { id: 'bills', icon: Receipt, label: 'Gestão de Contas' },
  { id: 'cards', icon: CardIcon, label: 'Cartões' },
  { id: 'accounts', icon: Wallet, label: 'Minhas Contas (Carteira)' },
  { id: 'emergency', icon: Shield, label: 'Reserva de Emergência' },
  { id: 'goals', icon: Rocket, label: 'Sonhos & Projetos' },
  { id: 'debts', icon: History, label: 'Acordos' },
  { id: 'reports', icon: BarChart3, label: 'Relatórios' },
  { id: 'categories', icon: Settings2, label: 'Categorias' },
  { id: 'simulator', icon: Calculator, label: 'Simulador' },
  { id: 'export', icon: Database, label: 'Exportar' },
  { id: 'profile', icon: User, label: 'Meu Perfil' },
];

interface NavigationRailProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export function NavigationRail({ currentView, onNavigate }: NavigationRailProps) {
  const { theme, setTheme } = useTheme();

  return (
    <nav
      className={cn(
        "hidden md:flex flex-col py-6 px-4 bg-white dark:bg-zinc-950 border-r border-gray-200 dark:border-zinc-800 h-screen transition-all duration-300 ease-in-out z-50",
        "w-80 relative shrink-0"
      )}
    >
      {/* Header with Logo */}
      <div className="flex items-center mb-8 px-2 justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
            <span className="text-primary-foreground font-bold text-lg">F</span>
          </div>
          <span className="font-bold text-xl tracking-tight text-primary font-mono lowercase">Fluxo</span>
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto overflow-x-hidden no-scrollbar py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "flex items-center rounded-2xl transition-all duration-200 group relative px-4 py-3 gap-3 w-full",
                isActive
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-gray-500 hover:bg-gray-100 dark:text-zinc-500 dark:hover:bg-zinc-900 hover:text-gray-900 dark:hover:text-zinc-50"
              )}
            >
              <Icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-primary")} />

              <span className={cn(
                "font-medium whitespace-nowrap overflow-hidden transition-all duration-300",
                isActive ? "text-primary opacity-100" : "opacity-80 group-hover:opacity-100"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto pt-6 border-t border-gray-100 dark:border-zinc-800 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-[10px] uppercase font-black tracking-widest text-gray-400 dark:text-zinc-500 mb-2 px-2">Aparência</p>
          <div className="grid grid-cols-3 gap-1">
            {[
              { id: 'light', icon: Sun, label: 'Claro' },
              { id: 'dark', icon: Moon, label: 'Escuro' },
              { id: 'amoled', icon: Zap, label: 'AMOLED' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id as any)}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all",
                  theme === t.id
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-gray-50 dark:bg-zinc-900 border-transparent text-gray-400 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-zinc-300"
                )}
              >
                <t.icon className="w-4 h-4" />
                <span className="text-[8px] font-bold">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}


