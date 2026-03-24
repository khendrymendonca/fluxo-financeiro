import { useState, useMemo } from 'react';
import { Debt } from '@/types/finance';
import { Calculator, Zap, Snowflake, TrendingDown, Clock, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/formatters';

interface DebtPayoffPlannerProps {
    debts: Debt[];
}

export function DebtPayoffPlanner({ debts }: DebtPayoffPlannerProps) {
    const [strategy, setStrategy] = useState<'avalanche' | 'snowball'>('avalanche');

    const sortedDebts = useMemo(() => {
        return [...debts].sort((a, b) => {
            if (strategy === 'avalanche') {
                return (b.interestRateMonthly || 0) - (a.interestRateMonthly || 0);
            } else {
                return a.remainingAmount - b.remainingAmount;
            }
        });
    }, [debts, strategy]);

    const stats = useMemo(() => {
        const totalRemaining = debts.reduce((sum, d) => sum + d.remainingAmount, 0);
        const avgInterest = debts.length > 0
            ? debts.reduce((sum, d) => sum + (d.interestRateMonthly || 0), 0) / debts.length
            : 0;

        // Simulação de cascata considerando juros compostos e estratégia (Avalanche/Snowball)
        const monthsToFreedom = (() => {
            let balances = sortedDebts.map(d => ({
                balance: d.remainingAmount,
                monthlyPayment: d.monthlyPayment || 0,
                interestRate: d.interestRateMonthly || 0
            }));

            let months = 0;
            const MAX_MONTHS = 600; // Cap de segurança (50 anos)

            while (balances.some(d => d.balance > 0) && months < MAX_MONTHS) {
                let extra = 0;
                // First, apply payments to the current priority debt
                // Then, distribute any extra payment to the next priority debt
                for (let i = 0; i < balances.length; i++) {
                    let d = balances[i];
                    if (d.balance <= 0) {
                        extra += d.monthlyPayment; // This debt is paid off, its payment becomes extra
                        continue;
                    }

                    const interest = d.balance * (d.interestRate / 100);
                    let paymentToApply = d.monthlyPayment + extra;

                    if (paymentToApply >= d.balance + interest) {
                        // Debt can be paid off this month
                        extra = paymentToApply - (d.balance + interest); // Remaining payment becomes extra
                        d.balance = 0;
                    } else {
                        // Debt cannot be paid off, apply payment and consume extra
                        d.balance = d.balance + interest - paymentToApply;
                        extra = 0; // Extra was consumed
                    }
                    balances[i] = { ...d }; // Update the balance in the array
                }
                months++;
            }
            return months;
        })();

        return {
            totalRemaining,
            avgInterest,
            monthsToFreedom
        };
    }, [debts]);


    if (debts.length === 0) return null;

    return (
        <div className="card-elevated p-6 space-y-6 bg-gradient-to-br from-card to-muted/30">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Calculator className="w-6 h-6 text-primary" />
                    <h3 className="text-xl font-bold">Plano de Quitação</h3>
                </div>
                <div className="flex gap-1 p-1 bg-muted rounded-xl">
                    <button
                        onClick={() => setStrategy('avalanche')}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                            strategy === 'avalanche' ? "bg-card shadow-sm text-primary" : "text-muted-foreground"
                        )}
                    >
                        <Zap className="w-3 h-3" /> Avalanche
                    </button>
                    <button
                        onClick={() => setStrategy('snowball')}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                            strategy === 'snowball' ? "bg-card shadow-sm text-primary" : "text-muted-foreground"
                        )}
                    >
                        <Snowflake className="w-3 h-3" /> Snowball
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-card p-4 rounded-2xl border border-border shadow-sm">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <TrendingDown className="w-4 h-4" />
                        <span className="text-xs font-medium">Total a Pagar</span>
                    </div>
                    <p className="text-xl font-bold text-danger">{formatCurrency(stats.totalRemaining)}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 font-medium">Juros médios: {stats.avgInterest.toFixed(1)}% a.m.</p>
                </div>
                <div className="bg-card p-4 rounded-2xl border border-border shadow-sm">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs font-medium">Tempo Estimado</span>
                    </div>
                    <p className="text-xl font-bold text-primary">{stats.monthsToFreedom} meses</p>
                </div>
                <div className="bg-card p-4 rounded-2xl border border-border shadow-sm">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <ShieldCheck className="w-4 h-4" />
                        <span className="text-xs font-medium">Status</span>
                    </div>
                    <p className="text-xl font-bold text-success">Em Progresso</p>
                </div>
            </div>

            <div className="space-y-3">
                <p className="text-sm font-semibold flex items-center gap-2">
                    Prioridade de Pagamento ({strategy === 'avalanche' ? 'Matemática/Juros' : 'Psicológica/Vitórias'})
                </p>
                <div className="space-y-2">
                    {sortedDebts.map((debt, index) => (
                        <div key={debt.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                            <div className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white",
                                index === 0 ? "bg-danger animate-pulse" : "bg-muted-foreground"
                            )}>
                                {index + 1}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium">{debt.name}</p>
                                <div className="flex gap-3 text-[10px] text-muted-foreground">
                                    <span>Saldo: {formatCurrency(debt.remainingAmount)}</span>
                                    <span>Juros: {debt.interestRateMonthly || 0}% a.m.</span>
                                </div>
                            </div>
                            {index === 0 && (
                                <div className="bg-danger/10 text-danger text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                    Focar Agora
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                <p className="text-xs leading-relaxed text-muted-foreground">
                    {strategy === 'avalanche'
                        ? "O método Avalanche foca na dívida com maior taxa de juros primeiro, economizando o máximo de dinheiro em juros ao longo do tempo."
                        : "O método Snowball foca na dívida com menor saldo primeiro, criando vitórias rápidas para manter sua motivação psicológica inabalável."
                    }
                </p>
            </div>
        </div>
    );
}


