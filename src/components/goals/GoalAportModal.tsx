import { useState } from 'react';
import { X, ArrowRight, PiggyBank } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Account, SavingsGoal } from '@/types/finance';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { toast } from '@/components/ui/use-toast';
import { todayLocalString } from '@/utils/dateUtils';

interface GoalAportModalProps {
    goal: SavingsGoal;
    accounts: Account[];
    onClose: () => void;
}

export function GoalAportModal({ goal, accounts, onClose }: GoalAportModalProps) {
    const { transferBetweenAccounts, updateSavingsGoal, isTransferring } = useFinanceStore();
    const [amount, setAmount] = useState('');
    const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id || '');
    const [toAccountId, setToAccountId] = useState('');

    const handleAport = async () => {
        const val = parseFloat(amount);
        if (isNaN(val) || val <= 0) return;
        if (!fromAccountId || !toAccountId) {
            toast({ title: 'Selecione as contas de origem e destino', variant: 'destructive' });
            return;
        }

        if (fromAccountId === toAccountId) {
            toast({ title: 'As contas devem ser diferentes', variant: 'destructive' });
            return;
        }

        try {
            // 1. Executa a transferência Real entre contas
            await transferBetweenAccounts(
                fromAccountId,
                toAccountId,
                val,
                `Aporte Projeto: ${goal.name}`,
                todayLocalString()
            );

            // 2. Atualiza o saldo Virtual do Projeto
            await updateSavingsGoal({
                id: goal.id,
                updates: { currentAmount: (Number(goal.currentAmount) || 0) + val }
            });

            onClose();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm">
            <div className="bg-card rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in border border-border">
                <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
                    <div className="flex items-center gap-2">
                        <PiggyBank className="w-5 h-5 text-primary" />
                        <h2 className="font-black text-lg tracking-tight">Guardar Dinheiro</h2>
                    </div>
                    <button onClick={onClose} aria-label="Fechar" className="p-2 hover:bg-muted rounded-xl transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase text-zinc-500 ml-1">Origem (De onde sai?)</Label>
                            <select
                                value={fromAccountId}
                                onChange={(e) => setFromAccountId(e.target.value)}
                                className="w-full h-12 rounded-2xl border-2 border-muted bg-white dark:bg-zinc-950 px-4 font-bold outline-none focus:border-primary transition-all"
                            >
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name} (R$ {acc.balance.toLocaleString()})</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex justify-center -my-2 relative z-10">
                            <div className="bg-primary text-white p-2 rounded-full shadow-lg border-4 border-card">
                                <ArrowRight className="w-4 h-4 rotate-90" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase text-zinc-500 ml-1">Destino (Onde guardar?)</Label>
                            <select
                                value={toAccountId}
                                onChange={(e) => setToAccountId(e.target.value)}
                                className="w-full h-12 rounded-2xl border-2 border-muted bg-white dark:bg-zinc-950 px-4 font-bold outline-none focus:border-primary transition-all"
                            >
                                <option value="">Selecione o destino...</option>
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase text-zinc-500 ml-1">Valor do Aporte</Label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-primary">R$</span>
                            <Input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0,00"
                                className="h-14 rounded-2xl pl-12 text-2xl font-black border-2 border-muted focus:border-primary transition-all bg-white dark:bg-zinc-950 text-gray-900 dark:text-zinc-50"
                            />
                        </div>
                    </div>

                    <Button
                        onClick={handleAport}
                        disabled={isTransferring || !amount}
                        className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20"
                    >
                        {isTransferring ? 'Processando...' : 'Confirmar Aporte'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
