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
import { Portal } from '@/components/ui/Portal';

interface TransactionListProps {
  transactions: Transaction[];
  bills: Bill[];
  onDelete: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
  onPayBill: (billId: string, accountId: string | undefined, paymentDate: string, cardId?: string) => Promise<void>;
}

export function TransactionList({ transactions, bills, onDelete, onEdit, onPayBill }: TransactionListProps) {
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [payingItem, setPayingItem] = useState<any>(null);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'account' | 'credit_card'>('account');
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [anticipatingIds, setAnticipatingIds] = useState<Set<string>>(new Set());
  const [anticipateAccount, setAnticipateAccount] = useState('');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const parseLocalDate = (dateString: string) => {
    if (!dateString) return new Date();
    const [year, month, day] = dateString.split('-').map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return new Date(dateString);
    return new Date(year, month - 1, day);
  };

  const formatDate = (dateString: string) => {
    return parseLocalDate(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatShortDate = (dateString: string) => {
    return parseLocalDate(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
    });
  };

  const formatLongDate = (dateString: string) => {
    return parseLocalDate(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
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

  const getGroupDate = (item: any) => {
    if (!item.isPending && item.paymentDate) {
      return item.paymentDate.split('T')[0];
    }
    return item.date;
  };

  const filteredItems = displayItems
    .filter(t => filter === 'all' || t.type === filter)
    .sort((a, b) => new Date(getGroupDate(b)).getTime() - new Date(getGroupDate(a)).getTime());

  // Group by date
  const groupedItems = filteredItems.reduce((groups, item) => {
    const date = getGroupDate(item);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(item);
    return groups;
  }, {} as Record<string, any[]>);

  const handleSubmitPayment = async (targetId: string, isCard: boolean) => {
    if (!payingItem) return;

    if (payingItem.isBill) {
      await onPayBill(payingItem.billId, isCard ? undefined : targetId, paymentDate, isCard ? targetId : undefined);
    } else {
      await togglePaid(payingItem.id, true, isCard ? undefined : targetId, paymentDate, isCard ? targetId : undefined);
    }
    setPayingItem(null);
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
      {Object.keys(groupedItems).length === 0 ? (
        <div className="card-elevated p-12 text-center">
          <p className="text-muted-foreground">Nenhuma transação ou pendência encontrada</p>
        </div>
      ) : (
        Object.keys(groupedItems).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).map(date => {
          const dayItems = groupedItems[date];
          return (
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
                                <div className="flex gap-1 w-full flex-wrap">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setPayingItem(item);
                                      setPaymentDate(item.date || new Date().toISOString().split('T')[0]);
                                      setPaymentMethod('account');
                                    }}
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
          );
        })
      )}

      {/* Payment Account Selection Popup */}
      {payingItem && (
        <Portal>
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setPayingItem(null)}
          >
            <div
              className="bg-card rounded-2xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-200 border border-border max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-border sticky top-0 bg-card rounded-t-2xl z-10">
                <h2 className="text-lg font-black tracking-tight">
                  {payingItem.type === 'income' ? 'Receber com qual conta?' : 'Pagar com qual conta?'}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  <span className={cn("font-bold", payingItem.type === 'income' ? "text-success" : "text-danger")}>
                    {formatCurrency(payingItem.amount)}
                  </span>
                  {' — '}
                  {payingItem.description}
                </p>
              </div>

              {/* Advanced Payment Options */}
              <div className="p-4 space-y-4">
                {/* Date Selection */}
                <div className="space-y-2 relative">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Data do Pagamento</label>
                  <label className="relative flex items-center bg-muted/30 border border-input rounded-xl p-3 focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all cursor-pointer">
                    <Calendar className="absolute left-3 w-4 h-4 text-primary" />
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full pl-8 pr-2 bg-transparent text-sm font-bold focus:outline-none appearance-none cursor-pointer text-foreground"
                    />
                  </label>
                </div>

                {/* Account / Card Tabs */}
                <div className="flex rounded-xl bg-muted/40 p-1">
                  <button
                    onClick={() => setPaymentMethod('account')}
                    className={cn(
                      "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                      paymentMethod === 'account' ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Conta Bancária
                  </button>
                  <button
                    onClick={() => setPaymentMethod('credit_card')}
                    className={cn(
                      "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                      paymentMethod === 'credit_card' ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Cartão de Crédito
                  </button>
                </div>
              </div>

              {/* Targets List */}
              <div className="p-3 pt-0 space-y-2">
                {paymentMethod === 'account' && (
                  accounts.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 text-sm">Nenhuma conta cadastrada.</p>
                  ) : (
                    accounts.map(acc => {
                      const availableTotal = acc.balance + (acc.hasOverdraft ? (acc.overdraftLimit || 0) : 0);
                      const wouldGoNegative = payingItem.type === 'expense' && acc.balance < payingItem.amount;
                      const hasEnoughWithOverdraft = acc.hasOverdraft && availableTotal >= payingItem.amount;
                      const insufficientFunds = wouldGoNegative && !hasEnoughWithOverdraft;

                      return (
                        <button
                          key={acc.id}
                          onClick={() => handleSubmitPayment(acc.id, false)}
                          disabled={insufficientFunds}
                          className={cn(
                            "w-full p-4 rounded-xl border-2 text-left transition-all",
                            insufficientFunds
                              ? "border-border/30 opacity-40 cursor-not-allowed"
                              : "border-border hover:border-primary/50 hover:bg-primary/5 hover:shadow-md active:scale-[0.98] cursor-pointer"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-4 h-4 rounded-full shadow-sm"
                                style={{ backgroundColor: acc.color }}
                              />
                              <div>
                                <p className="font-bold text-sm">{acc.name}</p>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase">{acc.bank}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={cn("font-black text-sm", acc.balance < 0 && "text-danger")}>
                                {formatCurrency(acc.balance)}
                              </p>
                              {acc.hasOverdraft && (acc.overdraftLimit || 0) > 0 && (
                                <p className="text-[9px] text-amber-600 font-bold">
                                  Limite: {formatCurrency(acc.overdraftLimit || 0)}
                                </p>
                              )}
                              {insufficientFunds && (
                                <p className="text-[9px] text-danger font-bold">Saldo inadequado</p>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )
                )}

                {paymentMethod === 'credit_card' && (
                  creditCards.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 text-sm">Nenhum cartão cadastrado.</p>
                  ) : (
                    creditCards.map(card => {
                      return (
                        <button
                          key={card.id}
                          onClick={() => handleSubmitPayment(card.id, true)}
                          className="w-full p-4 rounded-xl border-2 border-border hover:border-primary/50 hover:bg-primary/5 hover:shadow-md active:scale-[0.98] transition-all text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-4 h-4 rounded-full shadow-sm"
                              style={{ backgroundColor: card.color }}
                            />
                            <div>
                              <p className="font-bold text-sm">{card.name}</p>
                              <p className="text-[10px] text-muted-foreground font-bold uppercase">{card.bank}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-border">
                <Button
                  variant="ghost"
                  onClick={() => setPayingItem(null)}
                  className="w-full rounded-xl text-sm font-bold"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
