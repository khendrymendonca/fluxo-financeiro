import { LayoutDashboard, ArrowUpDown, Receipt } from 'lucide-react';
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
        { id: 'bills', icon: Receipt, label: 'Lançamentos' },
    ];

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
