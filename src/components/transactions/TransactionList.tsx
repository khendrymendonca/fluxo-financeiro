import { useState } from 'react';
import { formatCurrency } from '@/utils/formatters';
import { ArrowUpRight, ArrowDownRight, Trash2, Pencil, FastForward, ChevronDown, ChevronUp, Plus, RotateCcw, ArrowRight } from 'lucide-react';
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
    // ✅ REGRA DE NEGÓCIO: Compras pontuais no cartão (débito do limite) consomem saldo/limite na hora.
    // Elas nunca são marcadas como pendentes no extrato para evitar confusão.
    // Apenas Recorrentes, Parcelamentos e Faturas seguem o status isPaid.
    const isRecurringOrInstallment = t.isRecurring || t.transactionType === 'recurring' || t.installmentGroupId;
    const isPending = isRecurringOrInstallment ? !t.isPaid : false;
    
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
      // 1. Bloqueia faturas de cartão consolidadas e pagamentos de fatura
      if (t.categoryId === 'card-payment' || t.isInvoicePayment) return false;

      // 2. Bloqueia projeções virtuais — pertencem à Gestão de Contas
      if (t.isVirtual) return false;

      // 3. REGRA DO EXTRATO: recorrentes/fixos só aparecem após serem pagos
      if ((t.isRecurring || t.transactionType === 'recurring') && !t.isPaid) return false;

      // 4. REGRA DO EXTRATO: parcelamentos vinculados a um grupo só aparecem após serem pagos
      if (t.installmentGroupId && !t.isPaid) return false;

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
    await togglePaidMutation({ id: installment.id, isPaid: true, date: todayLocalString(), accountId: anticipateAccount });
    setAnticipatingIds(prev => { const next = new Set(prev); next.delete(installment.id); return next; });
  };

  const handleAnticipateAll = async (installments: Transaction[]) => {
    if (!anticipateAccount) {
      toast({ title: 'Selecione uma conta para pagamento', variant: 'destructive' });
      return;
    }
    const today = todayLocalString();
    for (const inst of installments) {
      if (!inst.isPaid) await togglePaidMutation({ id: inst.id, isPaid: true, date: today, accountId: anticipateAccount });
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
      await togglePaidMutation({ id: inst.id, isPaid: true, date: today, accountId: anticipateAccount });
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
          className="w-full h-12 pl-4 pr-10 rounded-2xl border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:border-primary focus:ring-0 transition-all outline-none font-medium text-gray-900 dark:text-zinc-50"
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
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-sm dark:shadow-none border border-gray-100 dark:border-zinc-800 space-y-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Receita/Despesa */}
            <div className="flex gap-1 p-1 bg-gray-50 dark:bg-zinc-800 rounded-xl">
              {(['all', 'income', 'expense'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={cn("py-1.5 px-4 rounded-lg font-bold text-xs transition-all",
                    filter === f ? "bg-white dark:bg-zinc-700 shadow-sm text-gray-900 dark:text-zinc-50" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200")}>
                  {f === 'all' ? 'Todos' : f === 'income' ? 'Receitas' : 'Despesas'}
                </button>
              ))}
            </div>

            {/* Origem */}
            <div className="flex gap-1 p-1 bg-gray-50 dark:bg-zinc-800 rounded-xl">
              <button onClick={() => { setSourceFilter('all'); setSpecificSourceId('all'); }}
                className={cn("py-1.5 px-4 rounded-lg font-bold text-xs transition-all",
                  sourceFilter === 'all' ? "bg-white dark:bg-zinc-700 shadow-sm text-gray-900 dark:text-zinc-50" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200")}>
                Todas Origens
              </button>
              <button onClick={() => { setSourceFilter('account'); setSpecificSourceId('all'); }}
                className={cn("py-1.5 px-4 rounded-lg font-bold text-xs transition-all",
                  sourceFilter === 'account' ? "bg-white dark:bg-zinc-700 shadow-sm text-gray-900 dark:text-zinc-50" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200")}>
                Débito
              </button>
              <button onClick={() => { setSourceFilter('card'); setSpecificSourceId('all'); }}
                className={cn("py-1.5 px-4 rounded-lg font-bold text-xs transition-all",
                  sourceFilter === 'card' ? "bg-white dark:bg-zinc-700 shadow-sm text-gray-900 dark:text-zinc-50" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200")}>
                Cartão
              </button>
            </div>

            {/* Tipo */}
            <div className="flex gap-1 p-1 bg-gray-50 dark:bg-zinc-800 rounded-xl">
              {(['all', 'punctual', 'installment', 'fixed'] as const).map(f => (
                <button key={f} onClick={() => setTypeFilter(f)}
                  className={cn("py-1.5 px-4 rounded-lg font-bold text-xs transition-all",
                    typeFilter === f ? "bg-white dark:bg-zinc-700 shadow-sm text-gray-900 dark:text-zinc-50" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200")}>
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
            <div key={date} className="space-y-3 pt-2">
              <p className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest px-4">{formatDate(date)}</p>
              <div className="divide-y divide-gray-100 dark:divide-zinc-800 bg-transparent">
                {groupedItems[date].map(item => {
                  const isIncome = item.type === 'income';
                  const isPending = item.isPending;
                  const hasInstallmentGroup = item.installmentGroupId && !item.isBill;
                  const isGroupExpanded = expandedGroup === item.installmentGroupId;
                  const futureInstallments = hasInstallmentGroup
                    ? getFutureInstallments(item.installmentGroupId, item.installmentNumber || 0)
                    : [];

                  return (
                    <div key={item.id} className="group relative">
                      {isSelectionMode && (
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                          <Checkbox
                            checked={selectedIds.has(item.id)}
                            onCheckedChange={() => toggleSelectId(item.id)}
                            className="w-5 h-5 border-2"
                          />
                        </div>
                      )}
                      <div className={cn(
                        "flex items-center justify-between p-4 transition-all active:bg-white/5 cursor-pointer",
                        isSelectionMode && "pl-14"
                      )} onClick={() => {
                        if (isSelectionMode) toggleSelectId(item.id);
                        else onEdit(item as Transaction);
                      }}>
                        {/* Lado esquerdo */}
                        <div className="flex items-center gap-4">
                          <div className={cn("p-2.5 rounded-full border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 group-hover:border-gray-200 dark:group-hover:border-zinc-700 transition-colors",
                            isPending ? "text-primary border-primary/20 bg-primary/5" : (isIncome ? "text-success bg-success/5 border-success/10" : "text-gray-400 dark:text-zinc-400"))}>
                            {item.icon ? <item.icon className="w-5 h-5" /> : (
                              isPending ? <Clock className="w-5 h-5" /> : (isIncome ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />)
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-gray-900 dark:text-white text-sm">{item.description}</p>
                              {isPending && <span className="text-[8px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">Pendente</span>}
                              {item.isVirtual && <span className="text-[8px] bg-amber-500/20 text-amber-600 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">Projetado</span>}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                              <span>
                                {item.categoryId === 'debt-payment' ? 'Pagamento de Acordo' :
                                  item.categoryId ? categories.find(c => c.id === item.categoryId)?.name || 'Outros' : 'Outros'}
                              </span>
                              {item.installmentNumber && item.installmentTotal && (
                                <>
                                  <span className="opacity-30">•</span>
                                  <span className="font-bold">{item.installmentNumber}/{item.installmentTotal}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Lado direito */}
                        <div className="flex items-center gap-4">
                          <span className={cn("font-bold text-sm", isIncome ? "text-success" : "text-gray-900 dark:text-white")}>
                            {isIncome ? '+' : '-'} {formatCurrency(item.amount)}
                          </span>
                          <ArrowRight className="w-4 h-4 text-gray-200 dark:text-zinc-800 group-hover:text-gray-400 dark:group-hover:text-zinc-600 transition-colors" />
                        </div>
                      </div>

                      {/* Ações Rápidas (Desktop ou Expanded) */}
                      {isGroupExpanded && hasInstallmentGroup && (
                        <div className={cn("border-t border-zinc-900 p-4 animate-fade-in", isIncome ? "bg-success/5" : "bg-info/5")}>
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                            <div>
                              <h4 className={cn("text-xs font-black uppercase tracking-wider flex items-center gap-2", isIncome ? "text-success" : "text-info")}>
                                <FastForward className="w-4 h-4" /> {isIncome ? 'Receber Parcelas Futuras' : 'Antecipar Parcelas Futuras'}
                              </h4>
                              <p className="text-[10px] text-zinc-500 mt-1">{futureInstallments.length} parcela(s) pendente(s).</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <select className="h-8 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-[10px] font-bold text-white flex-1 md:w-40"
                                value={anticipateAccount} onChange={e => setAnticipateAccount(e.target.value)}>
                                <option value="">{isIncome ? 'Entrar na conta...' : 'Debitar de...'}</option>
                                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                              </select>
                              {anticipatingIds.size > 0 && (
                                <Button size="sm"
                                  onClick={() => handleAnticipateSelected(futureInstallments)}
                                  className={cn("h-8 px-3 rounded-lg text-white font-black uppercase text-[9px] tracking-wider", isIncome ? "bg-success/80 hover:bg-success/70" : "bg-info/80 hover:bg-info/70")}>
                                  Selecionadas ({anticipatingIds.size})
                                </Button>
                              )}
                              <Button size="sm"
                                onClick={() => handleAnticipateAll(futureInstallments)}
                                className={cn("h-8 px-3 rounded-lg text-white font-black uppercase text-[9px] tracking-wider", isIncome ? "bg-success hover:bg-success/90" : "bg-info hover:bg-info/90")}>
                                Tudo ({futureInstallments.length})
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                            {futureInstallments.map(inst => (
                              <div key={inst.id} className={cn(
                                "flex items-center justify-between p-3 rounded-xl bg-zinc-900/50 border border-zinc-800",
                                anticipatingIds.has(inst.id) && (isIncome ? "border-success/50 bg-success/10" : "border-info/50 bg-info/10")
                              )}>
                                <div className="flex items-center gap-3">
                                  <Checkbox checked={anticipatingIds.has(inst.id)}
                                    onCheckedChange={checked => {
                                      setAnticipatingIds(prev => {
                                        const next = new Set(prev);
                                        if (checked) next.add(inst.id);
                                        else next.delete(inst.id);
                                        return next;
                                      });
                                    }} />
                                  <div>
                                    <span className={cn("text-[10px] font-black", isIncome ? "text-success" : "text-info")}>Parcela {inst.installmentNumber}/{inst.installmentTotal}</span>
                                    <p className="text-[10px] text-zinc-500">Vence em {formatShortDate(inst.date)}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={cn("text-xs font-black", isIncome ? "text-success" : "text-white")}>{formatCurrency(inst.amount)}</span>
                                  <Button size="sm" variant="outline"
                                    onClick={() => handleAnticipatePayment(inst)}
                                    className={cn("h-7 px-2 rounded-lg text-[9px] font-black uppercase", isIncome ? "border-success/30 text-success" : "border-info/30 text-info")}>
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
      )
      }

      {/* Modal de Pagamento */}
      {
        payingItem && (
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
                    {payingItem?.type !== 'income' && (
                      <button onClick={() => setPaymentMethod('credit_card')}
                        className={cn("flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                          paymentMethod === 'credit_card' ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}>
                        Cartão de Crédito
                      </button>
                    )}
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
        )
      }

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
      {
        isSelectionMode && selectedIds.size > 0 && (
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
        )
      }

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
    </div >
  );
}


