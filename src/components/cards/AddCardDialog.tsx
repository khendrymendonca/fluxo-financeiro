import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard } from '@/types/finance';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddCardDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (card: Omit<CreditCard, 'id'>) => void;
}

const COLORS = [
    '#8B5CF6', '#F97316', '#10B981', '#3B82F6', '#EC4899', '#14B8A6'
];

export function AddCardDialog({ isOpen, onClose, onAdd }: AddCardDialogProps) {
    const [name, setName] = useState('');
    const [bank, setBank] = useState('');
    const [limit, setLimit] = useState('');
    const [color, setColor] = useState(COLORS[0]);
    const [dueDay, setDueDay] = useState('10');
    const [closingDay, setClosingDay] = useState('3');

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

                    <div className="space-y-2">
                        <Label>Cor</Label>
                        <div className="flex gap-2">
                            {COLORS.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    className={cn(
                                        "w-8 h-8 rounded-lg transition-all",
                                        color === c && "ring-2 ring-offset-2 ring-foreground"
                                    )}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    </div>

                    <Button type="submit" className="w-full rounded-xl py-6 font-semibold mt-4">
                        Criar Cartão
                    </Button>
                </form>
            </div>
        </div>
    );
}
