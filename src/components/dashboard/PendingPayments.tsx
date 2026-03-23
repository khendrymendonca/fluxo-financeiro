import { ArrowDownRight, CheckCircle2, Calendar } from 'lucide-react';
import { Transaction, Account, CreditCard } from '@/types/finance';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToggleTransactionPaid } from '@/hooks/useTransactionMutations';

const parseLocalDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
    return new Date(year, month - 1, day);
};

interface PendingPaymentsProps {
    transactions: Transaction[];
    accounts: Account[];
    creditCards: CreditCard[];
}

export function PendingPayments({ transactions, accounts, creditCards }: PendingPaymentsProps) {
    const { mutate: togglePaid } = useToggleTransactionPaid();

    const pending = transactions
        .filter(t => !t.isPaid && t.type === 'expense')
        .sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime());

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

    if (pending.length === 0) return null;

    return (
        <div className="card-elevated p-6 space-y-4">
            <div className="flex items-center justify-between">     
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />   
                    Contas a Pagar
                </h2>
                <span className="text-xs font-medium px-2 py-1 bg-primary/10 text-primary rounded-full">
                    {pending.length} pendentes
                </span>
            </div>

            <div className="space-y-3">
                {pending.map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-transparent hover:border-primary/20 transition-all group">
                        <div className="flex items-center gap-3">   
                            <div className="p-2 rounded-xl bg-danger/10 text-danger text-xs font-semibold">
                                {formatDate(t.date)}
                            </div>
                            <div>
                                <p className="font-semibold text-sm">{t.description}</p>
                                <p className="text-xs text-muted-foreground">{getSourceLabel(t)}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">   
                            <span className="font-bold text-sm text-danger">
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
                ))}
            </div>
        </div>
    );
}
