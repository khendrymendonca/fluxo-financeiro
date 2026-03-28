import { useState } from 'react';
import { formatCurrency } from '@/utils/formatters';
import { ArrowUpRight, ArrowDownRight, Trash2, Pencil, FastForward, ChevronDown, ChevronUp, Plus, RotateCcw } from 'lucide-react';
import { Transaction } from '@/types/finance';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { useToggleTransactionPaid } from '@/hooks/useTransactionMutations';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2, Clock, Calendar, ShieldAlert, Receipt
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Portal } from '@/components/ui/Portal';
import { OverdraftWarningDialog } from '@/components/ui/OverdraftWarningDialog';
import { BulkDeleteDialog } from './BulkDeleteDialog';
import { Checkbox } from '@/components/ui/checkbox';

export interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onPayBill: (transaction: Transaction) => Promise<void>;
  allowSettlement?: boolean;
}

import { parseLocalDate, todayLocalString, toLocalDateString } from '@/utils/dateUtils';

export function TransactionList({
  transactions,
  onEdit,
  onPayBill,
  allowSettlement = true
}: TransactionListProps) {
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'account' | 'card'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'punctual' | 'installment' | 'fixed'>('all');
  const [specificSourceId, setSpecificSourceId] = useState<string>('all');
  const [payingItem, setPayingItem] = useState<Transaction | null>(null);
  const [paymentDate, setPaymentDate] = useState<string>(todayLocalString());
  const [paymentMethod, setPaymentMethod] = useState<'account' | 'credit_card'>('account');
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [anticipatingIds, setAnticipatingIds] = useState<Set<string>>(new Set());
  const [anticipateAccount, setAnticipateAccount] = useState('');
  const [showOverdraftWarning, setShowOverdraftWarning] = useState(false);
  const [overdraftAmountUsed, setOverdraftAmountUsed] = useState(0);
  const [overdraftAccountName, setOverdraftAccountName] = useState('');
  const [pendingPaymentData, setPendingPaymentData] = useState<{ id: string, isCard: boolean } | null>(null);

  // Single Item Delete State
  const [itemToDelete, setItemToDelete] = useState<Transaction | null>(null);

  // Bulk Delete State
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  const {
    categories,
    accounts,
    creditCards,
    viewDate,
    isSelectionMode,
    selectedIds,
    toggleSelectionMode,
    toggleSelectId,
    clearSelection,
    deleteTransaction,
    bulkDeleteTransactions,
    isDeletingTransaction,
    isBulkDeleting
  } = useFinanceStore();
  const { mutateAsync: togglePaidMutation } = useToggleTransactionPaid();

  const formatDate = (dateString: string) =>
    parseLocalDate(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  const formatShortDate = (dateString: string) =>
    parseLocalDate(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' });

  const displayItems = transactions.map(t => {
    // ✅ REGRA DE BOM SENSO: Compras no cartão (cardId presente e não é pagamento de fatura) 
    // NUNCA são pendentes, elas já estão na fatura.
    const isPending = (t.cardId && !t.isInvoicePayment) ? false : !t.isPaid;
    return { ...t, isPending };
  });

  const getGroupDate = (item: any): string => {
    if (item.isRecurring) {
      return item.date?.split('T')[0] || todayLocalString();
    }
    if (!item.isPending && item.paymentDate) {
      return item.paymentDate.split('T')[0];
    }
    if (item.isPending && item.transactionType === 'recurring' && item.cardId) {
      const card = creditCards.find(c => c.id === item.cardId);
      if (card) {
        return toLocalDateString(viewDate.getFullYear(), viewDate.getMonth(), card.dueDay || 1);
      }
    }
    return item.date?.split('T')[0] || todayLocalString();
  };

  const filteredItems = displayItems
    .filter(t => {
      // ✅ REGRA DE FILTRO: Oculte a fatura do cartão consolidada e projeções virtuais.
      // Remove itens onde categoryId === 'card-payment', isInvoicePayment === true, ou isVirtual === true.
      if (t.categoryId === 'card-payment' || t.isInvoicePayment || t.isVirtual) return false;

      // Filtro de Busca por Texto
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesDescription = t.description.toLowerCase().includes(query);
        const matchesCategory = categories.find(c => c.id === t.categoryId)?.name.toLowerCase().includes(query);
        if (!matchesDescription && !matchesCategory) return false;
      }

      // Filtro de Categoria (Receita/Despesa)
      if (filter !== 'all' && t.type !== filter) return false;

      // Filtro de Origem (Conta vs Cartão)
      if (sourceFilter === 'account') {
        if (t.cardId) return false;
        if (specificSourceId !== 'all' && t.accountId !== specificSourceId) return false;
      } else if (sourceFilter === 'card') {
        if (!t.cardId) return false;
        if (specificSourceId !== 'all' && t.cardId !== specificSourceId) return false;
      }

      // Filtro de Tipo (Pontual, Parcelado, Fixo)
      if (typeFilter !== 'all') {
        if (typeFilter === 'punctual') {
          if (t.installmentTotal || t.isRecurring || t.transactionType === 'recurring') return false;
        } else if (typeFilter === 'installment') {
          if (!t.installmentTotal || t.installmentTotal <= 1) return false;
        } else if (typeFilter === 'fixed') {
          if (!t.isRecurring && t.transactionType !== 'recurring') return false;
        }
      }

      return true;
    })
    .sort((a, b) => parseLocalDate(getGroupDate(b)).getTime() - parseLocalDate(getGroupDate(a)).getTime());

  const groupedItems = filteredItems.reduce((groups, item) => {
    const date = getGroupDate(item);
    if (!groups[date]) groups[date] = [];
    groups[date].push(item);
    return groups;
  }, {} as Record<string, any[]>);

  const handleSubmitPayment = (targetId: string, isCard: boolean) => {
    if (!payingItem) return;
    if (!isCard && payingItem.type === 'expense') {
      const acc = accounts.find(a => a.id === targetId);
      if (acc?.hasOverdraft && acc.balance < payingItem.amount) {
        const deficit = payingItem.amount - acc.balance;
        if (deficit > 0 && deficit <= (acc.overdraftLimit || 0)) {
          setOverdraftAmountUsed(deficit);
          setOverdraftAccountName(acc.name);
          setPendingPaymentData({ id: targetId, isCard });
          setShowOverdraftWarning(true);
          return;
        }
      }
    }
    executePayment(targetId, isCard);
  };

  const executePayment = async (targetId: string, isCard: boolean) => {
    if (!payingItem) return;

    // Atualiza a transação para paga
    const updates: Partial<Transaction> = {
      isPaid: true,
      paymentDate: paymentDate,
      accountId: isCard ? undefined : targetId,
      cardId: isCard ? targetId : payingItem.cardId
    };

    await onPayBill({ ...payingItem, ...updates });
    setPayingItem(null);
  };


  const getFutureInstallments = (groupId: string, currentInstallmentNumber: number) =>
    transactions
      .filter(t => t.installmentGroupId === groupId && !t.isPaid && (t.installmentNumber || 0) > currentInstallmentNumber)
      .sort((a, b) => (a.installmentNumber || 0) - (b.installmentNumber || 0));

  const handleAnticipatePayment = async (installment: Transaction) => {
    if (!anticipateAccount) {
      toast({ title: 'Selecione uma conta para pagamento', variant: 'destructive' });
      return;
    }
    await togglePaidMutation({ id: installment.id, isPaid: true, date: todayLocalString() });
    setAnticipatingIds(prev => { const next = new Set(prev); next.delete(installment.id); return next; });
  };

  const handleAnticipateAll = async (installments: Transaction[]) => {
    if (!anticipateAccount) {
      toast({ title: 'Selecione uma conta para pagamento', variant: 'destructive' });
      return;
    }
    const today = todayLocalString();
    for (const inst of installments) {
      if (!inst.isPaid) await togglePaidMutation({ id: inst.id, isPaid: true, date: today });
    }
    setExpandedGroup(null);
    toast({ title: `${installments.length} parcelas antecipadas com sucesso!` });
  };

  const handleAnticipateSelected = async (installments: Transaction[]) => {
    if (!anticipateAccount) {
      toast({ title: 'Selecione uma conta para pagamento', variant: 'destructive' });
      return;
    }
    const selected = installments.filter(i => anticipatingIds.has(i.id));
    if (selected.length === 0) {
      toast({ title: 'Nenhuma parcela selecionada', variant: 'destructive' });
      return;
    }
    const today = todayLocalString();
    for (const inst of selected) {
      await togglePaidMutation({ id: inst.id, isPaid: true, date: today });
    }
    setAnticipatingIds(new Set());
    toast({ title: `${selected.length} parcela(s) antecipada(s)!` });
  };

  return (
    <div className="space-y-4">
      {/* Pesquisa */}
      <div className="relative">
        <input
          type="text"
          placeholder="Pesquisar lançamentos ou categorias..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-12 pl-4 pr-10 rounded-2xl border-2 border-border bg-card focus:border-primary focus:ring-0 transition-all outline-none font-medium"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full text-muted-foreground"
          >
            <Plus className="w-5 h-5 rotate-45" />
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="card-elevated p-4 space-y-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Receita/Despesa */}
            <div className="flex gap-1 p-1 bg-muted rounded-xl">
              {(['all', 'income', 'expense'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={cn("py-1.5 px-4 rounded-lg font-bold text-xs transition-all",
                    filter === f ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
                  {f === 'all' ? 'Todos' : f === 'income' ? 'Receitas' : 'Despesas'}
                </button>
              ))}
            </div>

            {/* Origem */}
            <div className="flex gap-1 p-1 bg-muted rounded-xl">
              <button onClick={() => { setSourceFilter('all'); setSpecificSourceId('all'); }}
                className={cn("py-1.5 px-4 rounded-lg font-bold text-xs transition-all",
                  sourceFilter === 'all' ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
                Todas Origens
              </button>
              <button onClick={() => { setSourceFilter('account'); setSpecificSourceId('all'); }}
                className={cn("py-1.5 px-4 rounded-lg font-bold text-xs transition-all",
                  sourceFilter === 'account' ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
                Débito
              </button>
              <button onClick={() => { setSourceFilter('card'); setSpecificSourceId('all'); }}
                className={cn("py-1.5 px-4 rounded-lg font-bold text-xs transition-all",
                  sourceFilter === 'card' ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
                Cartão
              </button>
            </div>

            {/* Tipo */}
            <div className="flex gap-1 p-1 bg-muted rounded-xl">
              {(['all', 'punctual', 'installment', 'fixed'] as const).map(f => (
                <button key={f} onClick={() => setTypeFilter(f)}
                  className={cn("py-1.5 px-4 rounded-lg font-bold text-xs transition-all",
                    typeFilter === f ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
                  {f === 'all' ? 'Qualquer Tipo' : f === 'punctual' ? 'Pontual' : f === 'installment' ? 'Parcelado' : 'Fixo'}
                </button>
              ))}
            </div>
          </div>

          {/* Botão de Remoção em Massa */}
          <Button
            variant={isSelectionMode ? "default" : "outline"}
            onClick={toggleSelectionMode}
            className={cn("h-9 px-4 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all",
              isSelectionMode ? "bg-primary text-white" : "border-danger/30 text-danger hover:bg-danger/10")}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {isSelectionMode ? 'Sair da Seleção' : 'Remover lançamentos'}
          </Button>
        </div>

        {/* Filtro Específico (Conta ou Cartão) */}
        {sourceFilter !== 'all' && (
          <div className="flex items-center gap-3 pt-2 border-t border-border animate-in slide-in-from-top-1">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              {sourceFilter === 'account' ? 'Selecionar Conta:' : 'Selecionar Cartão:'}
            </span>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setSpecificSourceId('all')}
                className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all border",
                  specificSourceId === 'all' ? "bg-primary text-white border-primary" : "bg-transparent text-muted-foreground border-border hover:border-primary")}>
                Todos
              </button>
              {(sourceFilter === 'account' ? accounts : creditCards).map((item: any) => (
                <button key={item.id} onClick={() => setSpecificSourceId(item.id)}
                  className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all border flex items-center gap-2",
                    specificSourceId === item.id ? "bg-primary text-white border-primary" : "bg-transparent text-muted-foreground border-border hover:border-primary")}>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lista agrupada */}
      {Object.keys(groupedItems).length === 0 ? (
        <div className="card-elevated p-12 text-center text-muted-foreground">
          Nenhuma transação ou pendência encontrada
        </div>
      ) : (
        Object.keys(groupedItems)
          .sort((a, b) => parseLocalDate(b).getTime() - parseLocalDate(a).getTime())
          .map(date => (
            <div key={date} className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground px-2">{formatDate(date)}</p>
              <div className="card-elevated divide-y divide-border">
                {groupedItems[date].map(item => {
                  const isIncome = item.type === 'income';
                  const isPending = item.isPending;
                  const hasInstallmentGroup = item.installmentGroupId && !item.isBill;
                  const isGroupExpanded = expandedGroup === item.installmentGroupId;
                  const futureInstallments = hasInstallmentGroup
                    ? getFutureInstallments(item.installmentGroupId, item.installmentNumber || 0)
                    : [];

                  return (
                    <div key={item.id} className="overflow-hidden flex items-center">
                      {isSelectionMode && (
                        <div className="pl-4">
                          <Checkbox
                            checked={selectedIds.has(item.id)}
                            onCheckedChange={() => toggleSelectId(item.id)}
                            className="w-5 h-5 border-2"
                          />
                        </div>
                      )}
                      <div className={cn(
                        "flex-1 flex flex-col md:flex-row md:items-center justify-between p-4 hover:bg-muted/30 transition-colors group gap-4",
                        isPending && "bg-primary/5 border-l-4 border-l-primary"
                      )}>
                        {/* Lado esquerdo */}
                        <div className="flex items-center gap-3">
                          <div className={cn("p-2.5 rounded-xl flex-shrink-0",
                            isPending ? "bg-primary/10 text-primary" : (isIncome ? "bg-success-light text-success" : "bg-danger-light text-danger"))}>
                            {item.icon ? <item.icon className="w-5 h-5" /> : (
                              isPending ? <Clock className="w-5 h-5" /> : (isIncome ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />)
                            )}
                          </div>
                          <div>
                            <p className="font-bold">{item.description}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              {isPending && <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">Pendente</span>}
                              {item.isVirtual && <span className="text-[10px] bg-amber-500/20 text-amber-600 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter shadow-sm border border-amber-500/20 animate-pulse">Projetado</span>}
                              {item.installmentNumber && item.installmentTotal && (
                                <span className="text-[10px] bg-info/20 text-info px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">
                                  {item.installmentNumber}/{item.installmentTotal}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {item.categoryId === 'debt-payment' ? 'Pagamento de Acordo' :
                                item.categoryId ? categories.find(c => c.id === item.categoryId)?.name || 'Outros' : 'Outros'}
                              {item.isPending && item.cardId && <span> • Compra: {formatShortDate(item.date)}</span>}
                            </p>
                          </div>
                        </div>

                        {/* Lado direito */}
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                          <span className={cn("font-black text-lg md:text-base", isIncome ? "text-success" : "text-danger")}>
                            {isIncome ? '+' : '-'} {formatCurrency(item.amount)}
                          </span>
                          <div className="flex items-center gap-2 w-full md:w-auto">
                            {isPending ? (
                              <div className="flex items-center gap-2 w-full">
                                {allowSettlement ? (
                                  <Button size="sm" variant="outline"
                                    onClick={() => { setPayingItem(item); setPaymentDate(item.date?.split('T')[0] || todayLocalString()); setPaymentMethod('account'); }}
                                    disabled={item.isVirtual || isDeletingTransaction || isBulkDeleting}
                                    className="flex-1 md:flex-none h-9 px-4 rounded-xl border-primary/30 text-primary hover:bg-primary/10 flex items-center gap-2 font-black uppercase text-[10px] tracking-wider transition-all hover:scale-105 active:scale-95">
                                    <CheckCircle2 className="w-4 h-4" /> Baixar Agora
                                  </Button>
                                ) : (
                                  <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-[10px] font-black uppercase tracking-wider">
                                    <Clock className="w-3.5 h-3.5" /> Pendente
                                  </div>
                                )}
                                {hasInstallmentGroup && futureInstallments.length > 0 && !item.isRecurring && (
                                  <Button size="sm" variant="outline"
                                    onClick={() => setExpandedGroup(isGroupExpanded ? null : item.installmentGroupId)}
                                    disabled={isDeletingTransaction || isBulkDeleting}
                                    className="h-9 px-3 rounded-xl border-info/30 text-info hover:bg-info/10 flex items-center gap-1 font-black uppercase text-[10px] tracking-wider transition-all">
                                    <FastForward className="w-4 h-4" />
                                    {isGroupExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                  </Button>
                                )}
                                {(item.debtId || item.transactionType === 'installment') ? null : (
                                  <>
                                    <Button variant="ghost" size="icon"
                                      onClick={() => onEdit(item as Transaction)}
                                      disabled={item.isVirtual || isDeletingTransaction || isBulkDeleting}
                                      className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary shrink-0">
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon"
                                      onClick={() => setItemToDelete(item as Transaction)}
                                      disabled={item.isVirtual || isDeletingTransaction || isBulkDeleting}
                                      className="h-9 w-9 rounded-xl hover:bg-danger/10 hover:text-danger shrink-0">
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            ) : (
                              <div className="flex opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all gap-1 justify-end w-full">
                                {allowSettlement ? (
                                  <Button variant="ghost" size="icon"
                                    onClick={() => togglePaidMutation({ id: item.id, isPaid: false })}
                                    disabled={isDeletingTransaction || isBulkDeleting}
                                    title="Estornar Pagamento"
                                    className="h-9 w-9 rounded-lg hover:bg-amber-100 hover:text-amber-600 text-amber-600">
                                    <RotateCcw className="w-4 h-4" />
                                  </Button>
                                ) : (
                                  <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-success/10 text-success text-[10px] font-black uppercase tracking-wider h-9">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Liquidado
                                  </div>
                                )}
                                {hasInstallmentGroup && futureInstallments.length > 0 && !item.isRecurring && (
                                  <Button size="sm" variant="outline"
                                    onClick={() => setExpandedGroup(isGroupExpanded ? null : item.installmentGroupId)}
                                    disabled={isDeletingTransaction || isBulkDeleting}
                                    className="h-9 px-3 rounded-xl border-info/30 text-info hover:bg-info/10 flex items-center gap-1 font-black uppercase text-[10px] tracking-wider transition-all">
                                    <FastForward className="w-4 h-4" />
                                    {isGroupExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                  </Button>
                                )}
                                {!(item.debtId || item.transactionType === 'installment') && (
                                  <>
                                    <Button variant="ghost" size="icon"
                                      onClick={() => onEdit(item as Transaction)}
                                      disabled={isDeletingTransaction || isBulkDeleting}
                                      className="h-9 w-9 rounded-lg hover:bg-primary/10 hover:text-primary">
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon"
                                      onClick={() => {
                                        if (hasInstallmentGroup || item.isRecurring || item.transactionType === 'recurring') {
                                          setItemToDelete(item as Transaction);
                                        } else {
                                          deleteTransaction(item as Transaction, 'this');
                                        }
                                      }}
                                      disabled={isDeletingTransaction || isBulkDeleting}
                                      className="h-9 w-9 rounded-lg hover:bg-danger/10 hover:text-danger">
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Painel de parcelas futuras */}
                      {isGroupExpanded && hasInstallmentGroup && (
                        <div className={cn("border-t p-4 animate-fade-in", isIncome ? "bg-success/5 border-success/20" : "bg-info/5 border-info/20")}>
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                            <div>
                              <h4 className={cn("text-sm font-black uppercase tracking-wider flex items-center gap-2", isIncome ? "text-success" : "text-info")}>
                                <FastForward className="w-4 h-4" /> {isIncome ? 'Receber Parcelas Futuras' : 'Antecipar Parcelas Futuras'}
                              </h4>
                              <p className="text-xs text-muted-foreground mt-1">{futureInstallments.length} parcela(s) pendente(s).</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <select className="h-9 rounded-lg border border-input bg-background px-2 py-1 text-xs font-bold flex-1 md:w-40"
                                value={anticipateAccount} onChange={e => setAnticipateAccount(e.target.value)}>
                                <option value="">{isIncome ? 'Entrar na conta...' : 'Debitar de...'}</option>
                                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                              </select>
                              {anticipatingIds.size > 0 && (
                                <Button size="sm"
                                  onClick={() => handleAnticipateSelected(futureInstallments)}
                                  className={cn("h-9 px-4 rounded-xl text-white font-black uppercase text-[10px] tracking-wider", isIncome ? "bg-success/80 hover:bg-success/70" : "bg-info/80 hover:bg-info/70")}>
                                  Selecionadas ({anticipatingIds.size})
                                </Button>
                              )}
                              <Button size="sm"
                                onClick={() => handleAnticipateAll(futureInstallments)}
                                className={cn("h-9 px-4 rounded-xl text-white font-black uppercase text-[10px] tracking-wider", isIncome ? "bg-success hover:bg-success/90" : "bg-info hover:bg-info/90")}>
                                Tudo ({futureInstallments.length})
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-1 max-h-60 overflow-y-auto">
                            {futureInstallments.map(inst => (
                              <div key={inst.id} className={cn(
                                "flex items-center justify-between p-3 rounded-xl bg-background/60 border border-border/50",
                                anticipatingIds.has(inst.id) && (isIncome ? "border-success/50 bg-success/10" : "border-info/50 bg-info/10")
                              )}>
                                <div className="flex items-center gap-3">
                                  <input type="checkbox" checked={anticipatingIds.has(inst.id)}
                                    onChange={e => {
                                      setAnticipatingIds(prev => {
                                        const next = new Set(prev);
                                        if (e.target.checked) next.add(inst.id);
                                        else next.delete(inst.id);
                                        return next;
                                      });
                                    }} className="w-4 h-4 rounded" />
                                  <div>
                                    <span className={cn("text-xs font-black", isIncome ? "text-success" : "text-info")}>Parcela {inst.installmentNumber}/{inst.installmentTotal}</span>
                                    <p className="text-[10px] text-muted-foreground">Vence em {formatShortDate(inst.date)}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={cn("text-sm font-black", isIncome ? "text-success" : "text-danger")}>{formatCurrency(inst.amount)}</span>
                                  <Button size="sm" variant="outline"
                                    onClick={() => handleAnticipatePayment(inst)}
                                    className={cn("h-8 px-3 rounded-lg text-[10px] font-black uppercase", isIncome ? "border-success/30 text-success hover:bg-success/20" : "border-info/30 text-info hover:bg-info/20")}>
                                    {isIncome ? 'Receber' : 'Pagar'}
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
      )}

      {/* Modal de Pagamento */}
      {payingItem && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setPayingItem(null)}>
            <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-200 border border-border max-h-[85vh] flex flex-col overflow-hidden"
              onClick={e => e.stopPropagation()}>
              <div className="px-5 py-4 border-b border-border sticky top-0 bg-card rounded-t-2xl z-10">
                <h2 className="text-lg font-black tracking-tight">
                  {payingItem.type === 'income' ? 'Receber com qual conta?' : 'Pagar com qual conta?'}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  <span className={cn("font-bold", payingItem.type === 'income' ? "text-success" : "text-danger")}>
                    {formatCurrency(payingItem.amount)}
                  </span>{' — '}{payingItem.description}
                </p>
              </div>
              <div className="p-4 space-y-4">
                <div className="space-y-2 relative">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Data do Pagamento</label>
                  <label className="relative flex items-center bg-muted/30 border border-input rounded-xl p-3 focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all cursor-pointer">
                    <Calendar className="absolute left-3 w-4 h-4 text-primary" />
                    <input type="date" value={paymentDate?.split('T')[0] || ''} onChange={e => setPaymentDate(e.target.value)}
                      className="w-full pl-8 pr-2 bg-transparent text-sm font-bold focus:outline-none appearance-none cursor-pointer text-foreground" />
                  </label>
                </div>
                <div className="flex rounded-xl bg-muted/40 p-1">
                  <button onClick={() => setPaymentMethod('account')}
                    className={cn("flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                      paymentMethod === 'account' ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}>
                    Conta Bancária
                  </button>
                  <button onClick={() => setPaymentMethod('credit_card')}
                    className={cn("flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                      paymentMethod === 'credit_card' ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}>
                    Cartão de Crédito
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 pt-0 space-y-2">
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
                        <button key={acc.id} onClick={() => handleSubmitPayment(acc.id, false)}
                          disabled={insufficientFunds}
                          className={cn("w-full p-3 rounded-xl border-2 text-left transition-all",
                            insufficientFunds ? "border-border/30 opacity-40 cursor-not-allowed" : "border-border hover:border-primary/50 hover:bg-primary/5 hover:shadow-md active:scale-[0.98] cursor-pointer")}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: acc.color }} />
                              <div>
                                <p className="font-bold text-sm leading-tight">{acc.name}</p>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase">{acc.bank}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={cn("font-black text-sm", acc.balance < 0 && "text-danger")}>
                                {formatCurrency(acc.balance)}
                              </p>
                              {acc.hasOverdraft && (acc.overdraftLimit || 0) > 0 && (
                                <p className="text-[9px] text-amber-600 font-bold">Limite: {formatCurrency(acc.overdraftLimit || 0)}</p>
                              )}
                              {insufficientFunds && <p className="text-[9px] text-danger font-bold">Saldo inadequado</p>}
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
                    creditCards.map(card => (
                      <button key={card.id} onClick={() => handleSubmitPayment(card.id, true)}
                        className="w-full p-3 rounded-xl border-2 border-border hover:border-primary/50 hover:bg-primary/5 hover:shadow-md active:scale-[0.98] transition-all text-left cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: card.color }} />
                          <div>
                            <p className="font-bold text-sm leading-tight">{card.name}</p>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase">{card.bank}</p>
                          </div>
                        </div>
                      </button>
                    ))
                  )
                )}
              </div>
              <div className="px-5 py-3 border-t border-border">
                <Button variant="ghost" onClick={() => setPayingItem(null)} className="w-full rounded-xl text-sm font-bold">
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Modal de Exclusão Individual (Single Item) */}
      <BulkDeleteDialog
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        isPending={isDeletingTransaction}
        selectedCount={1}
        hasInstallments={!!itemToDelete?.installmentGroupId || (itemToDelete?.installmentTotal && itemToDelete.installmentTotal > 1)}
        hasRecurring={itemToDelete?.isRecurring === true || itemToDelete?.transactionType === 'recurring'}
        onConfirm={async (options) => {
          if (!itemToDelete) return;

          await deleteTransaction(itemToDelete, options.installmentScope || (options.deleteFutureBills ? 'future' : 'this'));
          setItemToDelete(null);
        }}
      />

      <OverdraftWarningDialog
        isOpen={showOverdraftWarning}
        amountUsedFromLimit={overdraftAmountUsed}
        accountName={overdraftAccountName}
        onCancel={() => { setShowOverdraftWarning(false); setPendingPaymentData(null); }}
        onConfirm={() => {
          setShowOverdraftWarning(false);
          if (pendingPaymentData) executePayment(pendingPaymentData.id, pendingPaymentData.isCard);
          setPendingPaymentData(null);
        }}
      />

      {/* Floating Bulk Action Bar */}
      {isSelectionMode && selectedIds.size > 0 && (
        <Portal>
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
            <div className="bg-foreground text-background px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-6 border border-background/10">
              <div className="flex flex-col">
                <span className="text-xs font-black uppercase opacity-70 tracking-tighter">Selecionados</span>
                <span className="text-lg font-black leading-none">{selectedIds.size}</span>
              </div>

              <div className="h-8 w-px bg-background/20" />

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  className="hover:bg-background/10 text-background font-bold text-xs"
                >
                  Limpar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowBulkDeleteDialog(true)}
                  className="bg-danger hover:bg-danger/90 text-white font-black uppercase text-[10px] tracking-widest px-6 rounded-xl"
                >
                  Remover
                </Button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Bulk Delete Dialog */}
      <BulkDeleteDialog
        isOpen={showBulkDeleteDialog}
        onClose={() => setShowBulkDeleteDialog(false)}
        isPending={isBulkDeleting}
        selectedCount={selectedIds.size}
        hasInstallments={Array.from(selectedIds).some(id => {
          const item = displayItems.find(i => i.id === id) as any;
          return !!item?.installmentGroupId || (item?.installmentTotal && item.installmentTotal > 1);
        })}
        hasRecurring={Array.from(selectedIds).some(id => {
          const item = displayItems.find(i => i.id === id) as any;
          return item?.isRecurring === true || item?.transactionType === 'recurring';
        })}
        onConfirm={async (options) => {
          const itemsToDelete = Array.from(selectedIds).map(id => {
            const item = displayItems.find(i => i.id === id) as any;
            return {
              id: id,
              type: 'transaction' as const,
              isVirtual: item?.isVirtual,
              installmentGroupId: item?.installmentGroupId,
              isRecurring: item?.isRecurring || item?.transactionType === 'recurring'
            };
          });

          await bulkDeleteTransactions({
            items: itemsToDelete as any,
            installmentScope: options.installmentScope,
            deleteFutureBills: options.deleteFutureBills
          });

          toggleSelectionMode(); // Sai do modo de seleção após deletar
        }}
      />
    </div>
  );
}


