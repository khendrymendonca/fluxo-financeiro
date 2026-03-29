import { useState, useMemo } from 'react';
import { Shield, TrendingUp, ArrowDownCircle, ArrowUpCircle, AlertCircle, Info } from 'lucide-react';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { formatCurrency } from '@/utils/formatters';
import { PageHeader } from '@/components/ui/PageHeader';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTransferBetweenAccounts } from '@/hooks/useAccountMutations';
import { toast } from '@/components/ui/use-toast';

export default function EmergencyFund() {
    const {
        accounts,
        categories,
        currentMonthTransactions,
        viewDate,
        emergencyMonths,
        setEmergencyMonths
    } = useFinanceStore();

    const { cashflow } = useDashboardMetrics(viewDate, currentMonthTransactions);
    const { mutateAsync: transferBetweenAccounts } = useTransferBetweenAccounts();

    // Cálculo do Custo Fixo baseado em categorias marcadas como isFixed
    const monthlyFixedCosts = useMemo(() => {
        return categories
            .filter(c => c.isFixed && c.type === 'expense')
            .reduce((sum, cat) => {
                const catTotal = currentMonthTransactions
                    .filter(t => t.categoryId === cat.id && t.type === 'expense')
                    .reduce((s, t) => s + t.amount, 0);
                return sum + catTotal;
            }, 0);
    }, [categories, currentMonthTransactions]);

    const fallbackFixedCosts = monthlyFixedCosts > 0 ? monthlyFixedCosts : (cashflow.totalExpenses * 0.7); // Fallback se não houver categorias fixas
    const targetAmount = fallbackFixedCosts * emergencyMonths;

    // Contas do tipo 'poupanca' ou 'caixinha' ou marcadas como 'Reserva'
    const reserveAccounts = accounts.filter(acc =>
        ['caixinha', 'poupanca', 'investment'].includes(acc.accountType) ||
        acc.name.toLowerCase().includes('reserva')
    );

    const currentAmount = reserveAccounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
    const progress = Math.min((currentAmount / targetAmount) * 100, 100);
    const isTargetMet = currentAmount >= targetAmount;

    const handleQuickAdd = async () => {
        toast({ title: "Funcionalidade de Aporte Rápido", description: "Selecione uma conta de origem no Menu de Contas." });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto pb-24">
            <PageHeader title="Reserva de Emergência" icon={Shield} />

            {/* Main Card */}
            <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Shield className="w-32 h-32" />
                </div>

                <div className="space-y-8 relative z-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Saldo na Reserva</p>
                            <h2 className="text-5xl font-black tracking-tight">{formatCurrency(currentAmount)}</h2>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Meta Ideal ({emergencyMonths} meses)</p>
                            <p className="text-2xl font-bold text-zinc-500">{formatCurrency(targetAmount)}</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-end">
                            <span className="text-sm font-bold">{progress.toFixed(1)}% atingido</span>
                            <span className="text-[10px] font-black uppercase text-muted-foreground">Faltam {formatCurrency(Math.max(0, targetAmount - currentAmount))}</span>
                        </div>
                        <Progress value={progress} className="h-4 rounded-full bg-gray-100 dark:bg-zinc-800" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800">
                            <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">Custo Fixo Estimado</p>
                            <p className="font-bold">{formatCurrency(fallbackFixedCosts)} /mês</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800">
                            <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">Tempo de Segurança</p>
                            <p className="font-bold">{(currentAmount / (fallbackFixedCosts || 1)).toFixed(1)} meses</p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button className="flex-1 h-14 rounded-2xl font-bold gap-2 shadow-xl shadow-primary/20" onClick={handleQuickAdd}>
                            <ArrowDownCircle className="w-5 h-5" /> Adicionar Fundo
                        </Button>
                        <Button variant="outline" className="flex-1 h-14 rounded-2xl font-bold gap-2 border-zinc-200 dark:border-zinc-800" onClick={handleQuickAdd}>
                            <ArrowUpCircle className="w-5 h-5" /> Resgatar
                        </Button>
                    </div>
                </div>
            </div>

            {/* Accounts List */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold px-2">Onde seu dinheiro está guardado</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {reserveAccounts.map(acc => (
                        <div key={acc.id} className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-gray-100 dark:border-zinc-800 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: acc.color }} />
                                <div>
                                    <p className="font-bold text-gray-900 dark:text-white">{acc.name}</p>
                                    <p className="text-[10px] uppercase font-black text-zinc-500">{acc.institution || acc.bank}</p>
                                </div>
                            </div>
                            <p className="font-black text-lg">{formatCurrency(Number(acc.balance))}</p>
                        </div>
                    ))}
                </div>
            </div>

            {!isTargetMet && (
                <div className="p-6 rounded-3xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 flex gap-4">
                    <AlertCircle className="w-6 h-6 text-amber-500 shrink-0" />
                    <div>
                        <p className="font-bold text-amber-900 dark:text-amber-200">Continue focado!</p>
                        <p className="text-sm text-amber-700 dark:text-amber-400">Sua reserva de emergência é sua rede de segurança. No ritmo atual, sua reserva cobre aproximadamente {(currentAmount / (fallbackFixedCosts || 1)).toFixed(1)} meses.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
