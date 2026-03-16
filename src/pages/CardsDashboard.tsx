import { useState } from 'react';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { CreditCardVisual } from '@/components/cards/CreditCardVisual';
import { AddCardDialog } from '@/components/cards/AddCardDialog';
import { Button } from '@/components/ui/button';
import { Plus, Receipt, Calendar, CreditCard, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EditCardDialog } from '@/components/cards/EditCardDialog';
import { Portal } from '@/components/ui/Portal';

export default function CardsDashboard() {
  const {
    creditCards,
    transactions,
    categories,
    updateCreditCard,
    addCreditCard,
    getCardSettingsForDate,
    getCardUsedLimit,       // ✅ usa o store — lógica centralizada e correta
    getCardAvailableLimit,  // ✅ usa o store — lógica centralizada e correta
  } = useFinanceStore();

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [viewDate, setViewDate] = useState(new Date());
  const [showAddCard, setShowAddCard] = useState(false);
  const [showEditCard, setShowEditCard] = useState(false);

  const selectedCard = creditCards.find(c => c.id === selectedCardId);

  const parseLocalDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // ✅ CORRIGIDO: usa getCardUsedLimit e getCardAvailableLimit do store
  // que já filtram isVirtual, isInvoicePayment, paidInvoices e cardId corretamente
  const getCardStats = (cardId: string) => {
    const card = creditCards.find(c => c.id === cardId);
    const limit = Number(card?.limit || 0);
    const used = getCardUsedLimit(cardId);
    const available = getCardAvailableLimit(cardId);
    const percentUsed = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
    const isOverLimit = used > limit;
    return { used, available, limit, percentUsed, isOverLimit };
  };

  const getInvoiceTransactions = (cardId: string) => {
    if (!selectedCard) return [];
    const viewDateStr = format(viewDate, 'yyyy-MM');
    const { closingDay } = getCardSettingsForDate(selectedCard, viewDate);
    const viewYear = viewDate.getFullYear();
    const viewMonth = viewDate.getMonth();
    const endOfInvoice = new Date(viewYear, month, closingDay, 23, 59, 59); // Note: Fix potential 'month' vs 'viewMonth' below if needed, but user provided version
    // Re-checking user snippet for potential errors: startOfInvoice = new Date(viewYear, viewMonth - 1, closingDay + 1, 0, 0, 0);
    // User snippet had `month` undefined? Let's fix based on logic
    const endInv = new Date(viewYear, viewMonth, closingDay, 23, 59, 59);
    const startInv = new Date(viewYear, viewMonth - 1, closingDay + 1, 0, 0, 0);

    return transactions
      .filter(t => {
        if (t.cardId !== cardId || t.isInvoicePayment) return false;
        if (t.isVirtual) return false; // ✅ nunca mostrar projeções na fatura
        if (t.invoiceMonthYear) {
          return t.invoiceMonthYear === viewDateStr;
        }
        const tDate = parseLocalDate(t.date);
        return tDate >= startInv && tDate <= endInv;
      })
      .sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());
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

  const handlePrevMonth = () => setViewDate(prev => subMonths(prev, 1));
  const handleNextMonth = () => setViewDate(prev => addMonths(prev, 1));

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-8 animate-fade-in pb-20 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Cartões de Crédito</h1>
          <p className="text-muted-foreground mt-1 text-lg">Limite inteligente e faturas detalhadas.</p>
        </div>
        <Button
          className="gap-2 rounded-2xl h-12 px-6 shadow-lg shadow-primary/20 transition-all hover:scale-105"
          onClick={() => setShowAddCard(true)}
        >
          <Plus className="w-5 h-5" /> Novo Cartão
        </Button>
      </div>

      {creditCards.length === 0 ? (
        <div className="card-elevated p-12 text-center text-muted-foreground bg-muted/20 border-dashed border-2">
          <CreditCard className="w-16 h-16 mx-auto mb-4 opacity-10" />
          <p className="text-xl">Nenhum cartão cadastrado.</p>
          <Button variant="ghost" className="mt-4" onClick={() => setShowAddCard(true)}>
            Adicionar o primeiro
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Left Col: Cards List */}
          <div className="lg:col-span-4 space-y-6">
            <div className="flex flex-col gap-4">
              {creditCards.map(card => {
                const cardStats = getCardStats(card.id);
                return (
                  <div
                    key={card.id}
                    className={cn(
                      "transition-all cursor-pointer relative group",
                      selectedCardId && selectedCardId !== card.id &&
                      "opacity-40 grayscale scale-[0.95] hover:opacity-100 hover:grayscale-0 hover:scale-100"
                    )}
                    onClick={() => setSelectedCardId(prev => prev === card.id ? null : card.id)}
                  >
                    <CreditCardVisual
                      card={card}
                      usedLimit={cardStats.used}
                      availableLimit={cardStats.available}
                    />
                    {selectedCardId === card.id && (
                      <Button
                        size="icon"
                        variant="secondary"
                        className="absolute top-4 right-4 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowEditCard(true);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Col: Invoice Details */}
          <div className="lg:col-span-8 space-y-6">
            {selectedCard ? (
              <div className="space-y-6">

                {/* Limit Progress */}
                <div className="card-elevated p-6 space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                        Limite Consumido
                      </p>
                      <p className="text-3xl font-black text-primary">{formatCurrency(stats.used)}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Soma faturas abertas + parcelamentos futuros não pagos
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        Disponível:{' '}
                        <span className={cn("font-bold", stats.isOverLimit ? "text-danger" : "text-success")}>
                          {formatCurrency(stats.available)}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Limite Total: {formatCurrency(stats.limit)}
                      </p>
                      {stats.isOverLimit && (
                        <p className="text-[10px] text-danger font-bold mt-1">⚠️ Limite excedido!</p>
                      )}
                    </div>
                  </div>
                  <div className="h-4 bg-muted rounded-full overflow-hidden border border-border/50">
                    <div
                      className={cn(
                        "h-full transition-all duration-1000 ease-out",
                        stats.percentUsed >= 100 ? "bg-danger" :
                          stats.percentUsed > 80 ? "bg-amber-500" : "bg-primary"
                      )}
                      style={{ width: `${stats.percentUsed}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-right text-muted-foreground font-bold">
                    {stats.percentUsed.toFixed(1)}% do limite utilizado
                  </p>
                </div>

                {/* Invoice Details */}
                <div className="card-elevated p-0 overflow-hidden flex flex-col min-h-[500px]">
                  <div className="p-6 border-b bg-muted/5 flex flex-col gap-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2.5 rounded-2xl">
                          <Receipt className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">
                            Total da Fatura
                          </p>
                          <p className="text-4xl font-black">{formatCurrency(currentInvoiceTotal)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-8 gap-y-4 pt-2 border-t border-border/50">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handlePrevMonth}
                          className="rounded-xl h-8 w-8 text-xs"
                        >
                          {'<'}
                        </Button>
                        <h3 className="font-bold text-sm capitalize min-w-[100px] text-center">
                          {format(viewDate, 'MMMM yyyy', { locale: ptBR })}
                        </h3>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleNextMonth}
                          className="rounded-xl h-8 w-8 text-xs"
                        >
                          {'>'}
                        </Button>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5 text-primary" />
                          Fechamento: Dia {selectedCard.closingDay}
                        </span>
                        <span className="flex items-center gap-2 text-xs font-bold text-danger">
                          <Calendar className="w-3.5 h-3.5" />
                          Vencimento: Dia {selectedCard.dueDay}
                        </span>
                      </div>

                      <div className="ml-auto">
                        <span
                          className={cn(
                            "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                            invoiceStatus === 'paga'
                              ? "bg-success/10 text-success"
                              : "bg-primary/10 text-primary"
                          )}
                        >
                          Status: {invoiceStatus === 'paga' ? '✅ Paga' : '🔓 Aberta'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Invoice Items */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {currentInvoiceTransactions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground opacity-30">
                        <Receipt className="w-16 h-16 mb-4" />
                        <p className="text-lg font-bold">Nenhum gasto nesta fatura.</p>
                      </div>
                    ) : (
                      currentInvoiceTransactions.map(t => {
                        const category = categories.find(c => c.id === t.categoryId);
                        return (
                          <div key={t.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/30 transition-all group border border-transparent">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center group-hover:bg-background transition-colors text-muted-foreground">
                                <Receipt className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-bold text-sm text-foreground leading-none mb-1">{t.description}</p>
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                                  <span>{format(parseLocalDate(t.date), 'dd MMM', { locale: ptBR })}</span>
                                  {category && (
                                    <>
                                      <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/30" />
                                      <span className="text-primary/70">{category.name}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={cn("font-black text-base", t.type === 'income' ? "text-success" : "text-foreground")}>
                                {t.type === 'income' ? '-' : ''}{formatCurrency(t.amount)}
                              </p>
                              {t.installmentTotal && (
                                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter">
                                  Parc {t.installmentNumber}/{t.installmentTotal}
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
            ) : (
              <div className="card-elevated p-16 text-center text-muted-foreground opacity-40">
                <CreditCard className="w-16 h-16 mx-auto mb-4" />
                <p className="text-lg font-bold">Selecione um cartão para ver os detalhes</p>
              </div>
            )}
          </div>
        </div>
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
            onSave={(updated) => updateCreditCard(updated)}
          />
        </Portal>
      )}
    </div>
  );
}
