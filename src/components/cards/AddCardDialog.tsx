import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, CardTexture } from '@/types/finance';
import { X, Sparkles, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import { ColorSelector, APP_COLORS } from '@/components/ui/ColorSelector';
import { CARD_TEXTURES } from '@/utils/cardTextures';

interface AddCardDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (card: Omit<CreditCard, 'id' | 'userId'>) => void;
}

export function AddCardDialog({ isOpen, onClose, onAdd }: AddCardDialogProps) {
    const [name, setName] = useState('');
    const [bank, setBank] = useState('');
    const [limit, setLimit] = useState('');
    const [color, setColor] = useState(APP_COLORS[0]);
    const [texture, setTexture] = useState<CardTexture>('solid');
    const [dueDay, setDueDay] = useState('10');
    const [closingDay, setClosingDay] = useState('3');
    const [isClosingDateFixed, setIsClosingDateFixed] = useState(true);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const errors: string[] = [];
        if (!name) errors.push('Nome do Cartão');
        if (!bank) errors.push('Banco/Bandeira');
        if (!limit || parseFloat(limit) <= 0) errors.push('Limite');

        if (errors.length > 0) {
            toast({
                title: 'Campos obrigatórios',
                description: `Preencha: ${errors.join(', ')}`,
                variant: 'destructive'
            });
            return;
        }

        onAdd({
            name,
            bank,
            limit: parseFloat(limit),
            color,
            texture,
            dueDay: parseInt(dueDay),
            closingDay: parseInt(closingDay),
            isClosingDateFixed,
            isActive: true,
        });

        // Reset form
        setName('');
        setBank('');
        setLimit('');
        setDueDay('10');
        setClosingDay('3');
        setTexture('solid');

        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm animate-in fade-in">
            <div className="bg-card rounded-3xl shadow-xl w-full max-w-md md:max-w-lg flex flex-col p-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold tracking-tight">Novo Cartão</h2>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Nome do Cartão</Label>
                            <Input
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Ex: Nubank"
                                className="h-11 rounded-xl"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Banco/Bandeira</Label>
                            <Input
                                value={bank}
                                onChange={e => setBank(e.target.value)}
                                placeholder="Ex: Mastercard"
                                className="h-11 rounded-xl"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Limite (R$)</Label>
                        <Input
                            type="number"
                            value={limit}
                            onChange={e => setLimit(e.target.value)}
                            placeholder="0,00"
                            className="h-11 rounded-xl font-bold"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Dia Fechamento</Label>
                            <Input
                                type="number"
                                min="1"
                                max="31"
                                value={closingDay}
                                onChange={e => setClosingDay(e.target.value)}
                                className="h-11 rounded-xl"
                                required
                            />
                            <p className="text-[10px] text-primary font-bold flex items-center gap-1 mt-1">
                                <Sparkles className="w-3 h-3" /> Melhor dia: {parseInt(closingDay) === 31 ? 1 : parseInt(closingDay) + 1}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Dia Vencimento</Label>
                            <Input
                                type="number"
                                min="1"
                                max="31"
                                value={dueDay}
                                onChange={e => setDueDay(e.target.value)}
                                className="h-11 rounded-xl"
                                required
                            />
                        </div>
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

                    <Button type="submit" className="w-full h-14 rounded-2xl font-bold text-base shadow-lg shadow-primary/20 mt-2 active:scale-95 transition-transform">
                        Criar Cartão
                    </Button>
                </form>
            </div>
        </div>
    );
}
