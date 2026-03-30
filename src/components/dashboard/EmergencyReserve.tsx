import { Shield, TrendingUp, AlertCircle, Edit2, ArrowRightLeft, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Portal } from '@/components/ui/Portal';

interface EmergencyReserveProps {
    data: {
        monthlyFixed: number;
        targetAmount: number;
        currentAmount: number;
        progress: number;
        months: number;
        reserveAccounts?: any[];
    };
    onMonthsChange: (months: number) => void;
    accounts?: any[];
    onTransfer?: (fromId: string, toId: string, amount: number, description: string) => Promise<void>;
}

export function EmergencyReserve({ data, onMonthsChange, accounts = [], onTransfer }: EmergencyReserveProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [tempMonths, setTempMonths] = useState((data.months || 12).toString());

    // Transfer Modal State
    const [transferMode, setTransferMode] = useState<'deposit' | 'withdraw' | null>(null);
    const [transferAmount, setTransferAmount] = useState('');
    const [sourceAccount, setSourceAccount] = useState('');
    const [destinationAccount, setDestinationAccount] = useState('');

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    };

    const handleSave = () => {
        const val = parseInt(tempMonths);
        if (!isNaN(val) && val > 0) {
            onMonthsChange(val);
        }
        setIsEditing(false);
    };

    const handleExecuteTransfer = async () => {
        if (!sourceAccount || !destinationAccount || !transferAmount || !onTransfer) return;
        const amount = parseFloat(transferAmount);
        if (amount <= 0) return;

        await onTransfer(
            sourceAccount,
            destinationAccount,
            amount,
            transferMode === 'deposit' ? 'Aporte na Reserva de Emergência' : 'Resgate da Reserva de Emergência'
        );

        setTransferMode(null);
        setTransferAmount('');
        setSourceAccount('');
        setDestinationAccount('');
    };

    const progressValue = data.targetAmount > 0 ? (data.currentAmount / data.targetAmount) * 100 : 0;
    const remaining = Math.max(0, data.targetAmount - data.currentAmount);

    return (
        <div className="card-elevated p-6 space-y-6 relative overflow-hidden group h-full">
            {/* Background Glow */}
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all duration-500" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between relative gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                        <Shield className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">Reserva de Emergência</h3>
                        <div className="flex items-center gap-2">
                            {isEditing ? (
                                <div className="flex items-center gap-1">
                                    <Input
                                        type="number"
                                        value={tempMonths}
                                        onChange={e => setTempMonths(e.target.value)}
                                        className="h-6 w-12 p-1 text-xs"
                                    />
                                    <Button type="button" size="sm" className="h-6 px-2 text-xs" onClick={handleSave}>OK</Button>
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    Meta de {data.months} meses de custos fixos
                                    <button onClick={() => setIsEditing(true)} className="hover:text-primary transition-colors">
                                        <Edit2 className="w-3 h-3" />
                                    </button>
                                </p>
                            )}
                        </div>
                    </div>
                </div>
                <div className="text-left sm:text-right">
                    <span className="text-2xl font-black text-primary">
                        {progressValue.toFixed(1)}%
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-muted/30 border border-transparent hover:border-primary/10 transition-all">
                    <p className="text-[11px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Custo Fixo Mensal</p>
                    <p className="text-lg font-bold">{formatCurrency(data.monthlyFixed)}</p>
                </div>
                <div className="p-4 rounded-2xl bg-muted/30 border border-transparent hover:border-primary/10 transition-all">
                    <p className="text-[11px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Alvo ({data.months} Meses)</p>
                    <p className="text-lg font-bold text-primary">{formatCurrency(data.targetAmount)}</p>
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-success" />
                        Saldo Atual
                    </span>
                    <span className="font-bold">{formatCurrency(data.currentAmount)}</span>
                </div>

                <div className="h-3 w-full bg-muted rounded-full overflow-hidden p-0.5 border border-muted">
                    <div
                        className="h-full rounded-full bg-primary shadow-[0_0_12px_rgba(var(--primary),0.4)] transition-all duration-1000 ease-out"
                        style={{ width: `${Math.min(data.progress, 100)}%` }}
                    />
                </div>

                <div className="flex items-center gap-2 pt-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 rounded-xl text-xs font-bold border-success/30 text-success hover:bg-success/10 hover:border-success/50"
                        onClick={() => setTransferMode('deposit')}
                    >
                        <ArrowDownCircle className="w-3.5 h-3.5 mr-1" /> Aportar
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 rounded-xl text-xs font-bold border-danger/30 text-danger hover:bg-danger/10 hover:border-danger/50"
                        onClick={() => setTransferMode('withdraw')}
                    >
                        <ArrowUpCircle className="w-3.5 h-3.5 mr-1" /> Resgatar
                    </Button>
                </div>

                {data.targetAmount <= 0 ? null : remaining > 0 ? (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-warning/10 border border-warning/30">
                        <AlertCircle className="w-4 h-4 text-warning" />
                        <p className="text-xs font-medium text-foreground">
                            Faltam <span className="font-bold text-warning">{formatCurrency(remaining)}</span> para atingir sua meta.
                        </p>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-success/10 border border-success/30">
                        <div className="w-2 h-2 rounded-full bg-success animate-ping" />
                        <p className="text-xs font-bold uppercase tracking-tight text-success">Regra dos {data.months} meses atingida! 🎉</p>
                    </div>
                )}

                {data.reserveAccounts && data.reserveAccounts.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Saldos da Reserva</p>
                        <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                            {data.reserveAccounts.map((acc: any) => (
                                <div key={acc.id} className="flex items-center justify-between p-2.5 rounded-xl bg-background/50 border border-border/50 hover:border-primary/20 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: acc.color }} />
                                        <div>
                                            <p className="text-xs font-bold">{acc.name}</p>
                                            {acc.monthlyYieldRate > 0 && (
                                                <p className="text-[9px] text-success font-bold uppercase mt-0.5">+ {acc.monthlyYieldRate}% ao mês</p>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-xs font-black">{formatCurrency(acc.balance)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Transfer Modal */}
            {transferMode && (
                <Portal>
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setTransferMode(null)}
                    >
                        <div
                            className="bg-card rounded-2xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-200 border border-border"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-card rounded-t-2xl">
                                <div>
                                    <h2 className="text-lg font-black tracking-tight">
                                        {transferMode === 'deposit' ? 'Aportar na Reserva' : 'Resgatar da Reserva'}
                                    </h2>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {transferMode === 'deposit' ? 'Mova dinheiro de uma conta corrente para a reserva' : 'Mova dinheiro da reserva para uma conta corrente'}
                                    </p>
                                </div>
                                <div className={cn(
                                    "p-2 rounded-xl",
                                    transferMode === 'deposit' ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                                )}>
                                    {transferMode === 'deposit' ? <ArrowDownCircle className="w-5 h-5" /> : <ArrowUpCircle className="w-5 h-5" />}
                                </div>
                            </div>

                            <div className="p-5 space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase font-bold text-muted-foreground">Valor da Transferência</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">R$</span>
                                        <Input
                                            type="number"
                                            placeholder="0.00"
                                            value={transferAmount}
                                            onChange={(e) => setTransferAmount(e.target.value)}
                                            className="h-12 pl-10 text-lg font-bold"
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                                            {transferMode === 'deposit' ? 'Conta de Origem (Sairá daqui)' : 'Conta de Origem (Reserva)'}
                                        </Label>
                                        <select
                                            className="w-full h-11 rounded-xl border border-input bg-background px-3 py-2 text-sm font-bold truncate focus:ring-2 focus:ring-primary outline-none transition-all"
                                            value={sourceAccount}
                                            onChange={(e) => setSourceAccount(e.target.value)}
                                        >
                                            <option value="">Selecione a conta...</option>
                                            {accounts.map(acc => (
                                                <option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.balance)})</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex items-center justify-center -my-2">
                                        <div className="bg-muted p-1.5 rounded-full">
                                            <ArrowRightLeft className="w-4 h-4 text-primary rotate-90" />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                                            {transferMode === 'deposit' ? 'Conta de Destino (Reserva)' : 'Conta de Destino (Receberá)'}
                                        </Label>
                                        <select
                                            className="w-full h-11 rounded-xl border border-input bg-background px-3 py-2 text-sm font-bold truncate focus:ring-2 focus:ring-primary outline-none transition-all"
                                            value={destinationAccount}
                                            onChange={(e) => setDestinationAccount(e.target.value)}
                                        >
                                            <option value="">Selecione a conta...</option>
                                            {accounts.map(acc => (
                                                <option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.balance)})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="px-5 py-4 border-t border-border flex gap-2">
                                <Button
                                    variant="ghost"
                                    onClick={() => setTransferMode(null)}
                                    className="flex-1 rounded-xl text-sm font-bold"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleExecuteTransfer}
                                    className={cn(
                                        "flex-1 rounded-xl text-sm font-bold text-white shadow hover:scale-[1.02] transition-all",
                                        transferMode === 'deposit' ? "bg-success hover:bg-success/90" : "bg-danger hover:bg-danger/90"
                                    )}
                                >
                                    Confirmar
                                </Button>
                            </div>
                        </div>
                    </div>
                </Portal>
            )}
        </div>
    );
}


