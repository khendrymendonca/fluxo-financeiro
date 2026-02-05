import {
  LayoutDashboard,
  ArrowUpDown,
  CreditCard,
  Target,
  Calculator,
  TrendingDown,
  Wallet,
  LineChart
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavigationRailProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

const navItems = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Painel', path: '/' },
  { id: 'transactions', icon: ArrowUpDown, label: 'Lançamentos', path: '/transactions' }, // Added path
  { id: 'cards', icon: CreditCard, label: 'Cartões', path: '/cards' }, // New item
  { id: 'accounts', icon: Wallet, label: 'Contas', path: '/accounts' }, // Changed icon to Wallet, added path
  { id: 'reports', icon: LineChart, label: 'Relatórios', path: '/reports' }, // New item
  { id: 'goals', icon: Target, label: 'Metas', path: '/goals' }, // Added path
  { id: 'debts', icon: TrendingDown, label: 'Dívidas', path: '/debts' }, // Added path
  { id: 'simulator', icon: Calculator, label: 'Simulador', path: '/simulator' }, // Added path
];

export function NavigationRail({ currentView, onNavigate }: NavigationRailProps) {
  return (
    <nav className="hidden md:flex flex-col items-center py-6 px-2 bg-card border-r border-border w-20 shrink-0">
      <div className="mb-8">
        <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-lg">F</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "nav-rail-item group relative",
                isActive && "active"
              )}
              title={item.label}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>

              {/* Tooltip on hover */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-foreground text-background text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                {item.label}
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
