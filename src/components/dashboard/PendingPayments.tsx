import { useState } from 'react';
import { ArrowDownRight, CheckCircle2, Calendar, Filter } from 'lucide-react';
import { Transaction, Account, CreditCard } from '@/types/finance';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToggleTransactionPaid } from '@/hooks/useTransactionMutations';
import { addDays, endOfMonth, endOfYear, isBefore, startOfToday } from 'date-fns';

import { parseLocalDate } from '@/utils/dateUtils';

type FilterPeriod = 'semana' | 'quinzena' | 'mes' | 'ano';

interface PendingPaymentsProps {
    transactions: Transaction[];
    accounts: Account[];
    creditCards: CreditCard[];
}

export function PendingPayments({ transactions, accounts, creditCards }: PendingPaymentsProps) {
    const [period, setPeriod] = useState<FilterPeriod>('mes');
    const { mutate: togglePaid } = useToggleTransactionPaid();

    const getDeadline = (period: FilterPeriod) => {
        const today = startOfToday();
        switch (period) {
            case 'semana': return addDays(today, 7);
            case 'quinzena': return addDays(today, 15);
            case 'mes': return endOfMonth(today);
            case 'ano': return endOfYear(today);
            default: return endOfMonth(today);
        }
    };

    const deadline = getDeadline(period);
    const today = startOfToday();

    const pending = transactions
        .filter(t => {
            if (t.isPaid || t.type !== 'expense') return false;
            const tDate = parseLocalDate(t.date);
            // Mostrar se é antes do deadline ou se está atrasado (antes de hoje)
            return isBefore(tDate, deadline) || isBefore(tDate, today);
        })
        .sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    };

    const formatDate = (dateString: string) => {
        const date = parseLocalDate(dateString);
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    };

    const getSourceLabel = (transaction: Transaction) => {
        if (transaction.accountId) {
            return accounts.find(a => a.id === transaction.accountId)?.name || 'Conta';
        }
        if (transaction.cardId) {
            return creditCards.find(c => c.id === transaction.cardId)?.name || 'Cartão';
        }
        return '';
    };

    return (
        <div className="card-elevated p-6 space-y-4 h-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Contas a Pagar
                </h2>

                <div className="flex bg-muted p-1 rounded-xl">
                    {(['semana', 'quinzena', 'mes', 'ano'] as FilterPeriod[]).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={cn(
                                "px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all",
                                period === p
                                    ? "bg-background text-primary shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {p === 'quinzena' ? '15d' : p === 'semana' ? '7d' : p}
                        </button>
                    ))}
                </div>
            </div>

            {pending.length === 0 ? (
                <p className="text-muted-foreground text-center py-8 text-sm italic">
                    Nenhuma conta pendente para este período.
                </p>
            ) : (
                <div className="space-y-3">
                    {pending.map((t) => {
                        const isOverdue = isBefore(parseLocalDate(t.date), today);
                        return (
                            <div key={t.id} className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-transparent hover:border-primary/20 transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "p-2 rounded-xl text-xs font-semibold",
                                        isOverdue ? "bg-danger text-white shadow-lg shadow-danger/20" : "bg-danger/10 text-danger"
                                    )}>
                                        {formatDate(t.date)}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm">{t.description}</p>
                                        <p className="text-xs text-muted-foreground">{getSourceLabel(t)}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <span className={cn("font-bold text-sm", isOverdue ? "text-danger" : "text-muted-foreground")}>
                                        {formatCurrency(t.amount)}
                                    </span>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => togglePaid({ id: t.id, isPaid: true })}
                                        className="h-8 w-8 rounded-lg hover:bg-success/10 hover:text-success text-muted-foreground transition-colors"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}


