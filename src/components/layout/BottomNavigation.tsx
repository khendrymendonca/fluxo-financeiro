import { LayoutDashboard, ArrowUpDown, CreditCard, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
    id: string;
    icon: any;
    label: string;
}

interface BottomNavigationProps {
    activeView: string;
    onViewChange: (view: string) => void;
}

export function BottomNavigation({ activeView, onViewChange }: BottomNavigationProps) {
    const items: NavItem[] = [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Início' },
        { id: 'transactions', icon: ArrowUpDown, label: 'Extrato' },
        { id: 'cards', icon: CreditCard, label: 'Cartões' },
        { id: 'reports', icon: BarChart3, label: 'Relatórios' },
    ];

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/90 backdrop-blur-md border-t border-zinc-800 pb-safe">
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
                                isActive ? "text-primary scale-110" : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            <div className={cn(
                                "p-1.5 rounded-full transition-colors",
                                isActive ? "bg-primary/10" : "bg-transparent"
                            )}>
                                <Icon className={cn("w-5 h-5", isActive ? "stroke-[2.5px]" : "stroke-[2px]")} />
                            </div>
                            <span className={cn(
                                "text-[10px] font-black uppercase tracking-widest",
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
