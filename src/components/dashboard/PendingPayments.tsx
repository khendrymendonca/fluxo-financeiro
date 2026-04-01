import { useState } from 'react';
import { ArrowDownRight, CheckCircle2, Calendar, Filter, Clock } from 'lucide-react';
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
    const currentMonthStart = startOfMonth(today);

    const pending = transactions
        .filter(t => {
            if (t.isPaid || t.type !== 'expense') return false;

            // 🛡️ REGRA DE NEGÓCIO: Compras pontuais no cartão não são "Contas a Pagar" individuais.
            const isCard = !!t.cardId;
            const isRecurringOrInstallment = t.isRecurring || t.transactionType === 'recurring' || (t.installmentTotal && t.installmentTotal > 1);
            if (isCard && !isRecurringOrInstallment) return false;

            const tDate = parseLocalDate(t.date);
            
            // FILTRO DE RELEVÂNCIA: 
            // 1. Está dentro do período selecionado (semana, mes, etc)
            // 2. OU está atrasado, mas pertence ao mês atual (não mostra lixo de meses muito antigos)
            const isWithinPeriod = isBefore(tDate, deadline);
            const isCurrentMonthAtrasado = isBefore(tDate, today) && !isBefore(tDate, currentMonthStart);

            return isWithinPeriod || isCurrentMonthAtrasado;
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
            const acc = accounts.find(a => a.id === transaction.accountId);
            if (!acc) return 'Conta';
            return acc.name ? `${acc.bank} - ${acc.name}` : acc.bank;
        }
        if (transaction.cardId) {
            const card = creditCards.find(c => c.id === transaction.cardId);
            if (!card) return 'Cartão';
            return card.name ? `${card.bank} - ${card.name}` : card.bank;
        }
        return '';
    };

    return (
        <div className="bg-card rounded-[2rem] p-4 border border-border/40 space-y-4 h-full shadow-sm dark:shadow-none">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-base md:text-lg font-bold flex items-center gap-2">
                    <Calendar className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                    Contas a Pagar
                </h2>

                <div className="flex bg-muted p-0.5 rounded-lg">
                    {(['semana', 'quinzena', 'mes', 'ano'] as FilterPeriod[]).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={cn(
                                "px-2 py-1 text-[9px] font-black uppercase tracking-wider rounded-md transition-all",
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
                <p className="text-muted-foreground text-center py-8 text-xs italic">
                    Nenhuma conta pendente para este período.
                </p>
            ) : (
                <div className="space-y-1">
                    {pending.map((t) => {
                        const isOverdue = isBefore(parseLocalDate(t.date), today);
                        return (
                            <div key={t.id} className="flex items-center justify-between p-2 md:p-3 rounded-xl hover:bg-muted/30 transition-all group border border-transparent hover:border-border/50">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "flex flex-col items-center justify-center rounded-md py-1 px-2 min-w-[50px] transition-colors border",
                                        isOverdue
                                            ? "bg-red-500 text-white dark:bg-red-500 dark:text-white md:dark:bg-zinc-800 md:dark:text-rose-400 md:dark:border-zinc-700"
                                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 md:dark:bg-zinc-900 md:dark:border-zinc-800"
                                    )}>
                                        <span className="text-sm font-bold uppercase leading-none">
                                            {formatDate(t.date)}
                                        </span>
                                        {isOverdue && <span className="text-[8px] font-black uppercase tracking-tighter mt-0.5">Atrasado</span>}
                                    </div>
                                    <div className="flex flex-col">
                                        <p className="font-bold text-xs md:text-sm text-foreground leading-tight">{t.description}</p>
                                        <p className="text-[10px] md:text-xs text-muted-foreground font-medium uppercase tracking-tight">{getSourceLabel(t)}</p>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-0.5 shrink-0 ml-4">
                                    <span className={cn("text-sm font-semibold tabular-nums tracking-tight", isOverdue ? "text-rose-600 dark:text-rose-400" : "text-foreground")}>
                                        {formatCurrency(t.amount)}
                                    </span>
                                    <div className="flex items-center gap-1 text-[8px] md:text-[9px] font-black text-rose-500/60 dark:text-rose-400/60 uppercase tracking-widest">
                                        <Clock className="w-2.5 h-2.5" /> Pendente
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
