import { 
    LayoutDashboard, 
    ArrowUpDown, 
    Receipt, 
    CreditCard, 
    Wallet, 
    Rocket, 
    TrendingDown, 
    LineChart, 
    Settings2, 
    Database, 
    Calculator, 
    User,
    Shield,
    Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMobileShortcuts, ShortcutId } from '@/hooks/useMobileShortcuts';

interface NavItem {
    id: ShortcutId;
    icon: any;
    label: string;
}

const ALL_NAV_ITEMS: Record<ShortcutId, NavItem> = {
    dashboard: { id: 'dashboard', icon: LayoutDashboard, label: 'Início' },
    transactions: { id: 'transactions', icon: ArrowUpDown, label: 'Lançamentos' },
    cards: { id: 'cards', icon: CreditCard, label: 'Cartões' },
    bills: { id: 'bills', icon: Receipt, label: 'Fixas' },
    accounts: { id: 'accounts', icon: Wallet, label: 'Bancos' },
    goals: { id: 'goals', icon: Rocket, label: 'Projetos' },
    debts: { id: 'debts', icon: TrendingDown, label: 'Dívidas' },
    reports: { id: 'reports', icon: LineChart, label: 'Gráficos' },
    categories: { id: 'categories', icon: Settings2, label: 'Categorias' },
    export: { id: 'export', icon: Database, label: 'Dados' },
    simulator: { id: 'simulator', icon: Calculator, label: 'Simulador' },
    emergency: { id: 'emergency', icon: Shield, label: 'Reserva' },
    profile: { id: 'profile', icon: User, label: 'Perfil' },
};

interface BottomNavigationProps {
    activeView: string;
    onViewChange: (view: string) => void;
}

export function BottomNavigation({ activeView, onViewChange }: BottomNavigationProps) {
    const { shortcuts } = useMobileShortcuts();

    if (!shortcuts || shortcuts.length === 0) {
        // Fallback: renderiza apenas o botão de Menu para o drawer
        return (
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-background/80 backdrop-blur-md border-t border-gray-100 dark:border-zinc-800 pb-safe shadow-lg dark:shadow-none">
                <div className="flex justify-center items-center h-16 px-2">
                    <button
                        onClick={() => onViewChange('menu')}
                        aria-label="Abrir menu de navegação"
                        className="flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-all duration-300 text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-zinc-300"
                    >
                        <div className="p-1.5 rounded-full bg-transparent">
                            <Menu className="w-5 h-5 stroke-[2px]" />
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest opacity-60">Menu</span>
                    </button>
                </div>
            </nav>
        );
    }

    const items = shortcuts.map(id => ALL_NAV_ITEMS[id]).filter(Boolean);

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-background/80 backdrop-blur-md border-t border-gray-100 dark:border-zinc-800 pb-safe shadow-lg dark:shadow-none">
            <div className="flex justify-around items-center h-16 px-2">
                {items.map((item) => {
                    const isActive = activeView === item.id;
                    const Icon = item.icon;

                    return (
                        <button
                            key={item.id}
                            onClick={() => onViewChange(item.id)}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-all duration-300",
                                isActive
                                    ? "text-primary scale-110"
                                    : "text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-zinc-300"
                            )}
                        >
                            <div className={cn(
                                "p-1.5 rounded-full transition-colors",
                                isActive ? "bg-primary/10" : "bg-transparent"
                            )}>
                                <Icon className={cn("w-5 h-5", isActive ? "text-primary stroke-[2.5px]" : "stroke-[2px]")} />
                            </div>
                            <span className={cn(
                                "text-xs font-black uppercase tracking-widest",
                                isActive ? "opacity-100" : "opacity-60"
                            )}>
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
