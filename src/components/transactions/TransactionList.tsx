import { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Trash2, Filter } from 'lucide-react';
import { Transaction, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '@/types/finance';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
}

export function TransactionList({ transactions, onDelete }: TransactionListProps) {
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [searchDate, setSearchDate] = useState('');

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

  const getCategory = (transaction: Transaction) => {
    if (transaction.type === 'income') {
      return INCOME_CATEGORIES[transaction.category as keyof typeof INCOME_CATEGORIES];
    }
    return EXPENSE_CATEGORIES[transaction.category as keyof typeof EXPENSE_CATEGORIES];
  };

  const filteredTransactions = transactions
    .filter(t => filter === 'all' || t.type === filter)
    .filter(t => !searchDate || t.date.includes(searchDate))
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
        
        <div className="flex items-center gap-2 ml-auto">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Input
            type="month"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
            className="rounded-xl w-auto"
            placeholder="Filtrar por mês"
          />
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
                const category = getCategory(transaction);
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
                          {category?.label}
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
                      <button
                        onClick={() => onDelete(transaction.id)}
                        className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-danger-light text-danger transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
