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
    const textureKey = (card.texture && CARD_TEXTURES[card.texture]) ? card.texture : 'solid';
    const texture = CARD_TEXTURES[textureKey];

    const percentageUsed = card.limit > 0 ? Math.min((usedLimit / card.limit) * 100, 100) : 0;

    return (
        <div
            onClick={onClick}
            className={cn(
                "relative rounded-2xl p-5 text-white overflow-hidden transition-all duration-500 cursor-pointer group border border-white/5",
                "w-full max-w-[340px] mx-auto aspect-[1.58/1] flex flex-col justify-between",
                isSelected ? "z-20" : "z-10",
                textureKey === 'black' ? "bg-zinc-950" : "",
                className
            )}
            style={{
                boxShadow: isSelected
                    ? '0 20px 40px rgba(0,0,0,0.35), 0 8px 16px rgba(0,0,0,0.20)'
                    : 'none',
                transition: 'box-shadow 300ms ease, transform 300ms ease',
                background: textureKey === 'black'
                    ? '#09090b'
                    : `linear-gradient(135deg, ${cardColor}30 0%, ${cardColor}15 60%, ${cardColor}08 100%)`,
                backgroundColor: textureKey === 'black' ? '#09090b' : cardColor,
            }}
        >
            {/* Camada de Textura - Processo Condicional via Spread Omissível */}
            {!texture.overrideColor && (
                <div
                    className={cn("absolute inset-0 pointer-events-none", texture.className)}
                    style={texture.style}
                />
            )}

            <div className="relative z-10 flex flex-col justify-between h-full">
                {/* Topo: Instituição */}
                <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 mb-1 drop-shadow-sm">
                            {cardBank}
                        </span>
                    </div>

                    {invoiceStatus && (
                        <div className={cn(
                            "text-[9px] font-black uppercase px-2.5 py-1 rounded-lg bg-white/10 backdrop-blur-md border border-white/10 transition-colors shadow-sm",
                            invoiceStatus.text === 'Vencida' ? "bg-red-500/30 text-white animate-pulse" : "text-white/90"
                        )}>
                            {invoiceStatus.text}
                        </div>
                    )}
                </div>

                {/* Centro: Apelido do Cartão - FLEX-1 E CENTERED */}
                <div className="flex-1 flex items-center justify-center">
                    <h3 className="font-bold text-lg md:text-xl tracking-wide text-white drop-shadow-md text-center px-2 uppercase line-clamp-2">
                        {cardName}
                    </h3>
                </div>

                {/* Rodapé: Informações Financeiras */}
                <div className="space-y-2">
                    <div className="space-y-1">
                        <div className="flex justify-between items-end">
                            <div className="flex flex-col">
                                <span className="text-[8px] font-bold uppercase tracking-wider opacity-60 drop-shadow-sm">Limite Disponível</span>
                                <span className="font-bold text-sm tabular-nums drop-shadow-md">
                                    {formatCurrency(availableLimit)}
                                </span>
                            </div>
                            <span className="text-[9px] font-black opacity-60 tabular-nums">
                                {Math.min(percentageUsed, 100).toFixed(0)}%
                            </span>
                        </div>

                        {/* Progress Bar Dinâmica */}
                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-2 relative">
                            <div
                                className={cn("h-full transition-all duration-700 ease-out shadow-sm", percentageUsed > 90 ? "bg-red-400" : "")}
                                style={{
                                    width: `${Math.min(percentageUsed, 100)}%`,
                                    background: percentageUsed > 90 ? undefined : (card.progressColor ?? "#ffffff"),
                                    opacity: 0.85,
                                }}
                            />
                        </div>
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
