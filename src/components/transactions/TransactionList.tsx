import { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Trash2, Filter, Pencil, FastForward, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [anticipatingIds, setAnticipatingIds] = useState<Set<string>>(new Set());
  const [anticipateAccount, setAnticipateAccount] = useState('');

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

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
    });
  };

  const { categories, accounts, debts, creditCards, getCardExpenses, togglePaid, transactions: allTransactions } = useFinanceStore();

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
    billId: debt.id,
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
    ...transactions.map(t => ({
      ...t,
      isBill: false,
      isPending: !t.isPaid
    })),
    ...pendingBills.map(b => ({
      id: b.id,
      description: b.name,
      amount: b.amount,
      type: b.type === 'payable' ? 'expense' as const : 'income' as const,
      date: b.dueDate,
      categoryId: b.categoryId,
      isBill: true,
      isPending: true,
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

  const handleApplyPayment = async (item: any) => {
    if (!selectedAccount) {
      toast({ title: 'Selecione uma conta', variant: 'destructive' });
      return;
    }

    if (item.isBill) {
      await onPayBill(item.billId, selectedAccount, new Date().toISOString());
    } else {
      await togglePaid(item.id, true, selectedAccount);
    }
    setIsPaying(null);
    setSelectedAccount('');
  };

  // Get future installments for a given group
  const getFutureInstallments = (groupId: string, currentInstallmentNumber: number) => {
    return allTransactions
      .filter(t =>
        t.installmentGroupId === groupId &&
        !t.isPaid &&
        (t.installmentNumber || 0) > currentInstallmentNumber
      )
      .sort((a, b) => (a.installmentNumber || 0) - (b.installmentNumber || 0));
  };

  const handleAnticipatePayment = async (installment: Transaction) => {
    if (!anticipateAccount) {
      toast({ title: 'Selecione uma conta para pagamento', variant: 'destructive' });
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    await togglePaid(installment.id, true, anticipateAccount, today);

    // Remove from anticipating set
    setAnticipatingIds(prev => {
      const next = new Set(prev);
      next.delete(installment.id);
      return next;
    });
  };

  const handleAnticipateAll = async (installments: Transaction[]) => {
    if (!anticipateAccount) {
      toast({ title: 'Selecione uma conta para pagamento', variant: 'destructive' });
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    for (const inst of installments) {
      if (!inst.isPaid) {
        await togglePaid(inst.id, true, anticipateAccount, today);
      }
    }
    setExpandedGroup(null);
    toast({ title: `${installments.length} parcelas antecipadas com sucesso!` });
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
                const isPending = item.isPending;
                const hasInstallmentGroup = item.installmentGroupId && !item.isBill;
                const isGroupExpanded = expandedGroup === item.installmentGroupId;
                const futureInstallments = hasInstallmentGroup
                  ? getFutureInstallments(item.installmentGroupId, item.installmentNumber || 0)
                  : [];

                return (
                  <div key={item.id}>
                    <div
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
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold">{item.description}</p>
                            {isPending && <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">Pendente</span>}
                            {item.installmentNumber && item.installmentTotal && (
                              <span className="text-[10px] bg-info/20 text-info px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">
                                {item.installmentNumber}/{item.installmentTotal}
                              </span>
                            )}
                            {item.paymentDate && item.paymentDate !== item.date && (
                              <span className="text-[10px] bg-success/20 text-success px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">
                                {isIncome ? 'Recebido em' : 'Pago em'} {formatShortDate(item.paymentDate)}
                              </span>
                            )}
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
                                    onClick={() => handleApplyPayment(item)}
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
                                <div className="flex gap-1 w-full flex-wrap">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setIsPaying(item.id)}
                                    disabled={item.isVirtual}
                                    className="flex-1 md:flex-none h-9 px-4 rounded-xl border-primary/30 text-primary hover:bg-primary/10 flex items-center gap-2 font-black uppercase text-[10px] tracking-wider transition-all hover:scale-105 active:scale-95"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                    Baixar Agora
                                  </Button>
                                  {hasInstallmentGroup && futureInstallments.length > 0 && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setExpandedGroup(isGroupExpanded ? null : item.installmentGroupId)}
                                      className="h-9 px-3 rounded-xl border-info/30 text-info hover:bg-info/10 flex items-center gap-1 font-black uppercase text-[10px] tracking-wider transition-all"
                                    >
                                      <FastForward className="w-4 h-4" />
                                      Antecipar
                                      {isGroupExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                    </Button>
                                  )}
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
                              {/* Antecipar button even for paid items in installment groups */}
                              {hasInstallmentGroup && futureInstallments.length > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setExpandedGroup(isGroupExpanded ? null : item.installmentGroupId)}
                                  className="h-9 px-3 rounded-xl border-info/30 text-info hover:bg-info/10 flex items-center gap-1 font-black uppercase text-[10px] tracking-wider transition-all"
                                >
                                  <FastForward className="w-4 h-4" />
                                  Antecipar
                                  {isGroupExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </Button>
                              )}
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

                    {/* Expanded: Future Installments Panel */}
                    {isGroupExpanded && hasInstallmentGroup && (
                      <div className="bg-info/5 border-t border-info/20 p-4 animate-fade-in">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                          <div>
                            <h4 className="text-sm font-black uppercase text-info tracking-wider flex items-center gap-2">
                              <FastForward className="w-4 h-4" />
                              Antecipar Parcelas Futuras
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {futureInstallments.length} parcela(s) pendente(s). A data de vencimento original será mantida.
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              className="h-9 rounded-lg border border-input bg-background px-2 py-1 text-xs font-bold flex-1 md:w-40"
                              value={anticipateAccount}
                              onChange={(e) => setAnticipateAccount(e.target.value)}
                            >
                              <option value="">Debitar de...</option>
                              {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                              ))}
                            </select>
                            <Button
                              size="sm"
                              onClick={() => handleAnticipateAll(futureInstallments)}
                              className="h-9 px-4 rounded-xl bg-info hover:bg-info/90 text-white font-black uppercase text-[10px] tracking-wider"
                            >
                              Antecipar Todas ({futureInstallments.length})
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-1 max-h-60 overflow-y-auto">
                          {futureInstallments.map(inst => (
                            <div
                              key={inst.id}
                              className={cn(
                                "flex items-center justify-between p-3 rounded-xl bg-background/60 border border-border/50 transition-all",
                                anticipatingIds.has(inst.id) && "border-info/50 bg-info/10"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={anticipatingIds.has(inst.id)}
                                  onChange={(e) => {
                                    setAnticipatingIds(prev => {
                                      const next = new Set(prev);
                                      e.target.checked ? next.add(inst.id) : next.delete(inst.id);
                                      return next;
                                    });
                                  }}
                                  className="w-4 h-4 rounded"
                                />
                                <div>
                                  <span className="text-xs font-black text-info">
                                    Parcela {inst.installmentNumber}/{inst.installmentTotal}
                                  </span>
                                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    Vence em {formatShortDate(inst.date)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-danger">
                                  {formatCurrency(inst.amount)}
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAnticipatePayment(inst)}
                                  className="h-8 px-3 rounded-lg border-info/30 text-info hover:bg-info/20 text-[10px] font-black uppercase"
                                >
                                  Baixar
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {anticipatingIds.size > 0 && (
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-info/20">
                            <p className="text-xs font-bold text-info">
                              {anticipatingIds.size} selecionada(s) — Total: {formatCurrency(
                                futureInstallments
                                  .filter(i => anticipatingIds.has(i.id))
                                  .reduce((sum, i) => sum + i.amount, 0)
                              )}
                            </p>
                            <Button
                              size="sm"
                              onClick={() => handleAnticipateAll(futureInstallments.filter(i => anticipatingIds.has(i.id)))}
                              className="h-8 px-4 rounded-lg bg-info hover:bg-info/90 text-white font-black uppercase text-[10px]"
                            >
                              Baixar Selecionadas
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
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
