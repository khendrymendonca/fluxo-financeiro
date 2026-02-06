import { Shield, TrendingUp, AlertCircle, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface EmergencyReserveProps {
    data: {
        monthlyFixed: number;
        targetAmount: number;
        currentAmount: number;
        progress: number;
        months: number;
    };
    onMonthsChange: (months: number) => void;
}

export function EmergencyReserve({ data, onMonthsChange }: EmergencyReserveProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [tempMonths, setTempMonths] = useState((data.months || 12).toString());

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

    const remaining = Math.max(0, data.targetAmount - data.currentAmount);

    return (
        <div className="card-elevated p-6 space-y-6 relative overflow-hidden group">
            {/* Background Glow */}
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all duration-500" />

            <div className="flex items-center justify-between relative">
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
                                        className="h-6 w-12 p-1 text-[10px]"
                                    />
                                    <Button size="icon" className="h-5 w-5" onClick={handleSave}>OK</Button>
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
                <div className="text-right">
                    <span className="text-2xl font-black text-primary">
                        {data.progress.toFixed(1)}%
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-muted/30 border border-transparent hover:border-primary/10 transition-all">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Custo Fixo Mensal</p>
                    <p className="text-lg font-bold">{formatCurrency(data.monthlyFixed)}</p>
                </div>
                <div className="p-4 rounded-2xl bg-muted/30 border border-transparent hover:border-primary/10 transition-all">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Alvo ({data.months} Meses)</p>
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

                {remaining > 0 ? (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-warning/5 border border-warning/10 text-warning-foreground animate-pulse">
                        <AlertCircle className="w-4 h-4" />
                        <p className="text-xs font-medium">
                            Faltam {formatCurrency(remaining)} para atingir sua meta.
                        </p>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-success/5 border border-success/10 text-success-foreground">
                        <div className="w-2 h-2 rounded-full bg-success animate-ping" />
                        <p className="text-xs font-bold uppercase tracking-tight">Regra dos {data.months} meses atingida! 🎉</p>
                    </div>
                )}
            </div>
        </div>
    );
}
