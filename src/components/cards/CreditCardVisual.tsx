import { CreditCard as CardType } from '@/types/finance';
import { cn } from '@/lib/utils';
import { Wifi, CreditCard as CreditCardIcon } from 'lucide-react';

interface CreditCardVisualProps {
    card: CardType;
    usedLimit: number;
    availableLimit: number;
    onClick?: () => void;
    className?: string;
}

export function CreditCardVisual({ card, usedLimit, availableLimit, onClick, className }: CreditCardVisualProps) {
    const percentageUsed = Math.min((usedLimit / card.limit) * 100, 100);

    return (
        <div
            onClick={onClick}
            className={cn(
                "relative w-full aspect-[1.586/1] rounded-2xl p-6 text-white overflow-hidden shadow-xl transition-transform hover:scale-[1.02] cursor-pointer group",
                className
            )}
            style={{
                background: `linear-gradient(135deg, ${card.color} 0%, ${adjustColor(card.color, -40)} 100%)`,
            }}
        >
            {/* Background patterns */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.8),transparent)]" />
            <div className="absolute top-0 right-0 p-8 opacity-10">
                <Wifi className="w-24 h-24" />
            </div>

            <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-7 bg-yellow-200/80 rounded flex items-center justify-center overflow-hidden relative">
                            <div className="absolute inset-0 border border-yellow-600/30 opacity-50" />
                            <div className="w-6 h-6 border rounded-full border-yellow-600/30 -ml-2" />
                            <div className="w-6 h-6 border rounded-full border-yellow-600/30 -mr-2" />
                        </div>
                        <Wifi className="w-4 h-4 rotate-90" />
                    </div>
                    <div className="text-lg font-bold tracking-widest italic opacity-80">
                        {card.bank.toUpperCase()}
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Chip Simulation */}

                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-xs opacity-75 mb-1">Titular</p>
                            <p className="font-medium tracking-wide uppercase truncate max-w-[200px]">
                                SEU NOME
                            </p>
                        </div>

                        <div className="text-right">
                            <p className="text-xs opacity-75 mb-1">Limite Disponível</p>
                            <p className="font-bold text-lg">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(availableLimit)}
                            </p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-black/20 rounded-full overflow-hidden">
                        <div
                            className={cn("h-full transition-all duration-500", percentageUsed > 90 ? "bg-red-400" : "bg-white/90")}
                            style={{ width: `${percentageUsed}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper to darken color
function adjustColor(color: string, amount: number) {
    return '#' + color.replace(/^#/, '').replace(/../g, color => ('0' + Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
}
