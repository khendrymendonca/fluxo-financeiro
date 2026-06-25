import React, { useMemo, useState } from 'react';
import { formatCurrency } from '@/utils/formatters';
import { ArrowUpRight, ArrowDownRight, Trash2, Pencil, FastForward, ChevronDown, ChevronUp, Plus, RotateCcw, ArrowRight, Filter } from 'lucide-react';
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
import { BulkDeleteDialog } from './BulkDeleteDialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { getAccountOverdraftMetrics } from '@/utils/accountOverdraft';
import { getTransactionCategoryLabel } from '@/utils/transactionCategory';
import { buildCanonicalCategoryFilterOptions, matchesCanonicalCategoryFilter } from '@/utils/categoryFilter';

export interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onCopy?: (transaction: Transaction) => void;
  onUndoPayment?: (transaction: Transaction) => void;
  onPayBill: (transaction: Transaction) => Promise<void>;
  allowSettlement?: boolean;
}

import { parseLocalDate, todayLocalString, toLocalDateString } from '@/utils/dateUtils';
import { Copy, RotateCcw as UndoIcon } from 'lucide-react';

function CreditCardMiniature({ color, texture }: { color: string; texture?: string }) {
  let bgStyle: React.CSSProperties = { backgroundColor: color || '#3b82f6' };

  if (texture === 'black') {
    bgStyle = { background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' };
  } else if (texture === 'holographic') {
    bgStyle = { 
      background: `linear-gradient(135deg, ${color || '#3b82f6'} 0%, #8b5cf6 50%, #ec4899 100%)`
    };
  }

  return (
    <div 
      className="relative w-8 h-5 rounded-[4px] flex-shrink-0 border border-white/10 overflow-hidden shadow-sm"
      style={bgStyle}
    >
      {/* Detalhe do Chip do Cartão */}
      <div className="absolute top-1 left-1.5 w-2 h-1.5 bg-amber-300/80 rounded-[0.5px] border-[0.5px] border-amber-500/20" />
      {/* Detalhe da bandeira */}
      <div className="absolute bottom-1 right-1 flex -space-x-[3px] opacity-75">
        <div className="w-1.5 h-1.5 rounded-full bg-red-500/90" />
        <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/90" />
      </div>
    </div>
  );
}

export function TransactionList({
  transactions,
  onEdit,
  onCopy,
  onUndoPayment,
  onPayBill,
  allowSettlement = true
}: TransactionListProps) {
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'account' | 'card'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'punctual' | 'installment' | 'fixed'>('all');
  const [specificSourceId, setSpecificSourceId] = useState<string>('all');
  const [payingItem, setPayingItem] = useState<Transaction | null>(null);
  const [selectedBank, setSelectedBank] = useState<string>('all');
  const [paymentDate, setPaymentDate] = useState<string>(todayLocalString());
  const [paymentMethod, setPaymentMethod] = useState<'account' | 'credit_card'>('account');
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryKey, setSelectedCategoryKey] = useState('all');
  const [anticipatingIds, setAnticipatingIds] = useState<Set<string>>(new Set());
  const [anticipateAccount, setAnticipateAccount] = useState('');

  // Single Item Delete State
  const [itemToDelete, setItemToDelete] = useState<Transaction | null>(null);

  // Bulk Delete State
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  const {
    categories,
    subcategories,
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
    // 🛡️ REGRA DE NEGÓCIO: Compras pontuais no cartão (débito do limite) consomem saldo/limite na hora.
    // Elas nunca são marcadas como pendentes no extrato para evitar confusão.
    // Apenas Recorrentes, Parcelamentos e Faturas seguem o status isPaid.
    const isRecurringOrInstallment = t.isRecurring || t.transactionType === 'recurring' || t.installmentGroupId;
    const isPending = isRecurringOrInstallment ? !t.isPaid : false;

    return { ...t, isPending };
  });

  const categoryFilterOptions = useMemo(
    () => buildCanonicalCategoryFilterOptions(displayItems, categories, 'Não identificados'),
    [displayItems, categories]
  );

  const availableBanks = useMemo(() => {
    return Array.from(new Set(accounts.map(a => a.bank).filter(Boolean)));
  }, [accounts]);

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
      // Pagamentos de fatura devem aparecer no extrato.

      // 2. Bloqueia projeções virtuais — pertencem à Gestão de Contas
      if (t.isVirtual) return false;

      // 3. REGRA DO EXTRATO: recorrentes/fixos só aparecem após serem pagos
      if ((t.isRecurring || t.transactionType === 'recurring') && !t.isPaid) return false;

      // 4. REGRA DO EXTRATO: parcelamentos vinculados a um grupo só aparecem após serem pagos
      const isCardInstallment = Boolean(
        t.cardId &&
        t.installmentGroupId &&
        t.transactionType === 'installment' &&
        !t.debtId &&
        !t.isInvoicePayment
      );
      if (t.installmentGroupId && !t.isPaid && !isCardInstallment) return false;

      // 5. REGRA DO EXTRATO: filhos materializados de recorrentes também saem do extrato ao estornar
      if (t.originalId && !t.isPaid) return false;

      // Filtro de Busca por Texto
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesDescription = t.description.toLowerCase().includes(query);
        const canonicalCategoryLabel = getTransactionCategoryLabel(t, categories, 'Não identificados').toLowerCase();
        if (!matchesDescription && !canonicalCategoryLabel.includes(query)) return false;
      }

      if (!matchesCanonicalCategoryFilter(t, categories, selectedCategoryKey, 'Não identificados')) return false;

      // Filtro de Categoria (Receita/Despesa)
      if (filter !== 'all' && t.type !== filter) return false;

      // Filtro de Origem (Conta vs Cartão)
      if (sourceFilter === 'account') {
        if (t.cardId) return false;
        if (selectedBank !== 'all') {
          const bankAccountIds = accounts.filter(a => a.bank === selectedBank).map(a => a.id);
          if (specificSourceId !== 'all') {
            if (t.accountId !== specificSourceId) return false;
          } else {
            if (!t.accountId || !bankAccountIds.includes(t.accountId)) return false;
          }
        } else {
          if (specificSourceId !== 'all' && t.accountId !== specificSourceId) return false;
        }
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
              <button onClick={() => { setSourceFilter('all'); setSpecificSourceId('all'); setSelectedBank('all'); }}
                className={cn("py-1.5 px-4 rounded-lg font-bold text-xs transition-all",
                  sourceFilter === 'all' ? "bg-white dark:bg-zinc-700 shadow-sm text-gray-900 dark:text-zinc-50" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200")}>
                Todas Origens
              </button>
              <button onClick={() => { setSourceFilter('account'); setSpecificSourceId('all'); setSelectedBank('all'); }}
                className={cn("py-1.5 px-4 rounded-lg font-bold text-xs transition-all",
                  sourceFilter === 'account' ? "bg-white dark:bg-zinc-700 shadow-sm text-gray-900 dark:text-zinc-50" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200")}>
                Débito
              </button>
              <button onClick={() => { setSourceFilter('card'); setSpecificSourceId('all'); setSelectedBank('all'); }}
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

            <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-1.5 dark:border-zinc-800 dark:bg-zinc-800">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedCategoryKey} onValueChange={setSelectedCategoryKey}>
                <SelectTrigger className="w-auto h-auto bg-transparent border-0 shadow-none focus:ring-0 text-sm font-bold text-foreground p-0 gap-2">
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  
                  {categoryFilterOptions.filter(o => o.type === 'income').length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="text-xs font-black text-muted-foreground uppercase tracking-widest pl-2">Receitas</SelectLabel>
                      {categoryFilterOptions.filter(o => o.type === 'income').map(option => (
                        <SelectItem key={option.key} value={option.key} className="pl-6">
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}

                  {categoryFilterOptions.filter(o => o.type === 'expense').length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="text-xs font-black text-muted-foreground uppercase tracking-widest pl-2">Despesas</SelectLabel>
                      {categoryFilterOptions.filter(o => o.type === 'expense').map(option => (
                        <SelectItem key={option.key} value={option.key} className="pl-6">
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}

                  {categoryFilterOptions.filter(o => o.type === 'logical' || !o.type).length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="text-xs font-black text-muted-foreground uppercase tracking-widest pl-2">Outros</SelectLabel>
                      {categoryFilterOptions.filter(o => o.type === 'logical' || !o.type).map(option => (
                        <SelectItem key={option.key} value={option.key} className="pl-6">
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Botão de Remoção em Massa */}
          <Button
            variant={isSelectionMode ? "default" : "outline"}
            onClick={toggleSelectionMode}
            className={cn("h-9 px-4 rounded-xl font-black uppercase text-xs tracking-wider transition-all",
              isSelectionMode ? "bg-primary text-white" : "border-danger/30 text-danger hover:bg-danger/10")}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {isSelectionMode ? 'Sair da Seleção' : 'Remover lançamentos'}
          </Button>
        </div>

        {/* Filtro Específico de Contas (Débito) */}
        {sourceFilter === 'account' && (
          <div className="space-y-3 pt-2 border-t border-border animate-in slide-in-from-top-1">
            {/* Linha 1: Selecionar Banco */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest min-w-[120px]">
                Selecionar Banco:
              </span>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => { setSelectedBank('all'); setSpecificSourceId('all'); }}
                  className={cn("px-3 py-1 rounded-full text-xs font-black uppercase transition-all border",
                    selectedBank === 'all' ? "bg-primary text-white border-primary" : "bg-transparent text-muted-foreground border-border hover:border-primary")}
                >
                  Todos os Bancos
                </button>
                {availableBanks.map((bank) => (
                  <button 
                    key={bank} 
                    onClick={() => { setSelectedBank(bank); setSpecificSourceId('all'); }}
                    className={cn("px-3 py-1 rounded-full text-xs font-black uppercase transition-all border",
                      selectedBank === bank ? "bg-primary text-white border-primary" : "bg-transparent text-muted-foreground border-border hover:border-primary")}
                  >
                    {bank}
                  </button>
                ))}
              </div>
            </div>

            {/* Linha 2: Selecionar Conta (Somente se o banco selecionado não for 'all') */}
            {selectedBank !== 'all' && (
              <div className="flex items-center gap-3 animate-in slide-in-from-top-1">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest min-w-[120px]">
                  Selecionar Conta:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => setSpecificSourceId('all')}
                    className={cn("px-3 py-1 rounded-full text-xs font-black uppercase transition-all border",
                      specificSourceId === 'all' ? "bg-primary text-white border-primary" : "bg-transparent text-muted-foreground border-border hover:border-primary")}
                  >
                    Todas deste Banco
                  </button>
                  {accounts
                    .filter(acc => acc.bank === selectedBank)
                    .map((acc) => (
                      <button 
                        key={acc.id} 
                        onClick={() => setSpecificSourceId(acc.id)}
                        className={cn("px-3 py-1 rounded-full text-xs font-black uppercase transition-all border flex items-center gap-2",
                          specificSourceId === acc.id ? "bg-primary text-white border-primary" : "bg-transparent text-muted-foreground border-border hover:border-primary")}
                      >
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: acc.color }} />
                        {acc.name}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filtro Específico de Cartões */}
        {sourceFilter === 'card' && (
          <div className="flex items-start gap-3 pt-2 border-t border-border animate-in slide-in-from-top-1 flex-col sm:flex-row sm:items-center">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest pt-1.5 sm:pt-0">
              Selecionar Cartão:
            </span>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setSpecificSourceId('all')}
                className={cn("h-10 px-4 rounded-xl text-xs font-black uppercase transition-all border flex items-center justify-center",
                  specificSourceId === 'all' ? "bg-primary text-white border-primary" : "bg-transparent text-muted-foreground border-border hover:border-primary")}
              >
                Todos
              </button>
              {creditCards.map((card) => (
                <button 
                  key={card.id} 
                  onClick={() => setSpecificSourceId(card.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-3 text-left",
                    specificSourceId === card.id 
                      ? "bg-primary/5 text-primary border-primary shadow-sm" 
                      : "bg-transparent text-muted-foreground border-border hover:border-primary/50"
                  )}
                >
                  <CreditCardMiniature color={card.color} texture={card.texture} />
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900 dark:text-white leading-none">{card.name}</span>
                    <span className="text-[10px] text-muted-foreground font-semibold leading-none mt-1 uppercase">{card.bank}</span>
                  </div>
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
              <p className="text-xs font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest px-4">{formatDate(date)}</p>
              <div className="divide-y divide-gray-100 dark:divide-zinc-800 bg-transparent">
                {groupedItems[date].map(item => {
                  const isIncome = item.type === 'income';
                  const isPending = item.isPending;
                  const isInvoicePaymentExpense = Boolean(item.isInvoicePayment && item.type === 'expense');
                  const isTransferItem = Boolean(item.isTransfer);
                  const isCardPurchase = Boolean(item.cardId && !item.isInvoicePayment && !item.isTransfer);
                  const hasInstallmentGroup = item.installmentGroupId && !item.isBill;
                  const isGroupExpanded = expandedGroup === item.installmentGroupId;
                  const isCardInstallment = Boolean(
                    item.cardId &&
                    item.installmentGroupId &&
                    item.transactionType === 'installment' &&
                    !item.debtId
                  );
                  const futureInstallments = hasInstallmentGroup
                    ? getFutureInstallments(item.installmentGroupId, item.installmentNumber || 0)
                    : [];

                  // 🛡️ REGRA DE INTEGRIDADE: Lançamentos originados na Gestão de Contas são "bloqueados" no Extrato.
                  // A única ação permitida é o Estorno. Cópia e Edição são proibidas aqui.
                  const isManagedByBills = Boolean(
                    item.isRecurring ||
                    item.transactionType === 'recurring' ||
                    (item.installmentGroupId && !isCardInstallment) ||
                    item.isInvoicePayment ||
                    item.originalId
                  );
                  const categoryLabel = getTransactionCategoryLabel(item, categories, 'Outros');
                  const subcategoryName = categoryLabel !== 'Acordo'
                    ? subcategories?.find((subcategory) => subcategory.id === item.subcategoryId)?.name
                    : null;
                  const categoryDisplay = subcategoryName ? `${categoryLabel} · ${subcategoryName}` : categoryLabel;
                  const isFixedManagedItem = Boolean(
                    isManagedByBills &&
                    !isInvoicePaymentExpense &&
                    !isTransferItem &&
                    !isCardPurchase &&
                    !item.debtId
                  );
                  const movementBadges = [
                    isPending ? 'Pendente' : null,
                    item.isVirtual ? 'Projetado' : null,
                    isCardPurchase ? 'Compra no cartão' : null,
                    isInvoicePaymentExpense ? 'Pagamento de fatura' : null,
                    isTransferItem ? 'Transferência' : null,
                    item.debtId ? 'Acordo' : null,
                    isFixedManagedItem ? 'Fixo' : null,
                    isManagedByBills ? 'Gestão de Contas' : null,
                    item.installmentTotal && item.installmentTotal > 1 ? 'Parcelado' : null,
                    item.installmentNumber && item.installmentTotal ? `${item.installmentNumber}/${item.installmentTotal}` : null,
                  ].filter((badge): badge is string => Boolean(badge));

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
                        "flex flex-col gap-3 p-4 transition-all active:bg-white/5 cursor-pointer sm:flex-row sm:items-center sm:justify-between",
                        isSelectionMode && "pl-14",
                        isManagedByBills && !isSelectionMode && "cursor-default"
                      )} onClick={() => {
                        if (isSelectionMode) toggleSelectId(item.id);
                        else if (!isManagedByBills) onEdit(item as Transaction);
                        else toast({
                          title: "Lançamento Protegido",
                          description: "Este item é gerenciado pela Gestão de Contas. Para editar, use o estorno ou altere o lançamento mestre.",
                          variant: "default"
                        });
                      }}>
                        {/* Lado esquerdo */}
                        <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center sm:gap-4">
                          <div className={cn("p-2.5 rounded-full border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 group-hover:border-gray-200 dark:group-hover:border-zinc-700 transition-colors",
                            isPending ? "text-primary border-primary/20 bg-primary/5" : (isIncome ? "text-success bg-success/5 border-success/10" : "text-gray-400 dark:text-zinc-400"))}>
                            {item.icon ? <item.icon className="w-5 h-5" /> : (
                              isPending ? <Clock className="w-5 h-5" /> : (isIncome ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />)
                            )}
                          </div>
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex min-w-0 items-start justify-between gap-3">
                              <p className="min-w-0 truncate font-bold text-gray-900 dark:text-white text-sm">{item.description}</p>
                              <span className={cn("shrink-0 whitespace-nowrap text-sm font-bold sm:hidden", isIncome ? "text-success" : "text-gray-900 dark:text-white")}>
                                {isIncome ? '+' : '-'} {formatCurrency(item.amount)}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              {categoryDisplay}
                            </p>
                            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                              {movementBadges.map((badge) => (
                                <span
                                  key={badge}
                                  className={cn(
                                    "inline-flex max-w-full items-center rounded-md px-1.5 py-0.5 text-[11px] font-black uppercase leading-none tracking-normal",
                                    badge === 'Compra no cartão' && "bg-sky-100 text-sky-700 dark:bg-sky-900/20 dark:text-sky-300",
                                    badge === 'Pagamento de fatura' && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300",
                                    badge === 'Transferência' && "bg-violet-100 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300",
                                    badge === 'Pendente' && "bg-primary/20 text-primary",
                                    badge === 'Projetado' && "bg-amber-500/20 text-amber-600",
                                    !['Compra no cartão', 'Pagamento de fatura', 'Transferência', 'Pendente', 'Projetado'].includes(badge) &&
                                    "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                                  )}
                                >
                                  {badge}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Lado direito */}
                        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-100 pt-3 dark:border-zinc-800 sm:border-t-0 sm:pt-0">
                          <span className={cn("hidden whitespace-nowrap font-bold text-sm sm:inline", isIncome ? "text-success" : "text-gray-900 dark:text-white")}>
                            {isIncome ? '+' : '-'} {formatCurrency(item.amount)}
                          </span>

                          {/* Ações protegidas */}
                          <div className="flex items-center gap-2">
                            {/* Botão Estornar (Apenas Gerenciados pela Gestão de Contas) */}
                            {isManagedByBills && onUndoPayment && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (item.debtId && item.transactionType === 'installment') {
                                    await togglePaidMutation({
                                      id: item.id,
                                      isPaid: false,
                                      clearSourceOnUnpay: true,
                                    });
                                    toast({ title: 'Pagamento estornado com sucesso.' });
                                    return;
                                  }
                                  onUndoPayment(item as Transaction);
                                }}
                                aria-label="Estornar pagamento"
                                className="p-2 rounded-xl border border-amber-100 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-900/10 text-amber-600 hover:text-amber-700 hover:border-amber-200 transition-all active:scale-90"
                                title="Estornar pagamento"
                              >
                                <UndoIcon className="w-4 h-4" />
                              </button>
                            )}

                            {/* Botão Copiar (Apenas Pontual e NÃO gerenciado por Bills) */}
                            {!isManagedByBills && !item.isTransfer && !item.isRecurring && item.transactionType !== 'recurring' && !item.installmentGroupId && onCopy && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCopy(item as Transaction);
                                }}
                                aria-label="Duplicar lançamento"
                                className="p-2 rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 text-gray-400 dark:text-zinc-400 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all active:scale-90"
                                title="Duplicar lançamento"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            )}

                            {!isManagedByBills && (
                              <ArrowRight className="w-4 h-4 text-gray-200 dark:text-zinc-800 group-hover:text-gray-400 dark:group-hover:text-zinc-600 transition-colors" />
                            )}
                          </div>
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
                              <p className="text-xs text-zinc-500 mt-1">{futureInstallments.length} parcela(s) pendente(s).</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <select className="h-8 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs font-bold text-white flex-1 md:w-40"
                                value={anticipateAccount} onChange={e => setAnticipateAccount(e.target.value)}>
                                <option value="">{isIncome ? 'Entrar na conta...' : 'Debitar de...'}</option>
                                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                              </select>
                              {anticipatingIds.size > 0 && (
                                <Button size="sm"
                                  onClick={() => handleAnticipateSelected(futureInstallments)}
                                  className={cn("h-8 px-3 rounded-lg text-white font-black uppercase text-[11px] tracking-wider", isIncome ? "bg-success/80 hover:bg-success/70" : "bg-info/80 hover:bg-info/70")}>
                                  Selecionadas ({anticipatingIds.size})
                                </Button>
                              )}
                              <Button size="sm"
                                onClick={() => handleAnticipateAll(futureInstallments)}
                                className={cn("h-8 px-3 rounded-lg text-white font-black uppercase text-[11px] tracking-wider", isIncome ? "bg-success hover:bg-success/90" : "bg-info hover:bg-info/90")}>
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
                                    <span className={cn("text-xs font-black", isIncome ? "text-success" : "text-info")}>Parcela {inst.installmentNumber}/{inst.installmentTotal}</span>
                                    <p className="text-xs text-zinc-500">Vence em {formatShortDate(inst.date)}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={cn("text-xs font-black", isIncome ? "text-success" : "text-white")}>{formatCurrency(inst.amount)}</span>
                                  <Button size="sm" variant="outline"
                                    onClick={() => handleAnticipatePayment(inst)}
                                    className={cn("h-7 px-2 rounded-lg text-[11px] font-black uppercase", isIncome ? "border-success/30 text-success" : "border-info/30 text-info")}>
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
                    </span>{' • '}{payingItem.description}
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
                        const currentMetrics = getAccountOverdraftMetrics(acc);
                        const projectedBalance = acc.balance + (payingItem.type === 'income' ? payingItem.amount : -payingItem.amount);
                        const projectedMetrics = getAccountOverdraftMetrics({ ...acc, balance: projectedBalance });
                        const showsOverdraftWarning = projectedMetrics.usedLimit > 0 || projectedMetrics.overLimit > 0;
                        return (
                          <button key={acc.id} onClick={() => handleSubmitPayment(acc.id, false)}
                            className={cn("w-full p-3 rounded-xl border-2 text-left transition-all",
                              "border-border hover:border-primary/50 hover:bg-primary/5 hover:shadow-md active:scale-[0.98] cursor-pointer")}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: acc.color }} />
                                <div>
                                  <p className="font-bold text-sm leading-tight">{acc.name}</p>
                                  <p className="text-xs text-muted-foreground font-bold uppercase">{acc.bank}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={cn("font-black text-sm", currentMetrics.realBalance < 0 && "text-danger")}>
                                  {formatCurrency(currentMetrics.realBalance)}
                                </p>
                                <p className="text-[11px] text-muted-foreground font-bold">Saldo atual</p>
                                <div className="mt-1 space-y-0.5">
                                  <p className={cn("text-[11px] font-bold", projectedMetrics.realBalance < 0 && "text-danger")}>
                                    Após pagamento: {formatCurrency(projectedMetrics.realBalance)}
                                  </p>
                                  {projectedMetrics.limit > 0 && (
                                    <>
                                      <p className="text-[11px] text-amber-600 font-bold">Limite utilizado: {formatCurrency(projectedMetrics.usedLimit)}</p>
                                      <p className="text-[11px] text-emerald-600 font-bold">Limite disponível: {formatCurrency(projectedMetrics.availableLimit)}</p>
                                      {projectedMetrics.overLimit > 0 && (
                                        <p className="text-[11px] text-danger font-bold">Excesso além do limite: {formatCurrency(projectedMetrics.overLimit)}</p>
                                      )}
                                    </>
                                  )}
                                </div>
                                {showsOverdraftWarning && (
                                  <p className={cn("text-[11px] font-bold", projectedMetrics.overLimit > 0 ? "text-danger" : "text-amber-600")}>
                                    Aviso: pagamento permitido com uso do limite.
                                  </p>
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
                      creditCards.map(card => (
                        <button key={card.id} onClick={() => handleSubmitPayment(card.id, true)}
                          className="w-full p-3 rounded-xl border-2 border-border hover:border-primary/50 hover:bg-primary/5 hover:shadow-md active:scale-[0.98] transition-all text-left cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: card.color }} />
                            <div>
                              <p className="font-bold text-sm leading-tight">{card.name}</p>
                              <p className="text-xs text-muted-foreground font-bold uppercase">{card.bank}</p>
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
        hasInstallments={Boolean(itemToDelete?.installmentGroupId || (itemToDelete?.installmentTotal && itemToDelete.installmentTotal > 1))}
        hasRecurring={itemToDelete?.isRecurring === true || itemToDelete?.transactionType === 'recurring'}
        onConfirm={async (options) => {
          if (!itemToDelete) return;

          await deleteTransaction(itemToDelete, options.installmentScope || (options.deleteFutureBills ? 'future' : 'this'));
          setItemToDelete(null);
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
                    className="bg-danger hover:bg-danger/90 text-white font-black uppercase text-xs tracking-widest px-6 rounded-xl"
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
              isRecurring: item?.isRecurring || item?.transactionType === 'recurring',
              transactionKind: item?.type,
              amount: item?.amount,
              date: item?.date,
              cardId: item?.cardId,
              invoiceMonthYear: item?.invoiceMonthYear,
              isInvoicePayment: item?.isInvoicePayment,
              isTransfer: item?.isTransfer,
              transferGroupId: item?.transferGroupId,
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
