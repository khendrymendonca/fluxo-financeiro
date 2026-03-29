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
    const cardWidth = container.offsetWidth * 0.8;
    const index = Math.round(scrollLeft / (cardWidth + 16));
    if (creditCards[index] && creditCards[index].id !== selectedCardId) {
      setSelectedCardId(creditCards[index].id);
    }
  };

  const selectedCard = creditCards.find(c => c.id === selectedCardId);

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
        if (t.isVirtual) return false;
        if (t.invoiceMonthYear) {
          return t.invoiceMonthYear === viewDateStr;
        }
        const tDate = parseLocalDate(t.date);
        return tDate >= startInv && tDate <= endInv;
      });

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
    ? getInvoiceStatusDisplay(selectedCard, viewDate, invoiceStatus === 'paga', currentInvoiceTotal)
    : null;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-4 animate-fade-in pb-24 w-full pt-2">
      <PageHeader title="Meus Cartões" icon={CreditCard}>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full h-10 w-10 border-primary/20"
          onClick={() => setShowAddCard(true)}
        >
          <Plus className="w-5 h-5 text-primary" />
        </Button>
      </PageHeader>

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
              "flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 no-scrollbar w-full px-[7.5vw]",
              "md:grid md:grid-cols-2 lg:grid-cols-3 md:overflow-visible md:snap-none md:flex-wrap md:px-0"
            )}
          >
            {creditCards.map(card => {
              const cardStats = getCardStats(card.id);
              return (
                <div
                  key={card.id}
                  className={cn(
                    "snap-center shrink-0 transition-opacity duration-300 min-w-[85vw] max-w-[85vw]",
                    "md:min-w-[350px] md:max-w-[350px] md:snap-align-none",
                    selectedCardId !== card.id && "opacity-50 md:opacity-100"
                  )}
                >
                  <CreditCardVisual
                    card={card}
                    usedLimit={cardStats.used}
                    availableLimit={cardStats.available}
                    className={cn(selectedCardId === card.id && "md:ring-2 md:ring-primary md:ring-offset-2")}
                    onClick={() => setSelectedCardId(card.id)}
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
            <div className="snap-center shrink-0 w-[7.5vw] md:hidden" />
          </div>

          {selectedCard && (
            <div className="md:grid md:grid-cols-[1fr_350px] md:gap-8 items-start">
              <div className="space-y-8 mt-4 animate-slide-up">
                {/* Info Panel */}
                <div className="text-center md:text-left space-y-1">
                  <p className="text-xs uppercase font-black text-muted-foreground tracking-[0.2em]">Fatura Atual</p>
                  <h2 className="text-5xl font-black tracking-tighter transition-all">
                    {formatCurrency(currentInvoiceTotal)}
                  </h2>
                  <div className="flex items-center justify-center md:justify-start gap-2 text-xs font-bold text-muted-foreground mt-2">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Vence {selectedCard.dueDay} {format(viewDate, 'MMM', { locale: ptBR })}</span>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    {dynamicStatus && (
                      <span className={cn(
                        "uppercase tracking-wider flex items-center gap-1",
                        dynamicStatus.color
                      )}>
                        {dynamicStatus.icon} {dynamicStatus.text}
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Panel Mobile */}
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
                    <div className="px-6 py-4 rounded-2xl bg-primary/5 border border-primary/10 text-center">
                      <p className="text-xs font-bold text-primary flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4" /> Pagamento Centralizado
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Para pagar esta fatura, utilize a aba de <span className="font-bold">Gestão de Contas</span>.
                      </p>
                    </div>
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
                          <div
                            key={t.id}
                            onClick={() => {
                              if (t.installmentTotal && t.installmentNumber && t.installmentGroupId) {
                                setTransactionToAnticipate(t);
                              }
                            }}
                            className={cn(
                              "flex items-center justify-between p-4 rounded-[2rem] bg-muted/10 hover:bg-muted/30 transition-all border border-border/20",
                              t.installmentTotal && "cursor-pointer group"
                            )}
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary transition-colors">
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
                                <p className="text-[8px] text-primary font-black uppercase flex items-center gap-1 justify-end animate-in fade-in slide-in-from-right-1">
                                  P {t.installmentNumber}/{t.installmentTotal} <span className="text-[7px] bg-primary/10 px-1 rounded">Antecipar?</span>
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
                      <div className="px-4 py-3 rounded-xl bg-primary/5 border border-primary/10 text-center">
                        <p className="text-[10px] font-bold text-primary flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Pagamento Centralizado
                        </p>
                        <p className="text-[9px] text-muted-foreground mt-1">
                          Utilize a aba de <span className="font-bold">Gestão de Contas</span> para liqüidar esta fatura.
                        </p>
                      </div>

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
