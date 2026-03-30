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
    invoiceStatus?: { text: string; color: string; icon: string } | null;
}

export function CreditCardVisual({
    card, usedLimit, availableLimit, onClick, className, invoiceStatus
}: CreditCardVisualProps) {
    const cardColor = card.color || '#3b82f6';
    const cardBank = (card.bank || 'Banco').toUpperCase();
    const cardName = card.name || 'Cartão';

    const percentageUsed = card.limit > 0 ? Math.min((usedLimit / card.limit) * 100, 100) : 0;

    return (
        <div
            onClick={onClick}
            className={cn(
                "relative rounded-2xl p-4 md:p-6 text-white overflow-hidden shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer group",
                "w-full h-[45vw] max-h-[180px] md:h-52",
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
                    <div className="flex flex-col items-end">
                        <div className="md:text-lg text-sm font-bold tracking-widest italic opacity-80">
                            {cardBank}
                        </div>
                        {invoiceStatus && (
                            <div className={cn(
                                "text-[8px] md:text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md mt-1 border border-white/10",
                                invoiceStatus.text === 'Vencida' ? "bg-red-500/40 text-white animate-pulse" : "text-white"
                            )}>
                                {invoiceStatus.icon} {invoiceStatus.text}
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-2 md:space-y-4">
                    <div className="flex justify-between items-end gap-3 min-w-0 flex-1 overflow-hidden">
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] md:text-xs opacity-75 mb-0.5 md:mb-1">Cartão</p>
                            <p
                                className="font-bold tracking-wider uppercase truncate block w-full text-xs md:text-base"
                                title={cardName}
                            >
                                {cardName}
                            </p>
                        </div>

                        <div className="text-right min-w-0 flex-shrink max-w-[55%]">
                            <p className="text-[10px] md:text-xs opacity-75 mb-0.5 md:mb-1 whitespace-nowrap">Limite Disponível</p>
                            <p
                                className="font-black text-[clamp(1rem,1.5vw,1.125rem)] truncate block w-full"
                                title={formatCurrency(availableLimit)}
                            >
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


