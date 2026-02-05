import { useState } from 'react';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { Transaction, CreditCard } from '@/types/finance';
import { CreditCardVisual } from '@/components/cards/CreditCardVisual';
import { AddCardDialog } from '@/components/cards/AddCardDialog';
import { Button } from '@/components/ui/button';
import { Plus, Receipt, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addMonths, subMonths, isSameMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function CardsDashboard() {
    const { creditCards, transactions, accounts, updateCreditCard, addCreditCard, getCardSettingsForDate } = useFinanceStore();
    const [selectedCardId, setSelectedCardId] = useState<string | null>(creditCards.length > 0 ? creditCards[0].id : null);
    const [viewDate, setViewDate] = useState(new Date());

    const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
    const [showAddCard, setShowAddCard] = useState(false);
    const selectedCard = creditCards.find(c => c.id === selectedCardId);

    // Calculate Card Stats
    const getCardStats = (cardId: string) => {
        // Total Used based on ALL unpaid expenses? 
        // Or just "Month Invoice"?
        // The visual card usually shows "Available Limit" which depends on ALL usage.
        // Logic: Limit - (Sum of Expenses on Card - Sum of Payments for Card)
        // Note: We need to filter `isInvoicePayment` for payments.
        const cardTransactions = transactions.filter(t => t.cardId === cardId);

        const totalSpent = cardTransactions
            .filter(t => t.type === 'expense' && !t.isInvoicePayment)
            .reduce((sum, t) => sum + t.amount, 0);

        const totalPaid = cardTransactions
            .filter(t => t.isInvoicePayment)
            .reduce((sum, t) => sum + t.amount, 0);

        const currentUsedResult = Math.max(0, totalSpent - totalPaid);

        return {
            used: currentUsedResult,
            available: selectedCard ? selectedCard.limit - currentUsedResult : 0
        };
    };

    // Calculate Invoice for ViewDate
    const getInvoiceTransactions = (cardId: string) => {
        // Naive implementation: Filter by month of `date` field.
        // In real world, depends on "Closing Day".
        // If closing day is 10.
        // Transactions from Previous Month 11th to Current Month 10th belong to Current Invoice.
        if (!selectedCard) return [];

        const closingDay = selectedCard.closingDay;
        const viewMonth = viewDate.getMonth();
        const viewYear = viewDate.getFullYear();

        // Due date is usually in the "View Month". 
        // The "Invoice Period" usually ends ~10 days before Due Date.
        // Let's assume `viewDate` represents the "Due Month".

        // If closing day is 25, and Due Day 05 (Next Month).
        // Complex.
        // Let's stick to User Request: "ajustar isso mês a mês".
        // For now, simpler logic: 
        // Filter transactions where `date` month matches `viewDate` month? 
        // No, credit card billing cycles overlap months.

        // Improved Logic:
        // If closing day is X.
        // Invoice for Month M covers: (Month M-1, Day X+1) to (Month M, Day X).

        const endOfInvoice = new Date(viewYear, viewMonth, closingDay);
        const startOfInvoice = new Date(viewYear, viewMonth - 1, closingDay + 1);

        endOfInvoice.setHours(23, 59, 59, 999);
        startOfInvoice.setHours(0, 0, 0, 0);

        const viewDateStr = format(viewDate, 'yyyy-MM');

        return transactions.filter(t => {
            if (t.cardId !== cardId || t.isInvoicePayment) return false;

            // Priority 1: User explicitly set invoice reference
            if (t.invoiceDate) {
                return t.invoiceDate === viewDateStr;
            }

            // Priority 2: Fallback to Date Calculation
            const tDate = parseISO(t.date);
            return tDate >= startOfInvoice && tDate <= endOfInvoice;
        });
    };

    const currentInvoiceTransactions = selectedCardId ? getInvoiceTransactions(selectedCardId) : [];
    const currentInvoiceTotal = currentInvoiceTransactions.reduce((sum, t) => sum + t.amount, 0);

    const stats = selectedCardId ? getCardStats(selectedCardId) : { used: 0, available: 0 };

    // Handlers
    const handlePrevMonth = () => setViewDate(prev => subMonths(prev, 1));
    const handleNextMonth = () => setViewDate(prev => addMonths(prev, 1));

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Cartões de Crédito</h1>
                    <p className="text-muted-foreground mt-1">Gerencie seus limites e faturas.</p>
                </div>
                <Button className="gap-2" onClick={() => setShowAddCard(true)}>
                    <Plus className="w-4 h-4" /> Novo Cartão
                </Button>
            </div>

            {creditCards.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed rounded-xl text-muted-foreground">
                    Você ainda não cadastrou nenhum cartão.
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Col: Cards List/Visuals */}
                    <div className="lg:col-span-1 space-y-6">
                        {creditCards.map(card => {
                            const cardStats = getCardStats(card.id);
                            return (
                                <div key={card.id} className={cn("transition-all", selectedCardId !== card.id && "opacity-60 scale-95 hover:opacity-100 hover:scale-[0.98]")}>
                                    <CreditCardVisual
                                        card={card}
                                        usedLimit={cardStats.used}
                                        availableLimit={cardStats.available}
                                        onClick={() => setSelectedCardId(card.id)}
                                    />
                                </div>
                            );
                        })}
                    </div>

                    {/* Right Col: Invoice Details */}
                    <div className="lg:col-span-2 space-y-6">
                        {selectedCard && (
                            <div className="bg-card rounded-3xl shadow-sm border p-6 h-full flex flex-col">
                                {/* Invoice Header */}
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <button onClick={handlePrevMonth} className="p-2 hover:bg-muted rounded-full">{'<'}</button>
                                        <div className="text-center">
                                            <h3 className="font-semibold text-lg capitalize">{format(viewDate, 'MMMM yyyy', { locale: ptBR })}</h3>
                                            <p className="text-xs text-muted-foreground">Fatura termina em {selectedCard.closingDay}</p>
                                        </div>
                                        <button onClick={handleNextMonth} className="p-2 hover:bg-muted rounded-full">{'>'}</button>
                                    </div>

                                    <div className="text-right">
                                        <p className="text-sm text-muted-foreground">Valor da Fatura</p>
                                        <p className="text-3xl font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentInvoiceTotal)}</p>
                                    </div>
                                </div>

                                {/* Invoice Items */}
                                <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-2">
                                    {currentInvoiceTransactions.length === 0 ? (
                                        <div className="text-center py-10 text-muted-foreground flex flex-col items-center gap-2">
                                            <Receipt className="w-8 h-8 opacity-50" />
                                            Nenhum lançamento para esta fatura.
                                        </div>
                                    ) : (
                                        currentInvoiceTransactions.map(t => (
                                            <div key={t.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                                                        {/* Icon placeholder - could map category icons */}
                                                        <Receipt className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{t.description}</p>
                                                        <p className="text-xs text-muted-foreground">{format(parseISO(t.date), 'dd/MM')}</p>
                                                    </div>
                                                </div>
                                                <span className="font-semibold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.amount)}</span>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="pt-4 border-t mt-auto flex justify-between items-center">
                                    <div className="text-sm text-muted-foreground">
                                        Vencimento: <strong>Dia {selectedCard.dueDay}</strong>
                                    </div>
                                    <Button
                                        size="lg"
                                        disabled={currentInvoiceTotal <= 0}
                                        className="rounded-xl px-8"
                                    >
                                        Pagar Fatura
                                    </Button>
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
        </div>
    );
}
