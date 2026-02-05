import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Transaction, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '@/types/finance';
import { cn } from '@/lib/utils';

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
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

  const getCategory = (transaction: Transaction) => {
    if (transaction.type === 'income') {
      return INCOME_CATEGORIES[transaction.category as keyof typeof INCOME_CATEGORIES];
    }
    return EXPENSE_CATEGORIES[transaction.category as keyof typeof EXPENSE_CATEGORIES];
  };

  const recentTransactions = transactions.slice(0, 5);

  if (recentTransactions.length === 0) {
    return (
      <div className="card-elevated p-6 animate-fade-in">
        <h3 className="text-lg font-semibold mb-4">Últimas Transações</h3>
        <p className="text-muted-foreground text-center py-8">
          Nenhuma transação registrada
        </p>
      </div>
    );
  }

  return (
    <div className="card-elevated p-6 animate-fade-in">
      <h3 className="text-lg font-semibold mb-4">Últimas Transações</h3>
      <div className="space-y-3">
        {recentTransactions.map((transaction, index) => {
          const category = getCategory(transaction);
          const isIncome = transaction.type === 'income';
          
          return (
            <div 
              key={transaction.id}
              className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-xl",
                  isIncome ? "bg-success-light" : "bg-danger-light"
                )}>
                  {isIncome ? (
                    <ArrowUpRight className="w-4 h-4 text-success" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-danger" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm">{transaction.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {category?.label} • {formatDate(transaction.date)}
                  </p>
                </div>
              </div>
              <span className={cn(
                "font-semibold text-sm",
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
