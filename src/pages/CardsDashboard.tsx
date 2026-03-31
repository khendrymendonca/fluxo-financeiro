import { useState, useRef, useEffect, useMemo } from 'react';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { CreditCardVisual } from '@/components/cards/CreditCardVisual';
import { AddCardDialog } from '@/components/cards/AddCardDialog';
import { Button } from '@/components/ui/button';
import { Plus, Receipt, Calendar, CreditCard, Pencil, ArrowRight, Wallet, CheckCircle2 } from 'lucide-react';
import { parseLocalDate } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EditCardDialog } from '@/components/cards/EditCardDialog';
import { Portal } from '@/components/ui/Portal';
import { getCardSettingsForDate, getInvoiceStatusDisplay } from '@/utils/creditCardUtils';
import { Progress } from '@/components/ui/progress';
import { Transaction } from '@/types/finance';
import { AnticipateInstallmentsDialog } from '@/components/cards/AnticipateInstallmentsDialog';
import { PageHeader } from '@/components/ui/PageHeader';

export default function CardsDashboard() {
  const {
    creditCards,
    transactions,
    accounts,
    categories,
    updateCreditCard,
    addCreditCard,
    getCardUsedLimit,
    togglePaid
  } = useFinanceStore();

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [viewDate, setViewDate] = useState(new Date());
  const [showAddCard, setShowAddCard] = useState(false);
  const [showEditCard, setShowEditCard] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [transactionToAnticipate, setTransactionToAnticipate] = useState<Transaction | null>(null);

  useEffect(() => {
    if (creditCards.length > 0 && !selectedCardId) {
      setSelectedCardId(creditCards[0].id);
    }
  }, [creditCards, selectedCardId]);

  const selectedCard = creditCards.find(c => c.id === selectedCardId);

  const stats = useMemo(() => {
    if (!selectedCardId) return { used: 0, available: 0, limit: 0, percentUsed: 0, isOverLimit: false };
    const card = creditCards.find(c => c.id === selectedCardId);
    const limit = Number(card?.limit || 0);
    const used = getCardUsedLimit(selectedCardId);
    const available = limit - used;
    const percentUsed = limit > 0 ? (used / limit) * 100 : 0;
    const isOverLimit = used > limit;
    return { used, available, limit, percentUsed, isOverLimit };
  }, [selectedCardId, creditCards, getCardUsedLimit]);

  const currentInvoiceTransactions = useMemo(() => {
    if (!selectedCardId) return [];
    const card = creditCards.find(c => c.id === selectedCardId);
    if (!card) return [];
    const viewDateStr = format(viewDate, 'yyyy-MM');
    const { closingDay } = getCardSettingsForDate(card, viewDate);
    const viewYear = viewDate.getFullYear();
    const viewMonth = viewDate.getMonth();
    const endInv = new Date(viewYear, viewMonth, closingDay, 23, 59, 59);
    const startInv = new Date(viewYear, viewMonth - 1, closingDay + 1, 0, 0, 0);

    return transactions
      .filter(t => {
        if (t.cardId !== selectedCardId || t.isInvoicePayment) return false;
        if (t.isVirtual) return false;
        if (t.invoiceMonthYear) return t.invoiceMonthYear === viewDateStr;
        const tDate = parseLocalDate(t.date);
        return tDate >= startInv && tDate <= endInv;
      })
      .sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());
  }, [selectedCardId, creditCards, viewDate, transactions]);

  const currentInvoiceTotal = useMemo(() => 
    currentInvoiceTransactions.reduce((sum, t) => sum + (t.type === 'income' ? -t.amount : t.amount), 0),
    [currentInvoiceTransactions]
  );

  const dynamicStatus = useMemo(() => {
    if (!selectedCard || !selectedCardId) return null;
    const viewDateStr = format(viewDate, 'yyyy-MM');
    const isPaid = transactions.some(t => t.cardId === selectedCardId && t.isInvoicePayment && t.invoiceMonthYear === viewDateStr);
    return getInvoiceStatusDisplay(selectedCard, viewDate, isPaid, currentInvoiceTotal);
  }, [selectedCard, selectedCardId, viewDate, transactions, currentInvoiceTotal]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const renderCardDetails = () => {
    if (!selectedCard) return null;
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 lg:slide-in-from-right-4 duration-500">
        {/* Cabeçalho de Fatura */}
        <div className="bg-card rounded-[2.5rem] p-8 border border-border/40 shadow-sm dark:shadow-none relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-1">
              <p className="text-[10px] md:text-xs uppercase font-black text-muted-foreground tracking-[0.2em]">Fatura Atual • {format(viewDate, 'MMMM yyyy', { locale: ptBR })}</p>
              <h2 className="text-4xl md:text-6xl font-black tracking-tighter transition-all tabular-nums">
                {formatCurrency(currentInvoiceTotal)}
              </h2>
              <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground mt-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span>Vence dia {selectedCard.dueDay}</span>
                {dynamicStatus && (
                  <span className={cn("uppercase tracking-widest text-[10px] px-2 py-0.5 rounded-md bg-muted", dynamicStatus.color)}>
                    {dynamicStatus.text}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 min-w-[200px]">
               <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-muted-foreground">Uso do Limite</span>
                    <span className="text-foreground">{stats.percentUsed.toFixed(0)}%</span>
                  </div>
                  <Progress value={stats.percentUsed} className="h-2" />
                  <p className="text-[10px] text-muted-foreground font-medium text-right">
                    {formatCurrency(stats.available)} disponíveis de {formatCurrency(stats.limit)}
                  </p>
               </div>
               <Button
                  variant="secondary"
                  size="sm"
                  className="w-full rounded-xl font-bold gap-2 text-xs h-10"
                  onClick={() => setShowEditCard(true)}
                >
                  <Pencil className="w-3.5 h-3.5" /> Ajustar Limite
                </Button>
            </div>
          </div>
          
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        </div>

        {/* Lista de Gastos */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] uppercase font-black text-muted-foreground tracking-[0.3em]">Lançamentos da Fatura</h3>
            <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-xl border border-border/20">
              <Button variant="ghost" size="icon" onClick={() => setViewDate(prev => subMonths(prev, 1))} className="h-8 w-8 rounded-lg hover:bg-background">{"<"}</Button>
              <p className="text-[10px] font-black uppercase tracking-widest w-28 text-center">{format(viewDate, 'MMM yyyy', { locale: ptBR })}</p>
              <Button variant="ghost" size="icon" onClick={() => setViewDate(prev => addMonths(prev, 1))} className="h-8 w-8 rounded-lg hover:bg-background">{">"}</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {currentInvoiceTransactions.length === 0 ? (
              <div className="text-center py-20 bg-muted/10 rounded-[2.5rem] border border-dashed border-border/40">
                <Receipt className="w-12 h-12 mx-auto mb-4 opacity-5 text-foreground" />
                <p className="text-muted-foreground italic text-sm">Nenhum gasto nesta fatura.</p>
              </div>
            ) : (
              currentInvoiceTransactions.map(t => {
                const category = categories.find(c => c.id === t.categoryId);
                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      if (t.installmentTotal && t.installmentNumber && t.installmentGroupId) {
                        setTransactionToAnticipate(t);
                      }
                    }}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-2xl bg-card border border-border/30 hover:border-primary/30 transition-all group",
                      t.installmentTotal && "cursor-pointer"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <Receipt className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm leading-tight mb-0.5 group-hover:text-primary transition-colors">{t.description}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
                          <span>{format(parseLocalDate(t.date), 'dd MMM')}</span>
                          {category && <span className="text-primary/50">• {category.name}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn("font-black text-sm tabular-nums", t.type === 'income' ? 'text-emerald-500' : 'text-foreground')}>
                        {t.type === 'income' ? '-' : ''}{formatCurrency(t.amount)}
                      </p>
                      {t.installmentTotal && (
                        <p className="text-[8px] text-primary font-black uppercase flex items-center gap-1 justify-end mt-0.5">
                          Parcela {t.installmentNumber}/{t.installmentTotal} <span className="bg-primary/10 px-1 rounded">Antecipar?</span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-24 w-full pt-2 max-w-7xl mx-auto">
      {/* Header com botão responsivo */}
      <div className="px-4 md:px-8">
        <PageHeader title="Meus Cartões" icon={CreditCard}>
          <Button
            variant="outline"
            size="sm"
            className="hidden md:flex rounded-xl border-primary/20 gap-2 font-bold uppercase text-[10px] tracking-widest h-10 px-4"
            onClick={() => setShowAddCard(true)}
          >
            <Plus className="w-4 h-4 text-primary" /> Novo Cartão
          </Button>
        </PageHeader>
        
        {/* Botão Mobile Full Width */}
        <Button
          variant="outline"
          className="md:hidden w-full rounded-xl border-primary/20 gap-2 font-bold uppercase text-[10px] tracking-widest h-12 mt-2 mb-4"
          onClick={() => setShowAddCard(true)}
        >
          <Plus className="w-4 h-4 text-primary" /> Novo Cartão
        </Button>
      </div>

      {creditCards.length === 0 ? (
        <div className="mx-4 card-elevated p-12 text-center text-muted-foreground bg-muted/20 border-dashed border-2 rounded-3xl">
          <CreditCard className="w-16 h-16 mx-auto mb-4 opacity-10" />
          <p className="text-xl font-bold">Nenhum cartão ativo.</p>
          <Button variant="ghost" className="mt-4" onClick={() => setShowAddCard(true)}>
            Começar agora
          </Button>
        </div>
      ) : (
        <>
          {/* MOBILE LAYOUT (ESTILO ORIGINAL - CARTÃO REDUZIDO) */}
          <div className="block lg:hidden space-y-4">
            {/* 1. Carrossel de Cartões (Tamanho Reduzido e Centralizado) */}
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 px-10 pb-6 w-full no-scrollbar">
              {creditCards.map(card => {
                const cardUsed = getCardUsedLimit(card.id);
                const cardAvailable = card.limit - cardUsed;
                const isSelected = selectedCardId === card.id;
                
                return (
                  <div key={card.id} className="snap-center w-[300px] shrink-0">
                    <CreditCardVisual
                      card={card}
                      usedLimit={cardUsed}
                      availableLimit={cardAvailable}
                      isSelected={isSelected}
                      onClick={() => setSelectedCardId(card.id)}
                      className={cn(
                        "transition-transform duration-300",
                        !isSelected && "opacity-40 grayscale scale-90"
                      )}
                      invoiceStatus={getInvoiceStatusDisplay(
                        card,
                        viewDate,
                        transactions.some(t => t.cardId === card.id && t.isInvoicePayment && t.invoiceMonthYear === format(viewDate, 'yyyy-MM')),
                        transactions.filter(t => t.cardId === card.id && !t.isVirtual && t.categoryId !== 'card-payment' && t.invoiceMonthYear === format(viewDate, 'yyyy-MM'))
                          .reduce((sum, t) => sum + (t.type === 'income' ? -t.amount : t.amount), 0)
                      )}
                    />
                  </div>
                );
              })}
            </div>
            
            {/* 2. Painel de Fatura e Limite (Fiel ao Print) */}
            {selectedCard && (
              <div className="px-4 space-y-6">
                <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm space-y-1">
                  <p className="text-sm text-muted-foreground font-medium">Fatura atual</p>
                  <h2 className="text-3xl font-bold text-primary mt-1 mb-4 tabular-nums">
                    {formatCurrency(currentInvoiceTotal)}
                  </h2>
                  
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Limite disponível <span className="text-foreground font-bold">{formatCurrency(stats.available)}</span>
                    </p>
                    <Progress value={stats.percentUsed} className="h-1.5" />
                  </div>

                  <div className="flex justify-between text-xs text-muted-foreground mt-4 pt-4 border-t border-border/40">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Vencimento {selectedCard.dueDay}</span>
                    </div>
                    <span>Fechamento {selectedCard.closingDay}</span>
                  </div>
                </div>

                {/* 3. Botões de Ação Rápida */}
                <div className="grid grid-cols-3 gap-3">
                  <Button variant="outline" className="flex flex-col h-20 rounded-2xl gap-2 border-border/40" onClick={() => setShowEditCard(true)}>
                    <Pencil className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-bold uppercase">Ajustar</span>
                  </Button>
                  <Button variant="outline" className="flex flex-col h-20 rounded-2xl gap-2 border-border/40">
                    <Receipt className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-bold uppercase">Pagar</span>
                  </Button>
                  <Button variant="outline" className="flex flex-col h-20 rounded-2xl gap-2 border-border/40" onClick={() => {
                    const el = document.getElementById('transactions-list');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}>
                    <ArrowRight className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-bold uppercase">Extrato</span>
                  </Button>
                </div>

                {/* 4. Lista de Lançamentos */}
                <div id="transactions-list" className="pt-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Lançamentos do cartão</h3>
                    <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl">
                      <Button variant="ghost" size="icon" onClick={() => setViewDate(prev => subMonths(prev, 1))} className="h-7 w-7">{"<"}</Button>
                      <p className="text-[9px] font-black uppercase w-16 text-center">{format(viewDate, 'MMM yy', { locale: ptBR })}</p>
                      <Button variant="ghost" size="icon" onClick={() => setViewDate(prev => addMonths(prev, 1))} className="h-7 w-7">{">"}</Button>
                    </div>
                  </div>

                  <div className="space-y-2 pb-10">
                    {currentInvoiceTransactions.length === 0 ? (
                      <div className="text-center py-10 bg-muted/5 rounded-2xl border border-dashed border-border/40">
                        <p className="text-muted-foreground text-xs">Nenhum gasto nesta fatura.</p>
                      </div>
                    ) : (
                      currentInvoiceTransactions.map(t => (
                        <div key={t.id} className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/30">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-muted/50 flex items-center justify-center">
                              <Receipt className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-bold text-xs">{t.description}</p>
                              <p className="text-[10px] text-muted-foreground uppercase">{format(parseLocalDate(t.date), 'dd MMM')}</p>
                            </div>
                          </div>
                          <p className={cn("font-black text-xs", t.type === 'income' ? 'text-emerald-500' : 'text-foreground')}>
                            {t.type === 'income' ? '-' : ''}{formatCurrency(t.amount)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* DESKTOP LAYOUT (MASTER-DETAIL PRESERVADO) */}
          <div className="hidden lg:grid lg:grid-cols-12 gap-8 items-start px-8">
            {/* Master: Card List (Left Column) */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              {creditCards.map(card => {
                const cardUsed = getCardUsedLimit(card.id);
                const cardAvailable = card.limit - cardUsed;
                const isSelected = selectedCardId === card.id;
                
                return (
                  <div key={card.id} className="w-full">
                    <CreditCardVisual
                      card={card}
                      usedLimit={cardUsed}
                      availableLimit={cardAvailable}
                      isSelected={isSelected}
                      onClick={() => setSelectedCardId(card.id)}
                      className={cn(isSelected ? "ring-offset-4 ring-primary" : "opacity-80 grayscale-[30%] hover:grayscale-0 hover:opacity-100")}
                      invoiceStatus={getInvoiceStatusDisplay(
                        card,
                        viewDate,
                        transactions.some(t => t.cardId === card.id && t.isInvoicePayment && t.invoiceMonthYear === format(viewDate, 'yyyy-MM')),
                        transactions.filter(t => t.cardId === card.id && !t.isVirtual && t.categoryId !== 'card-payment' && t.invoiceMonthYear === format(viewDate, 'yyyy-MM'))
                          .reduce((sum, t) => sum + (t.type === 'income' ? -t.amount : t.amount), 0)
                      )}
                    />
                  </div>
                );
              })}
            </div>

            {/* Detail: Card Info (Right Column) */}
            <div className="lg:col-span-8">
              {renderCardDetails()}
            </div>
          </div>
        </>
      )}

      {showAddCard && (
        <Portal>
          <AddCardDialog
            isOpen={showAddCard}
            onClose={() => setShowAddCard(false)}
            onAdd={addCreditCard}
          />
        </Portal>
      )}

      {showEditCard && selectedCard && (
        <Portal>
          <EditCardDialog
            card={selectedCard}
            isOpen={showEditCard}
            onClose={() => setShowEditCard(false)}
            onSave={(updated) => updateCreditCard({ id: updated.id, updates: updated })}
          />
        </Portal>
      )}

      {transactionToAnticipate && (
        <Portal>
          <AnticipateInstallmentsDialog
            isOpen={!!transactionToAnticipate}
            onClose={() => setTransactionToAnticipate(null)}
            transaction={transactionToAnticipate}
          />
        </Portal>
      )}
    </div>
  );
}
