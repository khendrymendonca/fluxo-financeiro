import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, CardTexture } from '@/types/finance';
import { X, CalendarClock, Sparkles, Layers } from 'lucide-react';
import { ColorSelector } from '@/components/ui/ColorSelector';
import { CARD_TEXTURES } from '@/utils/cardTextures';
import { cn } from '@/lib/utils';

interface EditCardDialogProps {
    card: CreditCard;
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedCard: CreditCard) => void;
}

export function EditCardDialog({ card, isOpen, onClose, onSave }: EditCardDialogProps) {
    const [name, setName] = useState(card.name);
    const [bank, setBank] = useState(card.bank);
    const [limit, setLimit] = useState(card.limit.toString());
    const [color, setColor] = useState(card.color);
    const [texture, setTexture] = useState<CardTexture>(card.texture || 'solid');
    const [dueDay, setDueDay] = useState(card.dueDay.toString());
    const [closingDay, setClosingDay] = useState(card.closingDay.toString());
    const [showEffectiveDate, setShowEffectiveDate] = useState(false);
    const [effectiveDate, setEffectiveDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    useEffect(() => {
        if (parseInt(dueDay) !== card.dueDay || parseInt(closingDay) !== card.closingDay) {
            setShowEffectiveDate(true);
        } else {
            setShowEffectiveDate(false);
        }
    }, [dueDay, closingDay, card]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newDue = parseInt(dueDay);
        const newClosing = parseInt(closingDay);
        const updatedHistory = card.history ? [...card.history] : [];

        if (newDue !== card.dueDay || newClosing !== card.closingDay) {
            if (updatedHistory.length === 0) {
                updatedHistory.push({
                    dueDay: card.dueDay,
                    closingDay: card.closingDay,
                    effectiveDate: '2000-01-01'
                });
            }
            updatedHistory.push({
                dueDay: newDue,
                closingDay: newClosing,
                effectiveDate: effectiveDate
            });
        }

        onSave({
            ...card,
            name,
            bank,
            limit: parseFloat(limit),
            color,
            texture,
            dueDay: newDue,
            closingDay: newClosing,
            history: updatedHistory
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm animate-in fade-in">
            <div className="bg-card rounded-3xl shadow-xl w-full max-w-md md:max-w-lg flex flex-col p-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold tracking-tight">Editar Cartão</h2>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Nome do Cartão</Label>
                            <Input value={name} onChange={e => setName(e.target.value)} className="h-11 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Banco</Label>
                            <Input value={bank} onChange={e => setBank(e.target.value)} className="h-11 rounded-xl" />
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Limite (R$)</Label>
                        <Input type="number" value={limit} onChange={e => setLimit(e.target.value)} className="h-11 rounded-xl font-bold" />
                    </div>

                    <div className="space-y-3">
                        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 ml-1">
                            <Layers className="w-3.5 h-3.5" /> Acabamento Premium
                        </Label>
                        <div className="grid grid-cols-3 gap-2">
                            {(Object.keys(CARD_TEXTURES) as CardTexture[]).map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setTexture(t)}
                                    className={cn(
                                        "flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all",
                                        texture === t 
                                            ? "border-primary bg-primary/5 text-primary shadow-sm" 
                                            : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted"
                                    )}
                                >
                                    <div 
                                        className={cn("w-full h-8 rounded-lg relative overflow-hidden border border-white/10", t === 'black' ? "bg-zinc-950" : "bg-primary")}
                                        style={{ backgroundColor: t === 'black' ? '#09090b' : color }}
                                    >
                                        <div className={cn("absolute inset-0", CARD_TEXTURES[t].className)} style={CARD_TEXTURES[t].style} />
                                    </div>
                                    <span className="text-[9px] font-bold uppercase truncate">{CARD_TEXTURES[t].label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-muted/20 p-4 rounded-2xl border border-dashed border-border">
                        <ColorSelector
                            label="Cor Base"
                            selectedColor={color}
                            onSelect={setColor}
                        />
                    </div>

                    <div className="p-5 bg-muted/30 rounded-2xl space-y-4 border border-border">
                        <div className="flex items-center gap-2 mb-2">
                            <CalendarClock className="w-4 h-4 text-primary" />
                            <span className="font-bold text-xs uppercase tracking-widest text-primary">Configuração de Fatura</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold opacity-70">Dia Fechamento</Label>
                                <Input type="number" min="1" max="31" value={closingDay} onChange={e => setClosingDay(e.target.value)} className="h-11 rounded-xl bg-background" />
                                <p className="text-[10px] text-primary font-bold flex items-center gap-1 mt-1">
                                    <Sparkles className="w-3 h-3" /> Melhor dia: {(parseInt(closingDay) % 31) + 1}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold opacity-70">Dia Vencimento</Label>
                                <Input type="number" min="1" max="31" value={dueDay} onChange={e => setDueDay(e.target.value)} className="h-11 rounded-xl bg-background" />
                            </div>
                        </div>
                        {showEffectiveDate && (
                            <div className="pt-4 mt-2 border-t border-dashed border-border/50 animate-in slide-in-from-top-2">
                                <Label className="text-primary font-bold text-xs uppercase">A partir de quando?</Label>
                                <p className="text-[10px] text-muted-foreground mb-3 leading-tight">As faturas anteriores a esta data manterão os dias antigos.</p>
                                <Input
                                    type="date"
                                    min={format(new Date(), 'yyyy-MM-dd')}
                                    value={effectiveDate?.split('T')[0] || ''}
                                    onChange={e => setEffectiveDate(e.target.value)}
                                    className="h-11 rounded-xl bg-background"
                                />
                            </div>
                        )}
                    </div>
                    <Button type="submit" className="w-full h-14 rounded-2xl font-bold text-base shadow-lg shadow-primary/20 mt-2 active:scale-95 transition-transform">
                        Salvar Alterações
                    </Button>
                </form>
            </div>
        </div>
    );
}
