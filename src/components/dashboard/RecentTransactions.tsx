import { Transaction, Account, CreditCard as CreditCardType } from '@/types/finance';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';

import { parseLocalDate } from '@/utils/dateUtils';

interface RecentTransactionsProps {
  transactions: Transaction[];
  accounts: Account[];
  creditCards: CreditCardType[];
}

export function RecentTransactions({ transactions, accounts, creditCards }: RecentTransactionsProps) {

  const formatDate = (dateString: string) => {
    return parseLocalDate(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
  };

  const { categories } = useFinanceStore();

  const getCategory = (transaction: Transaction) => {
    const cat = categories.find(c => c.id === transaction.categoryId);
    return { label: cat?.name || 'Outros' };
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

  const paidTransactions = transactions
    .filter(t => t.isPaid)
    .sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime())
    .slice(0, 10);

  if (paidTransactions.length === 0) {
    return (
      <div className="bg-card rounded-[2rem] p-4 border border-border/40 animate-fade-in h-full shadow-sm dark:shadow-none">
        <h3 className="text-base md:text-lg font-bold mb-4 text-foreground flex items-center gap-2">
          <div className="w-1.5 h-4 bg-primary rounded-full" />
          Últimas Transações
        </h3>
        <p className="text-muted-foreground text-center py-8 text-xs italic">
          Nenhuma transação efetuada
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-[2rem] p-4 border border-border/40 animate-fade-in shadow-sm dark:shadow-none transition-all">
      <h3 className="text-base md:text-lg font-bold mb-4 text-foreground flex items-center gap-2">
        <div className="w-1.5 h-4 bg-primary rounded-full" />
        Últimas Transações
      </h3>
      <div className="space-y-1">
        {paidTransactions.map((transaction, index) => {
          const category = getCategory(transaction);
          const isIncome = transaction.type === 'income';
          const sourceLabel = getSourceLabel(transaction);

          return (
            <div
              key={transaction.id}
              className="flex items-center justify-between p-2 md:p-2.5 rounded-xl hover:bg-muted/30 transition-all animate-fade-in group gap-3 border border-transparent hover:border-border/50"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={cn(
                  "p-2 rounded-lg transition-all group-hover:scale-110 shrink-0",
                  isIncome 
                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                    : "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400"
                )}>
                  {isIncome
                    ? <ArrowUpRight className="w-4 h-4" />
                    : <ArrowDownLeft className="w-4 h-4" />
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-xs md:text-sm truncate text-foreground tracking-tight">{transaction.description}</p>
                    {sourceLabel && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground/70 font-black uppercase tracking-tighter shrink-0 max-w-[80px] truncate border border-border/30">
                        {sourceLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] md:text-xs text-muted-foreground truncate font-medium">
                    {category?.label} • {formatDate(transaction.date)}
                  </p>
                </div>
              </div>
              <span className={cn(
                "font-bold text-xs md:text-sm shrink-0 whitespace-nowrap tabular-nums",
                isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
              )}>
                {isIncome ? '+' : '-'} {formatCurrency(Math.abs(Number(transaction.amount)))}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
