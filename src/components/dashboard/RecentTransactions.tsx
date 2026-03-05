import { Transaction, Account, CreditCard as CreditCardType } from '@/types/finance';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { cn } from '@/lib/utils';

interface RecentTransactionsProps {
  transactions: Transaction[];
  accounts: Account[];
  creditCards: CreditCardType[];
}

export function RecentTransactions({ transactions, accounts, creditCards }: RecentTransactionsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
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
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  if (paidTransactions.length === 0) {
    return (
      <div className="card-elevated p-6 animate-fade-in">
        <h3 className="text-lg font-semibold mb-4 text-primary">Últimas Transações</h3>
        <p className="text-muted-foreground text-center py-8">
          Nenhuma transação efetuada
        </p>
      </div>
    );
  }

  return (
    <div className="card-elevated p-6 animate-fade-in">
      <h3 className="text-lg font-semibold mb-4 text-primary">Últimas Transações</h3>
      <div className="space-y-3">
        {paidTransactions.map((transaction, index) => {
          const category = getCategory(transaction);
          const isIncome = transaction.type === 'income';
          const sourceLabel = getSourceLabel(transaction);

          return (
            <div
              key={transaction.id}
              className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors animate-fade-in group"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-xl transition-all group-hover:scale-110",
                  isIncome ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                )}>
                  <div dangerouslySetInnerHTML={{ __html: isIncome ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><path d="M7 7h10v10"></path><path d="M7 17 17 7"></path></svg>' : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><path d="m7 7 10 10"></path><path d="M17 7v10H7"></path></svg>' }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{transaction.description}</p>
                    {sourceLabel && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
                        {sourceLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {category?.label} • {formatDate(transaction.date)}
                  </p>
                </div>
              </div>
              <span className={cn(
                "font-bold text-sm",
                isIncome ? "text-success" : "text-danger"
              )}>
                {isIncome ? '+' : '-'} {formatCurrency(transaction.amount)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
