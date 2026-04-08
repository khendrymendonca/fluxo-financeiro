import { useMemo } from 'react';
import { Shield, AlertCircle } from 'lucide-react';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { formatCurrency } from '@/utils/formatters';
import { PageHeader } from '@/components/ui/PageHeader';
import { useTransferBetweenAccounts } from '@/hooks/useAccountMutations';
import { toast } from '@/components/ui/use-toast';
import { EmergencyReserve } from '@/components/dashboard/EmergencyReserve';
import { todayLocalString } from '@/utils/dateUtils';

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

    const fallbackFixedCosts = monthlyFixedCosts > 0 ? monthlyFixedCosts : (cashflow.totalExpenses * 0.7);
    const targetAmount = fallbackFixedCosts * emergencyMonths;

    const reserveAccounts = accounts.filter(acc =>
        ['caixinha', 'poupanca', 'investment', 'metas'].includes(acc.accountType) ||
        acc.name.toLowerCase().includes('reserva')
    );

    const currentAmount = reserveAccounts.reduce((sum, acc) => sum + Number(acc.balance), 0);

    const handleTransfer = async (fromId: string, toId: string, amount: number, description: string) => {
        try {
            await transferBetweenAccounts({
                from: fromId,
                to: toId,
                amount,
                description,
                date: todayLocalString()
            });
            toast({ title: "Transferência realizada!", description: "Os saldos foram atualizados com sucesso." });
        } catch (error) {
            console.error('Transfer error:', error);
        }
    };

    const reserveData = {
        monthlyFixed: fallbackFixedCosts,
        targetAmount,
        currentAmount,
        progress: targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0,
        months: emergencyMonths,
        reserveAccounts
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto pb-24">
            <PageHeader title="Reserva de Emergência" icon={Shield} />

            <div className="grid grid-cols-1 gap-6">
                <EmergencyReserve
                    data={reserveData}
                    accounts={accounts}
                    onMonthsChange={setEmergencyMonths}
                    onTransfer={handleTransfer}
                />
            </div>

            {currentAmount < targetAmount && (
                <div className="p-6 rounded-3xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 flex gap-4">
                    <AlertCircle className="w-6 h-6 text-amber-500 shrink-0" />
                    <div>
                        <p className="font-bold text-amber-900 dark:text-amber-200">Continue focado!</p>
                        <p className="text-sm text-amber-700 dark:text-amber-400">
                            Sua reserva cobre aproximadamente {(currentAmount / (fallbackFixedCosts || 1)).toFixed(1)} meses de custos básicos.
                            Faltam {formatCurrency(Math.max(0, targetAmount - currentAmount))} para sua meta.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
