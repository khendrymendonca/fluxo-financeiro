import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Transaction } from '@/types/finance';
import { useAnticipateInstallments } from '@/hooks/useTransactionMutations';
import { formatCurrency } from '@/utils/formatters';
import { AlertCircle, Zap } from 'lucide-react';

interface AnticipateInstallmentsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: Transaction;
}

export function AnticipateInstallmentsDialog({ isOpen, onClose, transaction }: AnticipateInstallmentsDialogProps) {
    const remainingCount = (transaction.installmentTotal || 0) - (transaction.installmentNumber || 0);
    const [installmentsToAnticipate, setInstallmentsToAnticipate] = useState(1);
    const [newDiscountedTotal, setNewDiscountedTotal] = useState(transaction.amount * (remainingCount + 1));
    const { mutateAsync: anticipate, isPending } = useAnticipateInstallments();

    useEffect(() => {
        // Valor padrão: valor da parcela atual + valor das parcelas que serão removidas
        const totalWithoutDiscount = transaction.amount * (installmentsToAnticipate + 1);
        setNewDiscountedTotal(totalWithoutDiscount);
    }, [installmentsToAnticipate, transaction.amount]);

    const handleConfirm = async () => {
        if (!transaction.installmentGroupId) return;

        try {
            await anticipate({
                transactionId: transaction.id,
                installmentsToAnticipate,
                newDiscountedTotal,
                installmentGroupId: transaction.installmentGroupId
            });
            onClose();
        } catch (error) {
            // Toast já tratado no hook
        }
    };

    if (remainingCount <= 0) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl font-black">
                        <Zap className="w-6 h-6 text-primary" /> Antecipar Parcelas
                    </DialogTitle>
                    <p className="text-muted-foreground text-sm">
                        Selecione quantas parcelas de <strong>{transaction.description}</strong> deseja antecipar para esta fatura.
                    </p>
                </DialogHeader>

                <div className="py-6 space-y-6">
                    <div className="space-y-3">
                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                            Quantas parcelas antecipar? (Máx: {remainingCount})
                        </label>
                        <div className="flex items-center gap-3">
                            <Input
                                type="number"
                                min={1}
                                max={remainingCount}
                                value={installmentsToAnticipate}
                                onChange={(e) => setInstallmentsToAnticipate(Math.min(remainingCount, Math.max(1, Number(e.target.value))))}
                                className="h-14 text-xl font-black rounded-2xl border-2 focus:border-primary"
                            />
                            <div className="text-xs font-bold text-muted-foreground bg-muted p-3 rounded-xl flex-1">
                                Removerá as parcelas de {Number(transaction.installmentNumber) + 1} a {Number(transaction.installmentNumber) + installmentsToAnticipate}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                            Novo Valor Total (Com Desconto)
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-xl text-muted-foreground">R$</span>
                            <Input
                                type="number"
                                value={newDiscountedTotal}
                                onChange={(e) => setNewDiscountedTotal(Number(e.target.value))}
                                className="h-16 pl-12 text-2xl font-black rounded-2xl border-2 border-primary bg-primary/5 focus:ring-0 focus:border-primary"
                            />
                        </div>
                        <p className="text-[10px] text-muted-foreground font-bold flex items-center gap-1 ml-1">
                            <AlertCircle className="w-3 h-3" /> Valor sem antecipação: {formatCurrency(transaction.amount * (installmentsToAnticipate + 1))}
                        </p>
                    </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button variant="ghost" onClick={onClose} className="font-bold rounded-xl h-12">
                        Desistir
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={isPending}
                        className="font-black rounded-xl h-12 px-8 shadow-lg shadow-primary/20 gap-2"
                    >
                        {isPending ? 'Processando...' : 'Confirmar Antecipação'}
                        <Zap className="w-4 h-4 fill-current" />
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
