import { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Trash2, Filter, Pencil } from 'lucide-react';
import { Transaction } from '@/types/finance';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
}

export function TransactionList({ transactions, onDelete, onEdit }: TransactionListProps) {
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const { categories } = useFinanceStore();

  const getCategoryName = (transaction: Transaction) => {
    const cat = categories.find(c => c.id === transaction.categoryId);
    return cat ? cat.name : 'Outros';
  };

  const filteredTransactions = transactions
    .filter(t => filter === 'all' || t.type === filter)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Group by date
  const groupedTransactions = filteredTransactions.reduce((groups, transaction) => {
    const date = transaction.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(transaction);
    return groups;
  }, {} as Record<string, Transaction[]>);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="card-elevated p-4 flex flex-wrap gap-3 items-center">
        <div className="flex gap-2 p-1 bg-muted rounded-xl">
          {(['all', 'income', 'expense'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "py-2 px-4 rounded-lg font-medium text-sm transition-all",
                filter === f
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {f === 'all' ? 'Todos' : f === 'income' ? 'Receitas' : 'Despesas'}
            </button>
          ))}
        </div>

      </div>

      {/* Transaction Groups */}
      {Object.entries(groupedTransactions).length === 0 ? (
        <div className="card-elevated p-12 text-center">
          <p className="text-muted-foreground">Nenhuma transação encontrada</p>
        </div>
      ) : (
        Object.entries(groupedTransactions).map(([date, dayTransactions]) => (
          <div key={date} className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground px-2">
              {formatDate(date)}
            </p>
            <div className="card-elevated divide-y divide-border">
              {dayTransactions.map((transaction) => {
                const isIncome = transaction.type === 'income';

                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2.5 rounded-xl",
                        isIncome ? "bg-success-light" : "bg-danger-light"
                      )}>
                        {isIncome ? (
                          <ArrowUpRight className="w-5 h-5 text-success" />
                        ) : (
                          <ArrowDownRight className="w-5 h-5 text-danger" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {getCategoryName(transaction)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "font-semibold",
                        isIncome ? "text-success" : "text-danger"
                      )}>
                        {isIncome ? '+' : '-'} {formatCurrency(transaction.amount)}
                      </span>
                      <div className="flex opacity-0 group-hover:opacity-100 transition-all gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(transaction)}
                          className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(transaction.id)}
                          className="h-8 w-8 hover:bg-danger/10 hover:text-danger"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
