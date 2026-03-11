import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard } from '@/types/finance';
import { X, CalendarClock } from 'lucide-react';
import { ColorSelector, APP_COLORS } from '@/components/ui/ColorSelector';

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

    const [dueDay, setDueDay] = useState(card.dueDay.toString());
    const [closingDay, setClosingDay] = useState(card.closingDay.toString());

    const [showEffectiveDate, setShowEffectiveDate] = useState(false);
    const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);

    // Check if dates changed to trigger "Effective Date" logic
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

        let updatedHistory = card.history ? [...card.history] : [];

        // If settings changed, we add to history
        if (newDue !== card.dueDay || newClosing !== card.closingDay) {
            // We push the NEW config with the effective date.
            // But what about the OLD config?
            // If we only push new, and effective date is Future.
            // We need to ensure the PAST is preserved.
            // So we should also push the CURRENT (Old) config with an effective date of... "Beginning of Time" or at least ensuring it exists?
            // Simpler: 
            // 1. Push Current State as History Entry (Effective: "2000-01-01" or similar if empty).
            // 2. Push New State as History Entry (Effective: Selected Date).

            if (updatedHistory.length === 0) {
                // Seed initial history with current values (assuming they were valid since "forever")
                updatedHistory.push({
                    dueDay: card.dueDay,
                    closingDay: card.closingDay,
                    effectiveDate: '2020-01-01'
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
            dueDay: newDue, // Update root to latest choice (User expectation: I changed it, I see it)
            closingDay: newClosing,
            history: updatedHistory
        });

        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm animate-in fade-in">
            <div className="bg-card rounded-3xl shadow-xl w-full max-w-md flex flex-col p-6 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold">Editar Cartão</h2>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Nome do Cartão</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Banco</Label>
                            <Input value={bank} onChange={e => setBank(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Limite (R$)</Label>
                            <Input type="number" value={limit} onChange={e => setLimit(e.target.value)} />
                        </div>
                    </div>

                    <ColorSelector
                        label="Cor do Cartão"
                        selectedColor={color}
                        onSelect={setColor}
                    />

                    <div className="p-4 bg-muted/30 rounded-xl space-y-4 border border-border">
                        <div className="flex items-center gap-2 mb-2">
                            <CalendarClock className="w-4 h-4 text-primary" />
                            <span className="font-medium text-sm">Configuração de Fatura</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Dia Fechamento</Label>
                                <Input type="number" min="1" max="31" value={closingDay} onChange={e => setClosingDay(e.target.value)} />
                                <p className="text-[10px] text-primary font-bold">
                                    ✨ Melhor dia para compra: {(parseInt(closingDay) % 31) + 1}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label>Dia Vencimento</Label>
                                <Input type="number" min="1" max="31" value={dueDay} onChange={e => setDueDay(e.target.value)} />
                            </div>
                        </div>

                        {showEffectiveDate && (
                            <div className="pt-2 border-t border-dashed border-border animate-in slide-in-from-top-2">
                                <Label className="text-primary font-semibold">A partir de quando?</Label>
                                <p className="text-xs text-muted-foreground mb-2">As faturas anteriores a esta data manterão os dias antigos.</p>
                                <Input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} className="bg-background" />
                            </div>
                        )}
                    </div>

                    <Button type="submit" className="w-full rounded-xl py-6 font-semibold mt-4">
                        Salvar Alterações
                    </Button>
                </form>
            </div>
        </div>
    );
}
