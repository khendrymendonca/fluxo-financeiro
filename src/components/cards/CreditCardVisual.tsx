import { CreditCard as CardType } from '@/types/finance';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/formatters';
import { CARD_TEXTURES } from '@/utils/cardTextures';

interface CreditCardVisualProps {
    card: CardType;
    usedLimit: number;
    availableLimit: number;
    onClick?: () => void;
    className?: string;
    invoiceStatus?: { text: string; color: string; icon: string } | null;
    isSelected?: boolean;
}

export function CreditCardVisual({
    card, usedLimit, availableLimit, onClick, className, invoiceStatus, isSelected
}: CreditCardVisualProps) {
    const cardColor = card.color || '#3b82f6';
    const cardBank = (card.bank || 'Banco').toUpperCase();
    const cardName = card.name || 'Cartão';
    const textureKey = card.texture || 'solid';
    const texture = CARD_TEXTURES[textureKey];

    const percentageUsed = card.limit > 0 ? Math.min((usedLimit / card.limit) * 100, 100) : 0;

    return (
        <div
            onClick={onClick}
            className={cn(
                "relative rounded-2xl p-5 md:p-6 text-white overflow-hidden shadow-lg transition-all duration-300 hover:shadow-xl cursor-pointer group border border-white/10",
                "w-full aspect-video min-h-[180px] flex flex-col justify-between",
                isSelected && "ring-4 ring-primary ring-offset-2 dark:ring-offset-background",
                textureKey === 'black' ? "bg-zinc-950" : "",
                className
            )}
            style={{
                backgroundColor: textureKey === 'black' ? '#09090b' : cardColor,
                background: textureKey === 'solid' 
                    ? `linear-gradient(135deg, ${cardColor} 0%, ${adjustColor(cardColor, -30)} 100%)` 
                    : undefined,
            }}
        >
            {/* Camada de Textura */}
            <div 
                className={cn("absolute inset-0 pointer-events-none", texture.className)} 
                style={texture.style}
            />

            <div className="relative z-10 flex flex-col justify-between h-full">
                {/* Topo: Instituição */}
                <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                        <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] opacity-70 mb-1 drop-shadow-sm">
                            {cardBank}
                        </span>
                    </div>
                    
                    {invoiceStatus && (
                        <div className={cn(
                            "text-[9px] md:text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-white/10 backdrop-blur-md border border-white/10 transition-colors shadow-sm",
                            invoiceStatus.text === 'Vencida' ? "bg-red-500/30 text-white animate-pulse" : "text-white/90"
                        )}>
                            {invoiceStatus.text}
                        </div>
                    )}
                </div>

                {/* Centro: Apelido do Cartão */}
                <div className="flex-1 flex items-center justify-center">
                    <h3 className="font-bold text-xl md:text-2xl tracking-wide text-white drop-shadow-md text-center px-4 uppercase">
                        {cardName}
                    </h3>
                </div>

                {/* Rodapé: Informações Financeiras */}
                <div className="space-y-3">
                    <div className="space-y-1">
                        <div className="flex justify-between items-end">
                            <div className="flex flex-col">
                                <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider opacity-60 drop-shadow-sm">Limite Disponível</span>
                                <span className="font-bold text-sm md:text-base tabular-nums drop-shadow-md">
                                    {formatCurrency(availableLimit)}
                                </span>
                            </div>
                            <span className="text-[10px] md:text-xs font-black opacity-60 tabular-nums">
                                {Math.min(percentageUsed, 100).toFixed(0)}%
                            </span>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="w-full h-1 bg-black/20 rounded-full overflow-hidden">
                            <div
                                className={cn("h-full transition-all duration-700 ease-out shadow-sm", percentageUsed > 90 ? "bg-red-400" : "bg-white")}
                                style={{ width: `${percentageUsed}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Subtle gloss effect (more evident on dark/textures) */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none" />
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
