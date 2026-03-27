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
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerFooter, DrawerClose } from '@/components/ui/drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

export default function CardsDashboard() {
  const {
    creditCards,
    transactions,
    accounts,
    categories,
    updateCreditCard,
    addCreditCard,
    getCardUsedLimit,
    addTransaction,
    togglePaid
  } = useFinanceStore();

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [viewDate, setViewDate] = useState(new Date());
  const [showAddCard, setShowAddCard] = useState(false);
  const [showEditCard, setShowEditCard] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Carousel Logic
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (creditCards.length > 0 && !selectedCardId) {
      setSelectedCardId(creditCards[0].id);
    }
  }, [creditCards, selectedCardId]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const scrollLeft = container.scrollLeft;
    const cardWidth = container.offsetWidth * 0.8; // Approximate based on w-[80vw]
    const index = Math.round(scrollLeft / (cardWidth + 16)); // 16 is gap-4
    if (creditCards[index] && creditCards[index].id !== selectedCardId) {
      setSelectedCardId(creditCards[index].id);
    }
  };

  const selectedCard = creditCards.find(c => c.id === selectedCardId);

  // âœ… CORRIGIDO: usa getCardUsedLimit e getCardAvailableLimit do store
  // que já filtram isVirtual, isInvoicePayment, paidInvoices e cardId corretamente
  const getCardStats = (cardId: string) => {
    const card = creditCards.find(c => c.id === cardId);
    const limit = Number(card?.limit || 0);
    const used = getCardUsedLimit(cardId);
    const available = limit - used;
    const percentUsed = limit > 0 ? (used / limit) * 100 : 0;
    const isOverLimit = used > limit;
    return { used, available, limit, percentUsed, isOverLimit };
  };

  const getInvoiceTransactions = (cardId: string) => {
    const card = creditCards.find(c => c.id === cardId);
    if (!card) return [];
    const viewDateStr = format(viewDate, 'yyyy-MM');
    const { closingDay } = getCardSettingsForDate(card, viewDate);
    const viewYear = viewDate.getFullYear();
    const viewMonth = viewDate.getMonth();
    const endInv = new Date(viewYear, viewMonth, closingDay, 23, 59, 59);
    const startInv = new Date(viewYear, viewMonth - 1, closingDay + 1, 0, 0, 0);

    const allInvoiceTransactions = transactions
      .filter(t => {
        if (t.cardId !== cardId || t.isInvoicePayment) return false;
        if (t.isVirtual) return false; // âœ… nunca mostrar projeções na fatura
        if (t.invoiceMonthYear) {
          return t.invoiceMonthYear === viewDateStr;
        }
        const tDate = parseLocalDate(t.date);
        return tDate >= startInv && tDate <= endInv;
      });

    // Filtro de Busca por Texto
    const filteredInvoiceTransactions = allInvoiceTransactions.filter(t => {
      if (searchQuery.trim() === '') return true;
      const query = searchQuery.toLowerCase();
      const matchesDescription = t.description.toLowerCase().includes(query);
      const matchesCategory = categories.find(c => c.id === t.categoryId)?.name.toLowerCase().includes(query);
      return matchesDescription || matchesCategory;
    });

    return filteredInvoiceTransactions.sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());
  };

  const getInvoiceStatus = (cardId: string): 'paga' | 'aberta' => {
    const viewDateStr = format(viewDate, 'yyyy-MM');
    const hasPaid = transactions.some(
      t => t.cardId === cardId && t.isInvoicePayment && t.invoiceMonthYear === viewDateStr
    );
    return hasPaid ? 'paga' : 'aberta';
  };

  const currentInvoiceTransactions = selectedCardId ? getInvoiceTransactions(selectedCardId) : [];
  const currentInvoiceTotal = currentInvoiceTransactions.reduce(
    (sum, t) => sum + (t.type === 'income' ? -t.amount : t.amount),
    0
  );
  const stats = selectedCardId
    ? getCardStats(selectedCardId)
    : { used: 0, available: 0, limit: 0, percentUsed: 0, isOverLimit: false };
  const invoiceStatus = selectedCardId ? getInvoiceStatus(selectedCardId) : 'aberta';
  const dynamicStatus = selectedCard && selectedCardId
    ? getInvoiceStatusDisplay(selectedCard, viewDate, invoiceStatus === 'paga')
    : { text: 'Aberta', color: 'text-primary', icon: '🔓' };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // --- Antecipar Pagamento Logic ---
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  useEffect(() => {
    if (currentInvoiceTotal > 0) {
      setPaymentAmount(currentInvoiceTotal);
    } else {
      setPaymentAmount(0);
    }
  }, [currentInvoiceTotal, selectedCardId]);

  const selectedAccount = accounts.find(a => a.id === sourceAccountId);
  const canPay = selectedAccount && paymentAmount > 0 && paymentAmount <= selectedAccount.balance;

  const handlePayInvoice = async () => {
    if (!selectedCard || !selectedAccount || !canPay) return;
    setIsProcessingPayment(true);
    try {
      // 1. Criar transação de despesa na conta
      const payCategory = categories.find(c =>
        c.name.toLowerCase().includes('pagamento') ||
        c.name.toLowerCase().includes('cartão') ||
        c.name.toLowerCase().includes('fatura')
      ) || categories[0];

      await addTransaction({
        description: `Pgto Fatura - ${selectedCard.name}`,
        amount: Math.abs(paymentAmount),
        type: 'expense',
        transactionType: 'punctual',
        accountId: sourceAccountId,
        categoryId: payCategory?.id,
        date: new Date().toISOString(),
        isPaid: true,
        paymentDate: new Date().toISOString(),
        isInvoicePayment: true,
        cardId: selectedCard.id,
        invoiceMonthYear: format(viewDate, 'yyyy-MM')
      });

      // 2. Marcar transações da fatura como pagas
      const txsToMarkAsPaid = currentInvoiceTransactions.filter(t => !t.isPaid);
      for (const tx of txsToMarkAsPaid) {
        await togglePaid({ id: tx.id, isPaid: true });
      }

      // Invalidação de queries já acontece nas mutações
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in pb-24 max-w-4xl mx-auto px-4 md:px-0">
      <header className="flex items-center justify-between py-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Meus Cartões</h1>
          <p className="text-muted-foreground text-sm">Gere seu limite com inteligência.</p>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full h-10 w-10 border-primary/20"
          onClick={() => setShowAddCard(true)}
        >
          <Plus className="w-5 h-5 text-primary" />
        </Button>
      </header>

      {creditCards.length === 0 ? (
        <div className="card-elevated p-12 text-center text-muted-foreground bg-muted/20 border-dashed border-2 rounded-3xl">
          <CreditCard className="w-16 h-16 mx-auto mb-4 opacity-10" />
          <p className="text-xl font-bold">Nenhum cartão ativo.</p>
          <Button variant="ghost" className="mt-4" onClick={() => setShowAddCard(true)}>
            Começar agora
          </Button>
        </div>
      ) : (
        <>
          {/* Carousel Dynamic */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className={cn(
              "flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 no-scrollbar -mx-4 px-4 mask-fade-edges",
              "md:grid md:grid-cols-2 lg:grid-cols-3 md:overflow-visible md:snap-none md:flex-wrap md:mx-0 md:px-0 md:mask-none"
            )}
          >
            {creditCards.map(card => {
              const cardStats = getCardStats(card.id);
              return (
                <div
                  key={card.id}
                  className={cn(
                    "snap-center shrink-0 transition-opacity duration-300",
                    "md:snap-align-none md:shrink",
                    selectedCardId !== card.id && "opacity-50 md:opacity-100" // No opacity fix on Desktop since it's a grid
                  )}
                >
                  <CreditCardVisual
                    card={card}
                    usedLimit={cardStats.used}
                    availableLimit={cardStats.available}
                    className={cn(selectedCardId === card.id && "md:ring-2 md:ring-primary md:ring-offset-2")} // Highlight active card on Desktop
                    onClick={() => setSelectedCardId(card.id)}
                  />
                </div>
              );
            })}
            <div className="snap-center shrink-0 w-8 md:hidden" /> {/* Spacer only on mobile */}
          </div>

          {selectedCard && (
            <div className="md:grid md:grid-cols-[1fr_350px] md:gap-8 items-start">
              <div className="space-y-8 mt-4 animate-slide-up">
                {/* Itaú Info Panel */}
                <div className="text-center md:text-left space-y-1">
                  <p className="text-xs uppercase font-black text-muted-foreground tracking-[0.2em]">Fatura Atual</p>
                  <h2 className="text-5xl font-black tracking-tighter transition-all">
                    {formatCurrency(currentInvoiceTotal)}
                  </h2>
                  <div className="flex items-center justify-center md:justify-start gap-2 text-xs font-bold text-muted-foreground mt-2">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Vence {selectedCard.dueDay} {format(viewDate, 'MMM', { locale: ptBR })}</span>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <span className={cn(
                      "uppercase tracking-wider flex items-center gap-1",
                      dynamicStatus.color
                    )}>
                      {dynamicStatus.icon} {dynamicStatus.text}
                    </span>
                  </div>
                </div>

                {/* Progress Panel Mobile/Common */}
                <div className="card-elevated p-6 rounded-[2.5rem] shadow-sm border-none bg-muted/30 md:hidden">
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Limite Disponível</p>
                        <p className="text-2xl font-black text-foreground">{formatCurrency(stats.available)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground font-bold">Total: {formatCurrency(stats.limit)}</p>
                      </div>
                    </div>

                    <Progress value={stats.percentUsed} className="h-2.5 bg-background" />

                    <div className="flex justify-between items-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs font-bold p-0 h-auto hover:bg-transparent text-primary gap-1"
                        onClick={() => setShowEditCard(true)}
                      >
                        Ajustar Limite <Pencil className="w-3 h-3" />
                      </Button>
                      <p className="text-[10px] font-black text-muted-foreground">
                        {stats.percentUsed.toFixed(0)}% USADO
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-border/50">
                    <Drawer>
                      <DrawerTrigger asChild>
                        <Button className="w-full h-14 rounded-2xl bg-foreground text-background font-black text-base shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all gap-2">
                          Antecipar Pagamento <ArrowRight className="w-5 h-5" />
                        </Button>
                      </DrawerTrigger>
                      <DrawerContent>
                        <div className="mx-auto w-full max-w-sm">
                          <DrawerHeader>
                            <DrawerTitle className="text-center text-2xl font-black">Pagar Fatura</DrawerTitle>
                            <p className="text-center text-muted-foreground text-sm">Libere seu limite agora.</p>
                          </DrawerHeader>
                          <div className="p-4 space-y-6">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Valor do Pagamento</label>
                              <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-xl">R$</span>
                                <Input
                                  type="number"
                                  value={paymentAmount}
                                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                                  className="h-16 pl-12 text-2xl font-black rounded-2xl border-2 focus:border-primary transition-all"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Conta de Origem</label>
                              <Select value={sourceAccountId} onValueChange={setSourceAccountId}>
                                <SelectTrigger className="h-14 rounded-2xl border-2 font-bold">
                                  <SelectValue placeholder="Escolha uma conta" />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-2">
                                  {accounts.map(acc => (
                                    <SelectItem key={acc.id} value={acc.id} className="font-bold py-3">
                                      <div className="flex items-center gap-2">
                                        <Wallet className="w-4 h-4 text-muted-foreground" />
                                        <span>{acc.name}</span>
                                        <span className="text-muted-foreground ml-auto opacity-50">{formatCurrency(acc.balance)}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <DrawerFooter className="pb-8">
                            <Button
                              disabled={!canPay || isProcessingPayment}
                              onClick={handlePayInvoice}
                              className="h-14 rounded-2xl font-black text-lg gap-2"
                            >
                              {isProcessingPayment ? "Processando..." : "Confirmar Pagamento"}
                              <CheckCircle2 className="w-5 h-5" />
                            </Button>
                            <DrawerClose asChild>
                              <Button variant="ghost" className="font-bold">Cancelar</Button>
                            </DrawerClose>
                          </DrawerFooter>
                        </div>
                      </DrawerContent>
                    </Drawer>
                  </div>
                </div>

                {/* Transaction List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs uppercase font-black text-muted-foreground tracking-widest ml-1">Lançamentos</h3>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" onClick={() => setViewDate(prev => subMonths(prev, 1))} className="h-8 w-8 rounded-xl">{"<"}</Button>
                      <p className="text-xs font-black capitalize w-24 text-center">{format(viewDate, 'MMMM yyyy', { locale: ptBR })}</p>
                      <Button variant="outline" size="icon" onClick={() => setViewDate(prev => addMonths(prev, 1))} className="h-8 w-8 rounded-xl">{">"}</Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {currentInvoiceTransactions.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground opacity-30 italic font-medium">
                        Nenhum gasto nesta fatura.
                      </div>
                    ) : (
                      currentInvoiceTransactions.map(t => {
                        const category = categories.find(c => c.id === t.categoryId);
                        return (
                          <div key={t.id} className="flex items-center justify-between p-4 rounded-[2rem] bg-muted/10 hover:bg-muted/30 transition-all border border-border/20">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                                <Receipt className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-bold text-sm leading-tight mb-0.5">{t.description}</p>
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold">
                                  <span>{format(parseLocalDate(t.date), 'dd MMM')}</span>
                                  {category && <span className="text-primary/70">{category.name}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={cn("font-black text-sm", t.type === 'income' ? 'text-success' : 'text-foreground')}>
                                {t.type === 'income' ? '-' : ''}{formatCurrency(t.amount)}
                              </p>
                              {t.installmentTotal && (
                                <p className="text-[8px] text-muted-foreground font-black uppercase">P {t.installmentNumber}/{t.installmentTotal}</p>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar Panel for Desktop */}
              <div className="hidden md:block space-y-6 mt-4">
                <div className="card-elevated p-6 rounded-[2.5rem] shadow-sm border-none bg-muted/30 sticky top-24">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest text-center">Limite Disponível</p>
                      <p className="text-3xl font-black text-foreground text-center">{formatCurrency(stats.available)}</p>
                      <Progress value={stats.percentUsed} className="h-2 bg-background" />
                      <div className="flex justify-between items-center text-[10px] font-black text-muted-foreground">
                        <span>{stats.percentUsed.toFixed(0)}% USADO</span>
                        <span>{formatCurrency(stats.limit)} TOTAL</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border/50 space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Antecipar Pagamento</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-lg">R$</span>
                          <Input
                            type="number"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(Number(e.target.value))}
                            className="h-12 pl-10 text-xl font-black rounded-xl border-2 focus:border-primary"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Conta</label>
                        <Select value={sourceAccountId} onValueChange={setSourceAccountId}>
                          <SelectTrigger className="h-12 rounded-xl border-2 font-bold">
                            <SelectValue placeholder="Escolha" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-2">
                            {accounts.map(acc => (
                              <SelectItem key={acc.id} value={acc.id} className="font-bold">
                                {acc.name} ({formatCurrency(acc.balance)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        disabled={!canPay || isProcessingPayment}
                        onClick={handlePayInvoice}
                        className="w-full h-12 rounded-xl font-black text-base gap-2"
                      >
                        {isProcessingPayment ? "Processando..." : "Pagar Fatura"}
                        <CheckCircle2 className="w-5 h-5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs font-bold text-primary gap-1"
                        onClick={() => setShowEditCard(true)}
                      >
                        Ajustar Limite <Pencil className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
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
            onSave={(updated) => updateCreditCard(updated.id, updated)}
          />
        </Portal>
      )}
    </div>
  );
}


