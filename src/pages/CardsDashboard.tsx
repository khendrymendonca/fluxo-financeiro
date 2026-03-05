import { useState } from 'react';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { Transaction, CreditCard as CreditCardType } from '@/types/finance';
import { CreditCardVisual } from '@/components/cards/CreditCardVisual';
import { AddCardDialog } from '@/components/cards/AddCardDialog';
import { Button } from '@/components/ui/button';
import { Plus, Receipt, Calendar, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addMonths, subMonths, isSameMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EditCardDialog } from '@/components/cards/EditCardDialog';
import { Pencil } from 'lucide-react';

export default function CardsDashboard() {
    const { creditCards, transactions, accounts, categories, updateCreditCard, addCreditCard } = useFinanceStore();
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
    const [viewDate, setViewDate] = useState(new Date());

    const [showAddCard, setShowAddCard] = useState(false);
    const [showEditCard, setShowEditCard] = useState(false);
    const selectedCard = creditCards.find(c => c.id === selectedCardId);

    // Calculate Card Stats
    const getCardStats = (cardId: string) => {
        const cardTransactions = transactions.filter(t => t.cardId === cardId);

        const totalSpent = cardTransactions
            .filter(t => t.type === 'expense' && !t.isInvoicePayment)
            .reduce((sum, t) => sum + t.amount, 0);

        const totalPaid = cardTransactions
            .filter(t => t.isInvoicePayment)
            .reduce((sum, t) => sum + t.amount, 0);

        const currentUsedResult = Math.max(0, totalSpent - totalPaid);
        const card = creditCards.find(c => c.id === cardId);
        const limit = card?.limit || 0;
        const percentUsed = limit > 0 ? (currentUsedResult / limit) * 100 : 0;

        return {
            used: currentUsedResult,
            available: limit - currentUsedResult,
            limit,
            percentUsed
        };
    };

    // Calculate Invoice for ViewDate
    const getInvoiceTransactions = (cardId: string) => {
        if (!selectedCard) return [];

        const closingDay = selectedCard.closingDay;
        const viewMonth = viewDate.getMonth();
        const viewYear = viewDate.getFullYear();

        // Invoice for Month M covers: (Month M-1, Day X+1) to (Month M, Day X)
        const endOfInvoice = new Date(viewYear, viewMonth, closingDay, 23, 59, 59);
        const startOfInvoice = new Date(viewYear, viewMonth - 1, closingDay + 1, 0, 0, 0);

        const viewDateStr = format(viewDate, 'yyyy-MM');

        return transactions.filter(t => {
            if (t.cardId !== cardId || t.isInvoicePayment) return false;

            // Priority 1: User explicitly set invoice reference (MonthYear)
            if (t.invoiceMonthYear) {
                return t.invoiceMonthYear === viewDateStr;
            }

            // Priority 2: Fallback to Date Calculation
            const tDate = parseISO(t.date);
            return tDate >= startOfInvoice && tDate <= endOfInvoice;
        });
    };

    const currentInvoiceTransactions = selectedCardId ? getInvoiceTransactions(selectedCardId) : [];
    const currentInvoiceTotal = currentInvoiceTransactions.reduce((sum, t) => sum + t.amount, 0);

    const stats = selectedCardId ? getCardStats(selectedCardId) : { used: 0, available: 0, limit: 0, percentUsed: 0 };

    // Handlers
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
                <Button className="gap-2 rounded-2xl h-12 px-6 shadow-lg shadow-primary/20 transition-all hover:scale-105" onClick={() => setShowAddCard(true)}>
                    <Plus className="w-5 h-5" /> Novo Cartão
                </Button>
            </div>

            {creditCards.length === 0 ? (
                <div className="card-elevated p-12 text-center text-muted-foreground bg-muted/20 border-dashed border-2">
                    <CreditCard className="w-16 h-16 mx-auto mb-4 opacity-10" />
                    <p className="text-xl">Nenhum cartão cadastrado.</p>
                    <Button variant="ghost" className="mt-4" onClick={() => setShowAddCard(true)}>Adicionar o primeiro</Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Col: Cards List/Visuals */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="flex flex-col gap-4">
                            {creditCards.map(card => {
                                const cardStats = getCardStats(card.id);
                                return (
                                    <div
                                        key={card.id}
                                        className={cn(
                                            "transition-all cursor-pointer relative group",
                                            selectedCardId && selectedCardId !== card.id && "opacity-40 grayscale scale-[0.95] hover:opacity-100 hover:grayscale-0 hover:scale-100"
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

                    {/* Right Col: Invoice Details & Limit progress */}
                    <div className="lg:col-span-8 space-y-6">
                        {selectedCard && (
                            <div className="space-y-6">
                                {/* Limit Consumed Visual */}
                                <div className="card-elevated p-6 space-y-4">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Limite Consumido</p>
                                            <p className="text-3xl font-black text-primary">{formatCurrency(stats.used)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-muted-foreground">Disponível: <span className="font-bold text-success">{formatCurrency(stats.available)}</span></p>
                                            <p className="text-xs text-muted-foreground">Limite Total: {formatCurrency(stats.limit)}</p>
                                        </div>
                                    </div>

                                    <div className="h-4 bg-muted rounded-full overflow-hidden border border-border/50">
                                        <div
                                            className={cn(
                                                "h-full transition-all duration-1000 ease-out",
                                                stats.percentUsed > 90 ? "bg-danger" : stats.percentUsed > 70 ? "bg-amber-500" : "bg-primary"
                                            )}
                                            style={{ width: `${Math.min(100, stats.percentUsed)}%` }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-right text-muted-foreground font-bold">{stats.percentUsed.toFixed(1)}% do limite utilizado</p>
                                </div>

                                {/* Invoice Details */}
                                <div className="card-elevated p-0 overflow-hidden flex flex-col min-h-[500px]">
                                    {/* Invoice Header */}
                                    <div className="p-6 border-b bg-muted/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div className="flex items-center gap-6">
                                            <div className="flex items-center gap-2">
                                                <Button variant="outline" size="icon" onClick={handlePrevMonth} className="rounded-xl h-10 w-10">{'<'}</Button>
                                                <div className="text-center min-w-[140px]">
                                                    <h3 className="font-bold text-lg capitalize">{format(viewDate, 'MMMM yyyy', { locale: ptBR })}</h3>
                                                    <p className="text-[10px] uppercase font-black text-muted-foreground">Status: Aberta</p>
                                                </div>
                                                <Button variant="outline" size="icon" onClick={handleNextMonth} className="rounded-xl h-10 w-10">{'>'}</Button>
                                            </div>
                                            <div className="hidden md:block h-10 w-[1px] bg-border" />
                                            <div>
                                                <p className="text-[10px] uppercase font-black text-muted-foreground">Fechamento</p>
                                                <p className="text-sm font-bold flex items-center gap-2"><Calendar className="w-3 h-3" /> Dia {selectedCard.closingDay}</p>
                                            </div>
                                        </div>

                                        <div className="text-right flex flex-col items-end">
                                            <p className="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2">
                                                <Receipt className="w-4 h-4" /> Total da Fatura
                                            </p>
                                            <p className="text-4xl font-black">{formatCurrency(currentInvoiceTotal)}</p>
                                        </div>
                                    </div>

                                    {/* Invoice Items List */}
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
                                                    <div key={t.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-muted/50 transition-all group border border-transparent hover:border-border">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center group-hover:bg-background transition-colors">
                                                                <Receipt className="w-6 h-6 text-muted-foreground" />
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-foreground">{t.description}</p>
                                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                    <span>{format(parseISO(t.date), 'dd MMM', { locale: ptBR })}</span>
                                                                    {category && (
                                                                        <>
                                                                            <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                                                                            <span className="font-medium text-primary/70">{category.name}</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-black text-lg">{formatCurrency(t.amount)}</p>
                                                            {t.installmentTotal && (
                                                                <p className="text-[10px] text-muted-foreground font-bold">PARCELA {t.installmentNumber}/{t.installmentTotal}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>

                                    {/* Footer / Summary */}
                                    <div className="p-6 border-t bg-muted/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div>
                                            <p className="text-xs text-muted-foreground font-bold uppercase">Vencimento da Fatura</p>
                                            <p className="text-lg font-black text-danger flex items-center gap-2">
                                                <Calendar className="w-5 h-5" /> Dia {selectedCard.dueDay}
                                            </p>
                                        </div>
                                        <Button
                                            size="lg"
                                            disabled={currentInvoiceTotal <= 0}
                                            className="rounded-2xl px-12 h-14 text-lg font-bold shadow-xl shadow-primary/20 transition-all active:scale-95"
                                        >
                                            Pagar Fatura Completa
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showAddCard && (
                <AddCardDialog
                    isOpen={showAddCard}
                    onClose={() => setShowAddCard(false)}
                    onAdd={addCreditCard}
                />
            )}

            {showEditCard && selectedCard && (
                <EditCardDialog
                    card={selectedCard}
                    isOpen={showEditCard}
                    onClose={() => setShowEditCard(false)}
                    onSave={(updated) => updateCreditCard(updated)}
                />
            )}
        </div>
    );
}
