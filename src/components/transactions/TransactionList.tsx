import { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Trash2, Filter, Pencil } from 'lucide-react';
import { Transaction } from '@/types/finance';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Bill } from '@/types/finance';
import {
  CheckCircle2,
  Clock,
  Calendar,
  ShieldAlert,
  CreditCard as CardIcon
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface TransactionListProps {
  transactions: Transaction[];
  bills: Bill[];
  onDelete: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
  onPayBill: (billId: string, accountId: string, paymentDate: string) => Promise<void>;
}

export function TransactionList({ transactions, bills, onDelete, onEdit, onPayBill }: TransactionListProps) {
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [isPaying, setIsPaying] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState('');

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

  const { categories, accounts, debts, creditCards, getCardExpenses } = useFinanceStore();

  const getCategoryName = (transaction: Transaction) => {
    const cat = categories.find(c => c.id === transaction.categoryId);
    return cat ? cat.name : 'Outros';
  };

  // Convert bills to transaction-like objects for the list
  const pendingBills = bills.filter(b => b.status === 'pending');

  // Virtual bills from debts
  const debtBills = debts.map(debt => ({
    id: `debt-${debt.id}`,
    description: `Dívida: ${debt.name}`,
    amount: debt.monthlyPayment,
    type: 'expense' as const,
    date: new Date(new Date().setDate(debt.dueDay)).toISOString().split('T')[0],
    categoryId: 'debt-payment',
    isBill: true,
    billId: debt.id, // reference for payment if we had a debt-pay logic
    isVirtual: true,
    icon: ShieldAlert
  }));

  // Virtual bills from credit cards
  const cardBills = creditCards.map(card => {
    const amount = getCardExpenses(card.id);
    return {
      id: `card-${card.id}`,
      description: `Fatura: ${card.name}`,
      amount: amount,
      type: 'expense' as const,
      date: new Date(new Date().setDate(card.dueDay)).toISOString().split('T')[0],
      categoryId: 'card-payment',
      isBill: true,
      isVirtual: true,
      icon: CardIcon
    };
  }).filter(c => c.amount > 0);

  const displayItems = [
    ...transactions.map(t => ({ ...t, isBill: false })),
    ...pendingBills.map(b => ({
      id: b.id,
      description: b.name,
      amount: b.amount,
      type: b.type === 'payable' ? 'expense' as const : 'income' as const,
      date: b.dueDate,
      categoryId: b.categoryId,
      isBill: true,
      billId: b.id
    })),
    ...debtBills,
    ...cardBills
  ];

  const filteredItems = displayItems
    .filter(t => filter === 'all' || t.type === filter)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Group by date
  const groupedItems = filteredItems.reduce((groups, item) => {
    const date = item.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(item);
    return groups;
  }, {} as Record<string, any[]>);

  const handleBillPayment = async (billId: string) => {
    if (!selectedAccount) {
      toast({ title: 'Selecione uma conta', variant: 'destructive' });
      return;
    }
    await onPayBill(billId, selectedAccount, new Date().toISOString());
    setIsPaying(null);
    setSelectedAccount('');
  };

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
      {Object.entries(groupedItems).length === 0 ? (
        <div className="card-elevated p-12 text-center">
          <p className="text-muted-foreground">Nenhuma transação ou pendência encontrada</p>
        </div>
      ) : (
        Object.entries(groupedItems).map(([date, dayItems]) => (
          <div key={date} className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground px-2">
              {formatDate(date)}
            </p>
            <div className="card-elevated divide-y divide-border">
              {dayItems.map((item) => {
                const isIncome = item.type === 'income';
                const isPending = item.isBill;

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "flex flex-col md:flex-row md:items-center justify-between p-4 hover:bg-muted/30 transition-colors group gap-4",
                      isPending && "bg-primary/5 border-l-4 border-l-primary"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2.5 rounded-xl flex-shrink-0",
                        isPending ? "bg-primary/10 text-primary" : (isIncome ? "bg-success-light text-success" : "bg-danger-light text-danger")
                      )}>
                        {item.icon ? <item.icon className="w-5 h-5" /> : (
                          isPending ? <Clock className="w-5 h-5" /> : (isIncome ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />)
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold">{item.description}</p>
                          {isPending && <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">Pendente</span>}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.categoryId === 'debt-payment' ? 'Pagamento de Dívida' :
                            item.categoryId === 'card-payment' ? 'Fatura de Cartão' :
                              item.categoryId ? categories.find(c => c.id === item.categoryId)?.name || 'Outros' : 'Outros'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                      <span className={cn(
                        "font-black text-lg md:text-base",
                        isIncome ? "text-success" : "text-danger"
                      )}>
                        {isIncome ? '+' : '-'} {formatCurrency(item.amount)}
                      </span>

                      <div className="flex items-center gap-2 w-full md:w-auto">
                        {isPending ? (
                          <div className="flex items-center gap-2 w-full">
                            {isPaying === item.id ? (
                              <div className="flex items-center gap-1 animate-scale-in w-full">
                                <select
                                  className="h-9 rounded-lg border border-input bg-background px-2 py-1 text-[10px] font-bold uppercase flex-1 md:w-32"
                                  value={selectedAccount}
                                  onChange={(e) => setSelectedAccount(e.target.value)}
                                >
                                  <option value="">Pagar com?</option>
                                  {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                                  ))}
                                </select>
                                <Button
                                  size="sm"
                                  onClick={() => handleBillPayment(item.billId)}
                                  className="h-9 px-3 rounded-lg bg-success hover:bg-success/90 text-[10px] font-black uppercase"
                                >
                                  OK
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => { setIsPaying(null); setSelectedAccount(''); }}
                                  className="h-9 px-2 rounded-lg text-[10px] uppercase font-bold"
                                >
                                  X
                                </Button>
                              </div>
                            ) : (
                              <div className="flex gap-1 w-full">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setIsPaying(item.id)}
                                  disabled={item.isVirtual}
                                  className="w-full md:w-auto h-9 px-4 rounded-xl border-primary/30 text-primary hover:bg-primary/10 flex items-center gap-2 font-black uppercase text-[10px] tracking-wider transition-all hover:scale-105 active:scale-95"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                  Baixar Agora
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => onEdit(item as any)}
                                  className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary shrink-0"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all gap-1 justify-end w-full">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onEdit(item as any)}
                              className="h-9 w-9 rounded-lg hover:bg-primary/10 hover:text-primary"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onDelete(item.id)}
                              className="h-9 w-9 rounded-lg hover:bg-danger/10 hover:text-danger"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
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
