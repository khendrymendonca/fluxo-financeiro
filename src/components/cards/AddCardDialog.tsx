import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard } from '@/types/finance';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';

interface AddCardDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (card: Omit<CreditCard, 'id' | 'userId'>) => void;
}

import { ColorSelector, APP_COLORS } from '@/components/ui/ColorSelector';

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

        if (!name || !bank || !limit) return;

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
            <div className="bg-card rounded-3xl shadow-xl w-full max-w-md flex flex-col p-6 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold">Novo Cartão</h2>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Nome do Cartão</Label>
                        <Input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Ex: Nubank"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Banco/Bandeira</Label>
                        <Input
                            value={bank}
                            onChange={e => setBank(e.target.value)}
                            placeholder="Ex: Mastercard"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Limite (R$)</Label>
                        <Input
                            type="number"
                            value={limit}
                            onChange={e => setLimit(e.target.value)}
                            placeholder="0,00"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Dia Fechamento</Label>
                            <Input
                                type="number"
                                min="1"
                                max="31"
                                value={closingDay}
                                onChange={e => setClosingDay(e.target.value)}
                                required
                            />
                            <p className="text-[10px] text-primary font-bold animate-pulse">
                                âœ¨ Melhor dia para compra: {parseInt(closingDay) === 31 ? 1 : parseInt(closingDay) + 1}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label>Dia Vencimento</Label>
                            <Input
                                type="number"
                                min="1"
                                max="31"
                                value={dueDay}
                                onChange={e => setDueDay(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border">
                        <div className="space-y-0.5">
                            <Label>Fechamento Fixo?</Label>
                            <p className="text-[10px] text-muted-foreground">O fechamento ocorre sempre no mesmo dia do mês.</p>
                        </div>
                        <Switch
                            checked={isClosingDateFixed}
                            onCheckedChange={setIsClosingDateFixed}
                        />
                    </div>

                    <ColorSelector
                        label="Cor do Cartão"
                        selectedColor={color}
                        onSelect={setColor}
                    />

                    <Button type="submit" className="w-full rounded-xl py-6 font-semibold mt-4">
                        Criar Cartão
                    </Button>
                </form>
            </div>
        </div>
    );
}


