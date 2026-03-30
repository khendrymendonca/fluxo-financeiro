import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard } from '@/types/finance';
import { X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import { ColorSelector, APP_COLORS } from '@/components/ui/ColorSelector';

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
                                <Sparkles className="w-3 h-3" /> Melhor dia para compra: {parseInt(closingDay) === 31 ? 1 : parseInt(closingDay) + 1}
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

                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border">
                        <div className="space-y-0.5">
                            <Label className="text-xs font-bold">Fechamento Fixo?</Label>
                            <p className="text-[10px] text-muted-foreground">O fechamento ocorre sempre no mesmo dia do mês.</p>
                        </div>
                        <Switch
                            checked={isClosingDateFixed}
                            onCheckedChange={setIsClosingDateFixed}
                        />
                    </div>

                    <div className="bg-muted/20 p-4 rounded-2xl border border-dashed border-border">
                        <ColorSelector
                            label="Estética do Cartão"
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
