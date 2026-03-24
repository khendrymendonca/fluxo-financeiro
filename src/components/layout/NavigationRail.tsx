import {
  LayoutDashboard,
  ArrowUpDown,
  CreditCard,
  Target,
  Calculator,
  TrendingDown,
  Wallet,
  LineChart,
  Receipt,
  Settings2,
  Database,
  ChevronLeft,
  ChevronRight,
  Palette,
  Sun
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useTheme } from '@/hooks/useTheme';

const navItems = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Painel' },
  { id: 'transactions', icon: ArrowUpDown, label: 'Lançamentos' },
  { id: 'bills', icon: Receipt, label: 'Contas Fixas' },
  { id: 'cards', icon: CreditCard, label: 'Cartões' },
  { id: 'accounts', icon: Wallet, label: 'Bancos' },
  { id: 'goals', icon: Target, label: 'Metas' },
  { id: 'debts', icon: TrendingDown, label: 'Dívidas' },
  { id: 'reports', icon: LineChart, label: 'Relatórios' },
  { id: 'categories', icon: Settings2, label: 'Categorias' },
  { id: 'export', icon: Database, label: 'Dados' },
  { id: 'simulator', icon: Calculator, label: 'Simulador' },
];

interface NavigationRailProps {
  currentView: string;
  onNavigate: (view: string) => void;
  isExpanded: boolean;
  onToggle: (expanded: boolean) => void;
}

export function NavigationRail({ currentView, onNavigate, isExpanded, onToggle }: NavigationRailProps) {
  const { theme, setTheme } = useTheme();

  const toggleSidebar = () => onToggle(!isExpanded);

  return (
    <nav
      className={cn(
        "hidden md:flex flex-col py-6 px-3 bg-card border-r border-border h-screen transition-all duration-300 ease-in-out shrink-0 sticky top-0 left-0 z-50",
        isExpanded ? "w-64" : "w-20"
      )}
    >
      {/* Header with Logo and Toggle */}
      <div className={cn(
        "flex items-center mb-8 px-2",
        isExpanded ? "justify-between" : "justify-center"
      )}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
            <span className="text-primary-foreground font-bold text-lg">F</span>
          </div>
          {isExpanded && <span className="font-bold text-xl tracking-tight text-primary font-mono lowercase">Fluxo</span>}
        </div>

        <button
          onClick={toggleSidebar}
          className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors"
        >
          {isExpanded ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
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
                "flex items-center rounded-2xl transition-all duration-200 group relative",
                isExpanded ? "px-4 py-3 gap-3 w-full" : "w-14 h-14 justify-center mx-auto",
                isActive
                  ? "bg-primary-light text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-primary")} />

              {isExpanded && (
                <span className={cn(
                  "font-medium whitespace-nowrap overflow-hidden transition-all duration-300",
                  isActive ? "text-primary opacity-100" : "opacity-80 group-hover:opacity-100"
                )}>
                  {item.label}
                </span>
              )}

              {/* Tooltip on hover (only when collapsed) */}
              {!isExpanded && (
                <div className="absolute left-full ml-3 px-3 py-2 bg-foreground text-background text-xs font-semibold rounded-xl opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100 pointer-events-none whitespace-nowrap z-50 shadow-xl border border-border/10">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Actions */}
      <div className="mt-auto pt-6 border-t border-border/50 flex flex-col gap-2">
        <button
          onClick={() => {
            const themes: ('original' | 'green-black')[] = ['original', 'green-black'];
            const nextIndex = (themes.indexOf(theme as any) + 1) % themes.length;
            setTheme(themes[nextIndex]);
          }}
          className={cn(
            "flex items-center rounded-2xl transition-all duration-200 group relative",
            isExpanded ? "px-4 py-3 gap-3 w-full" : "w-14 h-14 justify-center mx-auto",
            "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {theme === 'original' ? <Palette className="w-5 h-5" /> : <Sun className="w-5 h-5 text-primary" />}

          {isExpanded && (
            <span className="font-medium whitespace-nowrap overflow-hidden">
              Alterar Tema
            </span>
          )}

          {!isExpanded && (
            <div className="absolute left-full ml-3 px-3 py-2 bg-foreground text-background text-xs font-semibold rounded-xl opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100 pointer-events-none whitespace-nowrap z-50 shadow-xl">
              {theme === 'original' ? 'Verde-Black' : 'Pastel Original'}
            </div>
          )}
        </button>
      </div>
    </nav>
  );
}


