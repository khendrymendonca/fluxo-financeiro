import { useState, useMemo } from 'react';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { useUpdateTransaction, useDeleteTransaction, useAddTransaction, useToggleTransactionPaid } from '@/hooks/useTransactionMutations';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Receipt, Plus, Trash2, CheckCircle2, Clock, Calendar,
    AlertCircle, ArrowUpCircle, ArrowDownCircle, Filter,
    ShieldAlert, CreditCard as CardIcon, RotateCcw
} from 'lucide-react';
import { Portal } from '@/components/ui/Portal';
import { cn } from '@/lib/utils';
import { format, isSameMonth, isSameYear, isBefore, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getCardSettingsForDate, calcInvoiceMonthYear } from '@/utils/creditCardUtils';
import { MonthSelector } from '@/components/dashboard/MonthSelector';
import { BulkDeleteDialog } from '../transactions/BulkDeleteDialog';

import { parseLocalDate, todayLocalString } from '@/utils/dateUtils';
import { formatCurrency } from '@/utils/formatters';
import { Transaction } from '@/types/finance';
import { PageHeader } from '@/components/ui/PageHeader';

export function BillsManager() {
    const {
        categories,
        accounts,
        creditCards,
        debts,
        viewDate,
        currentMonthTransactions,
        transactions
    } = useFinanceStore();

    const { mutateAsync: updateTransactionMutation } = useUpdateTransaction();
    const { mutateAsync: deleteTransactionMutation } = useDeleteTransaction();
    const { mutateAsync: addTransactionMutation } = useAddTransaction();
    const { mutateAsync: togglePaidMutation } = useToggleTransactionPaid();

    const viewDateStr = format(viewDate, 'yyyy-MM');

    const [filter, setFilter] = useState<'all' | 'expense' | 'income'>('all');
    const [isPaying, setIsPaying] = useState<Transaction | null>(null);
    const [paymentDate, setPaymentDate] = useState<string>(todayLocalString());
    const [paymentAmount, setPaymentAmount] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<'account' | 'credit_card'>('account');
    const [expandedTransactionId, setExpandedTransactionId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [itemToDelete, setItemToDelete] = useState<Transaction | null>(null);

    const handleMarkAsPaid = async (targetId: string, isCard: boolean) => {
        if (!isPaying) return;
        const amountValue = paymentAmount ? parseFloat(paymentAmount) : isPaying.amount;
        const pDate = parseLocalDate(paymentDate);

        let finalInvoiceMonthYear: string | undefined = undefined;
        if (isCard) {
            const card = creditCards.find(c => c.id === targetId);
            if (card) {
                finalInvoiceMonthYear = calcInvoiceMonthYear(pDate, { closingDay: card.closingDay, dueDay: card.dueDay });
            }
        }

        try {
            if (isPaying.isVirtual) {
                const isCardInvoice = isPaying.categoryId === 'card-payment';

                // 1. Criar transação física de pagamento
                await addTransactionMutation({
                    description: isPaying.description,
                    amount: amountValue,
                    type: isPaying.type,
                    transactionType: 'punctual',
                    date: isPaying.date,
                    isPaid: true,
                    paymentDate: paymentDate,
                    accountId: isCard ? null : targetId,
                    cardId: isCard ? targetId : null,
                    isInvoicePayment: isCardInvoice,
                    invoiceMonthYear: isCard ? finalInvoiceMonthYear : (isCardInvoice ? isPaying.invoiceMonthYear : null),
                    categoryId: isCardInvoice ? 'card-payment' : isPaying.categoryId,
                    subcategoryId: isCardInvoice ? undefined : isPaying.subcategoryId,
                    originalId: isPaying.originalId
                });

                if (isCardInvoice) {
                    // 2. Marcar transações individuais da fatura como pagas
                    const txsToMarkAsPaid = transactions.filter(t =>
                        t.cardId === isPaying.cardId &&
                        !t.isPaid &&
                        t.categoryId !== 'card-payment' &&
                        t.invoiceMonthYear === isPaying.invoiceMonthYear
                    );

                    for (const tx of txsToMarkAsPaid) {
                        await togglePaidMutation({ id: tx.id, isPaid: true });
                    }
                }
            } else {
                await updateTransactionMutation({
                    id: isPaying.id,
                    updates: {
                        isPaid: true,
                        paymentDate: paymentDate,
                        accountId: isCard ? null : targetId,
                        cardId: isCard ? targetId : null,
                        invoiceMonthYear: isCard ? finalInvoiceMonthYear : null,
                        amount: amountValue
                    }
                });
            }
            setIsPaying(null);
            toast({ title: "Pagamento registrado com sucesso!" });
        } catch (error) {
            toast({ title: "Erro ao registrar pagamento.", variant: "destructive" });
        }
    };

    // 1. Calcular faturas virtuais dinâmicas
    const virtualInvoices: Transaction[] = useMemo(() => {
        return creditCards.map(card => {
            const viewDateStr = format(viewDate, 'yyyy-MM');

            // Verifica se já existe um pagamento físico (baixado ou não) para esta fatura
            const physicalPaymentExists = transactions.some(t =>
                t.cardId === card.id &&
                t.categoryId === 'card-payment' &&
                t.invoiceMonthYear === viewDateStr
            );

            if (physicalPaymentExists) return null;

            // Somar gastos reais deste cartão nesta competência
            const totalAmount = transactions
                .filter(t =>
                    t.cardId === card.id &&
                    !t.isVirtual &&
                    t.categoryId !== 'card-payment' &&
                    t.invoiceMonthYear === viewDateStr
                )
                .reduce((sum, t) => sum + (t.type === 'expense' ? t.amount : -t.amount), 0);

            if (totalAmount <= 0) return null;

            const { dueDay } = getCardSettingsForDate(card, viewDate);
            const cardDueDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), dueDay);

            return {
                id: `fat-virtual-${card.id}`,
                description: `Fatura ${card.name}`,
                amount: totalAmount,
                date: cardDueDate.toISOString(),
                type: 'expense',
                transactionType: 'recurring', // Marcar como recorrente para fluxos de caixa
                categoryId: 'card-payment',
                cardId: card.id,
                isPaid: false,
                isVirtual: true,
                userId: '',
                invoiceMonthYear: viewDateStr
            } as Transaction;
        }).filter(Boolean) as Transaction[];
    }, [creditCards, transactions, viewDate]);

    // 2. Filtrar transações recorrentes e injetar as virtuais
    const recurringTransactions = [...currentMonthTransactions, ...virtualInvoices].filter(t => {
        // Bloqueio de Isolamento: O Gerenciador de Contas não deve vazar lançamentos "pontuais".
        const isRecurringType = t.isRecurring || t.transactionType === 'recurring' || t.transactionType === 'installment' || t.categoryId === 'card-payment';
        if (!t.isVirtual && !isRecurringType) {
            return false;
        }

        // Esconder compras individuais feitas no cartão de crédito (estas são liquidadas via fatura)
        if (t.cardId && t.categoryId !== 'card-payment') return false;

        const txDate = parseLocalDate(t.date.slice(0, 10));
        
        // Fix: Usar uma margem de segurança para comparação de meses (evita bugs de fuso horário no limite do mês)
        const isCurrentMonth = (txDate.getMonth() === viewDate.getMonth() && txDate.getFullYear() === viewDate.getFullYear());

        // Inclui: itens de meses anteriores ainda não pagos (atrasados)
        const isOverdue = isBefore(txDate, startOfMonth(viewDate)) && !t.isPaid;

        if (!isCurrentMonth && !isOverdue) return false;

        // Busca por Texto
        if (searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase();
            const matchesDescription = t.description.toLowerCase().includes(query);
            const matchesCategory = categories.find(c => c.id === t.categoryId)?.name.toLowerCase().includes(query);
            if (!matchesDescription && !matchesCategory) return false;
        }

        if (filter === 'all') return true;
        return t.type === filter;
    }).sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());

    const totalPendingPayable = recurringTransactions
        .filter(t => t.type === 'expense' && !t.isPaid)
        .reduce((acc, t) => acc + t.amount, 0);

    return (
        <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">

            {/* Header & Stats */}
            <PageHeader title="Gestão de Contas" icon={Receipt}>
                <div className="flex flex-wrap items-center gap-3">
                    <MonthSelector />
                    <div className="px-4 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-sm dark:shadow-none">
                        <p className="text-[10px] uppercase font-bold text-gray-500 dark:text-zinc-500">A Pagar Pendente</p>
                        <p className="text-lg font-bold text-danger">{formatCurrency(totalPendingPayable)}</p>
                    </div>
                </div>
            </PageHeader>

            {/* Busca e Filtros */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <input
                        type="text"
                        placeholder="Pesquisar contas ou categorias..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-11 pl-4 pr-10 rounded-2xl border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-50 focus:border-primary focus:ring-0 transition-all outline-none font-medium text-sm"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full text-muted-foreground"
                        >
                            <Plus className="w-4 h-4 rotate-45" />
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2 p-1 bg-muted rounded-2xl w-full overflow-x-auto no-scrollbar md:w-fit">
                    {([
                        { id: 'all', label: 'Todas', icon: Filter },
                        { id: 'expense', label: 'A Pagar', icon: ArrowDownCircle },
                        { id: 'income', label: 'A Receber', icon: ArrowUpCircle },
                    ] as const).map(btn => (
                        <button key={btn.id} onClick={() => setFilter(btn.id)}
                            className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                                filter === btn.id ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                            <btn.icon className="w-4 h-4" />
                            {btn.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Lista de Contas */}
            <div className="grid gap-3">
                {recurringTransactions.length === 0 ? (
                    <div className="card-elevated p-12 text-center text-muted-foreground">
                        <Receipt className="w-12 h-12 mx-auto mb-4 opacity-10" />
                        <p>Nenhuma conta recorrente encontrada neste período.</p>
                    </div>
                ) : (
                    recurringTransactions.map(transaction => {
                        const isLate = parseLocalDate(transaction.date) < new Date() && !transaction.isPaid;
                        const category = categories.find(c => c.id === transaction.categoryId);

                        return (
                            <div key={transaction.id} className="flex flex-col gap-1">
                                <div className={cn(
                                    "bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-sm dark:shadow-none border border-gray-100 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 transition-all hover:translate-x-1 border-l-4",
                                    transaction.isPaid ? "border-l-success opacity-80" :
                                        isLate ? "border-l-danger bg-danger/5 dark:bg-danger/5" : "border-l-info"
                                )}>
                                    <div className="flex items-center gap-4 min-w-0 flex-1">
                                        <div className={cn("p-3 rounded-2xl shrink-0",
                                            transaction.isInvoicePayment ? "bg-primary/10 text-primary" :
                                                (transaction.type === 'expense' ? "bg-danger/10 text-danger" : "bg-success/10 text-success"))}>
                                            {transaction.isInvoicePayment ? <CardIcon className="w-5 h-5" /> :
                                                (transaction.type === 'expense' ? <ArrowDownCircle className="w-5 h-5" /> : <ArrowUpCircle className="w-5 h-5" />)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold truncate">{transaction.description}</h4>
                                                {transaction.categoryId === 'card-payment' && (
                                                    <button
                                                        onClick={e => { e.stopPropagation(); setExpandedTransactionId(expandedTransactionId === transaction.id ? null : transaction.id); }}
                                                        className="shrink-0 px-2 py-0.5 bg-primary/10 hover:bg-primary/20 rounded-md text-[10px] font-black uppercase text-primary transition-all flex items-center gap-1">
                                                        {expandedTransactionId === transaction.id ? 'Ocultar' : 'Detalhes'}
                                                        <Plus className={cn("w-3 h-3 transition-transform", expandedTransactionId === transaction.id && "rotate-45")} />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground mt-1">
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <Calendar className="w-3 h-3" />
                                                    {transaction.isPaid && (transaction.paymentDate || transaction.date) ? (
                                                        <span className="text-success font-bold">
                                                            {format(parseLocalDate(transaction.paymentDate || transaction.date), "dd 'de' MMM", { locale: ptBR })}
                                                        </span>
                                                    ) : (
                                                        <>{format(parseLocalDate(transaction.date), "dd 'de' MMM", { locale: ptBR })}</>
                                                    )}
                                                </div>
                                                {category && (
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                                                        <span className="truncate max-w-[80px]">{category.name}</span>
                                                    </div>
                                                )}
                                                {transaction.accountId && !category && (
                                                    <div className="flex items-center gap-1 shrink-0 font-bold">
                                                        <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                                                        <ShieldAlert className="w-3 h-3" />
                                                        <span className="truncate max-w-[100px]">{(() => {
                                                            const acc = accounts.find(a => a.id === transaction.accountId);
                                                            if (!acc) return categories.find(c => c.id === transaction.categoryId)?.name ?? '—';
                                                            return acc.name ? `${(acc as any).institution ?? (acc as any).bank ?? ''} - ${acc.name}`.trim().replace(/^- /, '') : ((acc as any).institution ?? (acc as any).bank ?? acc.name);
                                                        })()}</span>
                                                    </div>
                                                )}
                                                {transaction.cardId && (
                                                    <div className="flex items-center gap-1 shrink-0 font-bold">
                                                        <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                                                        <CardIcon className="w-3 h-3" />
                                                        <span className="truncate max-w-[80px]">{creditCards.find(c => c.id === transaction.cardId)?.name}</span>
                                                    </div>
                                                )}
                                                <span className={cn(
                                                    "px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase shrink-0",
                                                    (transaction.debtId || transaction.transactionType === 'installment')
                                                        ? "bg-info/10 text-info"
                                                        : "bg-primary/10 text-primary"
                                                )}>
                                                    {(transaction.debtId || transaction.transactionType === 'installment') ? 'Parc.' : 'Rec.'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between md:justify-end w-full md:w-auto mt-2 md:mt-0 gap-3 md:gap-4">
                                        <div className="text-left md:text-right shrink-0">
                                            <p className={cn("text-base md:text-lg font-black", transaction.type === 'expense' ? "text-danger" : "text-success")}>
                                                {formatCurrency(transaction.amount)}
                                            </p>
                                            <div className="flex items-center gap-1 justify-start md:justify-end">
                                                {transaction.isPaid ? (
                                                    <span className="flex items-center gap-1 text-[10px] font-bold text-success uppercase">
                                                        <CheckCircle2 className="w-3 h-3" /> Pago
                                                    </span>
                                                ) : isLate ? (
                                                    <span className="flex items-center gap-1 text-[10px] font-bold text-danger uppercase animate-pulse">
                                                        <AlertCircle className="w-3 h-3" /> Atrasado
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-[10px] font-bold text-info uppercase">
                                                        <Clock className="w-3 h-3" /> Pendente
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {!transaction.isPaid ? (
                                                <Button size="sm" variant="ghost"
                                                    onClick={() => {
                                                        setIsPaying(transaction);
                                                        setPaymentDate(transaction.date?.split('T')[0] || todayLocalString());
                                                        setPaymentAmount(transaction.amount.toFixed(2));
                                                        setPaymentMethod('account');
                                                    }}
                                                    className="h-10 px-3 md:px-4 rounded-xl bg-success/5 text-success hover:bg-success/10 flex items-center gap-2 font-black uppercase text-[10px] tracking-wider">
                                                    <CheckCircle2 className="w-4 h-4" /> <span className="hidden xs:inline">Baixar</span>
                                                </Button>
                                            ) : (
                                                <Button size="sm" variant="ghost"
                                                    onClick={() => {
                                                        // 🚨 ESTORNO INTELIGENTE: Se veio de uma recorrente e NÃO é parcelamento (fixa),
                                                        // deletamos para voltar a ser apenas uma "Projeção Virtual".
                                                        if (transaction.originalId && !transaction.installmentGroupId) {
                                                            deleteTransactionMutation({ transaction, applyScope: 'this' });
                                                            toast({ title: "Lançamento estornado para o estado projetado." });
                                                        } else {
                                                            togglePaidMutation({ id: transaction.id, isPaid: false });
                                                        }
                                                    }}
                                                    className="h-10 px-3 md:px-4 rounded-xl bg-amber-500/5 text-amber-600 hover:bg-amber-500/10 flex items-center gap-2 font-black uppercase text-[10px] tracking-wider">
                                                    <RotateCcw className="w-4 h-4" /> <span className="hidden xs:inline">Estornar</span>
                                                </Button>
                                            )}
                                            {!(transaction.debtId || transaction.transactionType === 'installment') && (
                                                <Button size="sm" variant="ghost"
                                                    onClick={() => setItemToDelete(transaction)}
                                                    className="h-10 w-10 p-0 rounded-xl hover:bg-danger/10 text-danger shrink-0"
                                                    title="Excluir lançamento">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Detalhes da Fatura (Expansão) */}
                                {expandedTransactionId === transaction.id && transaction.categoryId === 'card-payment' && (
                                    <div className="card-elevated bg-muted/20 border-t-0 rounded-t-none p-4 -mt-1 ml-4 mr-2 animate-in slide-in-from-top-2 duration-200">
                                        <h5 className="text-[10px] font-black uppercase text-muted-foreground mb-3 flex items-center gap-2">
                                            <Plus className="w-3 h-3" /> Itens desta Fatura (Recorrentes)
                                        </h5>
                                        <div className="space-y-2">
                                            {transactions
                                                .filter(t =>
                                                    t.cardId === transaction.cardId &&
                                                    !t.isPaid &&
                                                    t.categoryId !== 'card-payment' &&
                                                    (t.isRecurring || t.transactionType === 'recurring') &&
                                                    t.invoiceMonthYear === viewDateStr
                                                )
                                                .map(b => (
                                                    <div key={b.id} className="flex items-center justify-between p-2 rounded-lg bg-background/50 border border-border/50">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                            <div>
                                                                <p className="text-xs font-bold">{b.description}</p>
                                                                <p className="text-[10px] text-muted-foreground">
                                                                    {format(parseLocalDate(b.date), "dd/MM")}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <p className="text-xs font-black text-danger">{formatCurrency(b.amount)}</p>
                                                    </div>
                                                ))
                                            }

                                            {transactions.filter(t =>
                                                t.cardId === transaction.cardId &&
                                                !t.isPaid &&
                                                t.categoryId !== 'card-payment' &&
                                                (t.isRecurring || t.transactionType === 'recurring') &&
                                                t.invoiceMonthYear === viewDateStr
                                            ).length === 0 && (
                                                    <p className="text-[10px] text-muted-foreground text-center py-2 italic">Nenhuma compra listada para esta fatura.</p>
                                                )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Modal de Pagamento */}
            {isPaying && (
                <Portal>
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setIsPaying(null)}>
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-zinc-800 max-h-[80vh] overflow-y-auto"
                            onClick={e => e.stopPropagation()}>
                            <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-800 sticky top-0 bg-white dark:bg-zinc-900 rounded-t-2xl z-10">
                                <h2 className="text-lg font-black tracking-tight">
                                    {isPaying.type === 'income' ? 'Receber com qual conta?' : 'Pagar com qual conta?'}
                                </h2>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    <span className={cn("font-bold", isPaying.type === 'income' ? "text-success" : "text-danger")}>
                                        {formatCurrency(isPaying.amount)}
                                    </span>{' — '}{isPaying.description}
                                </p>
                            </div>

                            <div className="p-4 space-y-4">
                                <div className="space-y-2">
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

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Valor do Pagamento</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">R$</span>
                                        <Input type="number" value={paymentAmount}
                                            onChange={e => setPaymentAmount(e.target.value)}
                                            className="pl-10 h-11 rounded-xl font-bold bg-muted/20" placeholder="0.00" />
                                    </div>
                                </div>
                            </div>

                            <div className="p-3 pt-0 space-y-2">
                                {paymentMethod === 'account' && (
                                    accounts.length === 0 ? (
                                        <p className="text-center text-muted-foreground py-8 text-sm">Nenhuma conta cadastrada.</p>
                                    ) : (
                                        accounts.map(acc => {
                                            const availableTotal = acc.balance + (acc.hasOverdraft ? (acc.overdraftLimit || 0) : 0);
                                            const wouldGoNegative = isPaying.type === 'expense' && acc.balance < isPaying.amount;
                                            const hasEnoughWithOverdraft = acc.hasOverdraft && availableTotal >= isPaying.amount;
                                            const insufficientFunds = wouldGoNegative && !hasEnoughWithOverdraft;
                                            return (
                                                <button key={acc.id} onClick={() => handleMarkAsPaid(acc.id, false)}
                                                    disabled={insufficientFunds}
                                                    className={cn("w-full p-4 rounded-xl border-2 text-left transition-all",
                                                        insufficientFunds ? "border-border/30 opacity-40 cursor-not-allowed" :
                                                            "border-border hover:border-primary/50 hover:bg-primary/5 hover:shadow-md active:scale-[0.98] cursor-pointer")}>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: acc.color }} />
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
                                            <button key={card.id} onClick={() => handleMarkAsPaid(card.id, true)}
                                                className="w-full p-4 rounded-xl border-2 border-border hover:border-primary/50 hover:bg-primary/5 hover:shadow-md active:scale-[0.98] transition-all text-left cursor-pointer">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: card.color }} />
                                                    <div>
                                                        <p className="font-bold text-sm">{card.name}</p>
                                                        <p className="text-[10px] text-muted-foreground font-bold uppercase">{card.bank}</p>
                                                    </div>
                                                </div>
                                            </button>
                                        ))
                                    )
                                )}
                            </div>

                            <div className="px-5 py-3 border-t border-border">
                                <Button variant="ghost" onClick={() => setIsPaying(null)} className="w-full rounded-xl text-sm font-bold">
                                    Cancelar
                                </Button>
                            </div>
                        </div>
                    </div>
                </Portal>
            )}

            {/* Modal de Exclusão Individual */}
            <BulkDeleteDialog
                isOpen={!!itemToDelete}
                onClose={() => setItemToDelete(null)}
                selectedCount={1}
                hasInstallments={!!itemToDelete?.installmentGroupId}
                hasRecurring={itemToDelete?.isRecurring === true || itemToDelete?.transactionType === 'recurring'}
                onConfirm={async (options) => {
                    if (itemToDelete) {
                        await deleteTransactionMutation({ transaction: itemToDelete, applyScope: options.installmentScope || 'this' });
                    }
                    setItemToDelete(null);
                }}
            />
        </div>
    );
}



