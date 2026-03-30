import {
  LayoutDashboard,
  ArrowUpDown,
  CreditCard,
  Target,
  Calculator,
  TrendingDown,
  Receipt,
  Settings2,
  Database,
  Wallet,
  LineChart,
  User,
  Rocket
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

const navItems = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Home' },
  { id: 'transactions', icon: ArrowUpDown, label: 'Lançamentos' },
  { id: 'bills', icon: Receipt, label: 'Fixas' },
  { id: 'cards', icon: CreditCard, label: 'Cartões' },
  { id: 'accounts', icon: Wallet, label: 'Bancos' },
  { id: 'goals', icon: Rocket, label: 'Projetos' },
  { id: 'debts', icon: TrendingDown, label: 'Dívidas' },
  { id: 'reports', icon: LineChart, label: 'Gráficos' },
  { id: 'categories', icon: Settings2, label: 'Categorias' },
  { id: 'export', icon: Database, label: 'Dados' },
  { id: 'simulator', icon: Calculator, label: 'Simulador' },
  { id: 'profile', icon: User, label: 'Perfil' },
];

export function MobileNav({ currentView, onNavigate }: MobileNavProps) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40">
      <div className="flex justify-start items-center py-2 px-2 overflow-x-auto no-scrollbar scroll-smooth">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-xl transition-colors min-w-[60px]",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-xl transition-colors",
                isActive && "bg-primary/10"
              )}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
