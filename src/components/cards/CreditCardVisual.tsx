import { CreditCard as CardType } from '@/types/finance';
import { cn } from '@/lib/utils';
import { Wifi, CreditCard as CreditCardIcon } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';

interface CreditCardVisualProps {
    card: CardType;
    usedLimit: number;
    availableLimit: number;
    onClick?: () => void;
    className?: string;
}

export function CreditCardVisual({ card, usedLimit, availableLimit, onClick, className }: CreditCardVisualProps) {
    const cardColor = card.color || '#3b82f6';
    const cardBank = (card.bank || 'Banco').toUpperCase();
    const cardName = card.name || 'Cartão';

    const percentageUsed = card.limit > 0 ? Math.min((usedLimit / card.limit) * 100, 100) : 0;

    return (
        <div
            onClick={onClick}
            className={cn(
                "relative rounded-2xl p-4 md:p-6 text-white overflow-hidden shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer group",
                "w-[85vw] max-w-[320px] md:w-full md:max-w-none h-[45vw] max-h-[180px] md:h-52",
                className
            )}
            style={{
                background: `linear-gradient(135deg, ${cardColor} 0%, ${adjustColor(cardColor, -40)} 100%)`,
            }}
        >
            {/* Background patterns */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.8),transparent)]" />
            <div className="absolute top-0 right-0 p-4 md:p-8 opacity-10">
                <Wifi className="md:w-24 md:h-24 w-16 h-16" />
            </div>

            <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                        <div className="md:w-10 md:h-7 w-8 h-5 bg-yellow-200/80 rounded flex items-center justify-center overflow-hidden relative">
                            <div className="absolute inset-0 border border-yellow-600/30 opacity-50" />
                            <div className="w-6 h-6 border rounded-full border-yellow-600/30 -ml-2" />
                            <div className="w-6 h-6 border rounded-full border-yellow-600/30 -mr-2" />
                        </div>
                        <Wifi className="md:w-4 md:h-4 w-3 h-3 rotate-90" />
                    </div>
                    <div className="md:text-lg text-sm font-bold tracking-widest italic opacity-80">
                        {cardBank}
                    </div>
                </div>

                <div className="space-y-2 md:space-y-4">
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-[10px] md:text-xs opacity-75 mb-0.5 md:mb-1">Cartão</p>
                            <p className="font-bold tracking-wider uppercase truncate max-w-[150px] md:max-w-[200px] text-xs md:text-base">
                                {cardName}
                            </p>
                        </div>

                        <div className="text-right">
                            <p className="text-[10px] md:text-xs opacity-75 mb-0.5 md:mb-1">Limite Disponível</p>
                            <p className="font-bold text-sm md:text-lg">
                                {formatCurrency(availableLimit)}
                            </p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1 md:h-1.5 bg-black/20 rounded-full overflow-hidden">
                        <div
                            className={cn("h-full transition-all duration-500", percentageUsed > 90 ? "bg-red-400" : "bg-white/90")}
                            style={{ width: `${percentageUsed}%` }}
                        />
                    </div>
                    <div className="flex justify-between items-center text-[8px] md:text-[10px] opacity-75 font-medium -mt-1 md:-mt-2">
                        <span>Limite Utilizado</span>
                        <span>{Math.min(percentageUsed, 100).toFixed(1)}%</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper to darken color
function adjustColor(color: string = '#3b82f6', amount: number) {
    try {
        const hex = color.startsWith('#') ? color : '#3b82f6';
        return '#' + hex.replace(/^#/, '').replace(/../g, c => ('0' + Math.min(255, Math.max(0, parseInt(c, 16) + amount)).toString(16)).substr(-2));
    } catch (e) {
        return '#1e40af';
    }
}


