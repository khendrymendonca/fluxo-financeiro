import { useState } from 'react';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Receipt, Plus, Trash2, CheckCircle2, Clock, Calendar,
    AlertCircle, ArrowUpCircle, ArrowDownCircle, Filter,
    ShieldAlert, CreditCard as CardIcon
} from 'lucide-react';
import { Portal } from '@/components/ui/Portal';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MonthSelector } from '@/components/dashboard/MonthSelector';

// ✅ FIX: helper de data local reutilizável
const parseLocalDate = (dateString: string): Date => {
    if (!dateString) return new Date();
    const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return new Date();
    return new Date(year, month - 1, day);
};

// ✅ FIX: "hoje" como string local sem bug de fuso
const todayLocalString = (): string => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
};

export function BillsManager() {
    const {
        bills,
        categories,
        accounts,
        creditCards,
        debts,
        // ✅ FIX: addBill e updateBill removidos da desestruturação — não são usados no componente
        deleteBill,
        payBill,
        getCardExpenses,
        viewDate,
        currentMonthBills,
        transactions,
        getTransactionTargetDate
    } = useFinanceStore();

    const [filter, setFilter] = useState<'all' | 'payable' | 'receivable'>('all');
    const [isPaying, setIsPaying] = useState<any>(null);
    // ✅ FIX: usa todayLocalString() para evitar bug de fuso
    const [paymentDate, setPaymentDate] = useState<string>(todayLocalString());
    const [paymentAmount, setPaymentAmount] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<'account' | 'credit_card'>('account');
    const [expandedBillId, setExpandedBillId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [deletingBill, setDeletingBill] = useState<any>(null);
    const [deleteFutureBills, setDeleteFutureBills] = useState(false);

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    const handleMarkAsPaid = async (targetId: string, isCard: boolean) => {
        if (!isPaying) return;
        const amountValue = paymentAmount ? parseFloat(paymentAmount) : isPaying.amount;
        const isPartial = Math.abs(amountValue - isPaying.amount) > 0.01;
        await payBill(isPaying, isCard ? undefined : targetId, paymentDate, isPartial, amountValue, isCard ? targetId : undefined);
        setIsPaying(null);
    };

    const handleConfirmDeleteBill = () => {
        if (deletingBill) {
            const targetId = deletingBill.originalBillId || deletingBill.id;
            deleteBill(targetId, deleteFutureBills);
        }
        setDeletingBill(null);
        setDeleteFutureBills(false);
    };

    // ✅ FIX: sort usa parseLocalDate — sem bug de fuso
    const filteredBills = currentMonthBills.filter(b => {
        // Busca por Texto
        if (searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase();
            const matchesName = b.name.toLowerCase().includes(query);
            const matchesCategory = categories.find(c => c.id === b.categoryId)?.name.toLowerCase().includes(query);
            if (!matchesName && !matchesCategory) return false;
        }

        if (b.cardId && !b.isVirtual && b.categoryId !== 'card-payment') return false;
        if (b.categoryId === 'card-payment' && b.amount <= 0) return false;
        if (filter === 'all') return true;
        return b.type === filter;
    }).sort((a, b) => parseLocalDate(a.dueDate).getTime() - parseLocalDate(b.dueDate).getTime());

    // ✅ FIX: totalPendingPayable exclui card-payment com valor zero — consistente com filteredBills
    const totalPendingPayable = currentMonthBills
        .filter(b => b.type === 'payable' && b.status === 'pending' && !(b.categoryId === 'card-payment' && b.amount <= 0))
        .reduce((acc, b) => acc + b.amount, 0);

    return (
        <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">

            {/* Header & Stats */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                        <Receipt className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">Gestão de Contas</h2>
                        <p className="text-muted-foreground">A pagar e a receber de forma organizada.</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <MonthSelector />
                    <div className="px-4 py-2 rounded-xl bg-danger/5 border border-danger/10">
                        <p className="text-[10px] uppercase font-bold text-danger/70">A Pagar Pendente</p>
                        <p className="text-lg font-bold text-danger">{formatCurrency(totalPendingPayable)}</p>
                    </div>
                </div>
            </div>

            {/* Busca e Filtros */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <input
                        type="text"
                        placeholder="Pesquisar contas ou categorias..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-11 pl-4 pr-10 rounded-2xl border-2 border-border bg-card focus:border-primary focus:ring-0 transition-all outline-none font-medium text-sm"
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
                        { id: 'payable', label: 'A Pagar', icon: ArrowDownCircle },
                        { id: 'receivable', label: 'A Receber', icon: ArrowUpCircle },
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
                {filteredBills.length === 0 ? (
                    <div className="card-elevated p-12 text-center text-muted-foreground">
                        <Receipt className="w-12 h-12 mx-auto mb-4 opacity-10" />
                        <p>Nenhuma conta encontrada com este filtro.</p>
                    </div>
                ) : (
                    filteredBills.map(bill => {
                        // ✅ FIX: isLate usa parseLocalDate — sem bug de fuso
                        const isLate = parseLocalDate(bill.dueDate) < new Date() && bill.status === 'pending';
                        const category = categories.find(c => c.id === bill.categoryId);

                        return (
                            <div key={bill.id} className="flex flex-col gap-1">
                                <div className={cn(
                                    "card-elevated p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:translate-x-1 border-l-4",
                                    bill.status === 'paid' ? "border-success opacity-80" :
                                        isLate ? "border-danger bg-danger/5" : "border-info"
                                )}>
                                    <div className="flex items-center gap-4">
                                        <div className={cn("p-3 rounded-2xl",
                                            bill.categoryId === 'card-payment' ? "bg-primary/10 text-primary" :
                                                (bill.type === 'payable' ? "bg-danger/10 text-danger" : "bg-success/10 text-success"))}>
                                            {bill.categoryId === 'card-payment' ? <CardIcon className="w-5 h-5" /> :
                                                (bill.type === 'payable' ? <ArrowDownCircle className="w-5 h-5" /> : <ArrowUpCircle className="w-5 h-5" />)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold">{bill.name}</h4>
                                                {bill.categoryId === 'card-payment' && (
                                                    <button
                                                        onClick={e => { e.stopPropagation(); setExpandedBillId(expandedBillId === bill.id ? null : bill.id); }}
                                                        className="px-2 py-0.5 bg-primary/10 hover:bg-primary/20 rounded-md text-[10px] font-black uppercase text-primary transition-all flex items-center gap-1">
                                                        {expandedBillId === bill.id ? 'Ocultar Detalhes' : 'Ver Detalhes'}
                                                        <Plus className={cn("w-3 h-3 transition-transform", expandedBillId === bill.id && "rotate-45")} />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                                <Calendar className="w-3 h-3" />
                                                {bill.status === 'paid' && (bill.paymentDate || bill.dueDate) ? (
                                                    <span className="text-success font-bold">
                                                        Pago em {format(parseLocalDate(bill.paymentDate || bill.dueDate), "dd 'de' MMMM", { locale: ptBR })}
                                                    </span>
                                                ) : (
                                                    <>{format(parseLocalDate(bill.dueDate), "dd 'de' MMMM", { locale: ptBR })}</>
                                                )}
                                                {category && (
                                                    <><span className="w-1 h-1 rounded-full bg-muted-foreground/30" /><span>{category.name}</span></>
                                                )}
                                                {bill.accountId && (
                                                    <><span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                                                        <span className="flex items-center gap-1 font-bold">
                                                            <ShieldAlert className="w-3 h-3" />
                                                            {accounts.find(a => a.id === bill.accountId)?.name}
                                                        </span></>
                                                )}
                                                {bill.cardId && (
                                                    <><span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                                                        <span className="flex items-center gap-1 font-bold">
                                                            <CardIcon className="w-3 h-3" />
                                                            {creditCards.find(c => c.id === bill.cardId)?.name}
                                                        </span></>
                                                )}
                                                {bill.debtId && (
                                                    <><span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                                                        <span className="flex items-center gap-1 font-bold">
                                                            <ShieldAlert className="w-3 h-3 text-warning" />
                                                            {debts.find(d => d.id === bill.debtId)?.name}
                                                        </span></>
                                                )}
                                                {bill.isFixed && <span className="ml-1 px-1.5 py-0.5 bg-primary/10 text-primary rounded-md text-[10px] font-bold">RECORRENTE</span>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between md:justify-end gap-6">
                                        <div className="text-right">
                                            <p className={cn("text-lg font-black", bill.type === 'payable' ? "text-danger" : "text-success")}>
                                                {formatCurrency(bill.amount)}
                                            </p>
                                            <div className="flex items-center gap-1 justify-end">
                                                {bill.status === 'paid' ? (
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
                                        {bill.status === 'pending' && (
                                            <Button size="sm" variant="ghost"
                                                onClick={() => {
                                                    setIsPaying(bill);
                                                    setPaymentDate(bill.dueDate?.split('T')[0] || todayLocalString());
                                                    setPaymentAmount(bill.amount.toFixed(2));
                                                    setPaymentMethod(bill.cardId ? 'credit_card' : 'account');
                                                }}
                                                className="h-11 px-4 rounded-2xl bg-success/5 text-success hover:bg-success/10 flex items-center gap-2 font-black uppercase text-[10px] tracking-wider">
                                                <CheckCircle2 className="w-5 h-5" /> Baixar Conta
                                            </Button>
                                        )}
                                        {bill.status === 'pending' && deleteBill !== undefined && (
                                            <Button size="sm" variant="ghost"
                                                onClick={() => setDeletingBill(bill)}
                                                className="h-11 px-3 rounded-2xl hover:bg-danger/10 text-danger">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Detalhamento da fatura de cartão */}
                                {expandedBillId === bill.id && bill.categoryId === 'card-payment' && (
                                    <div className="mt-2 ml-14 p-4 rounded-2xl bg-muted/20 border border-border/50 animate-in slide-in-from-top-2 duration-300">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-1 h-3 bg-primary rounded-full" />
                                            <h5 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Compras no Período</h5>
                                        </div>
                                        <div className="space-y-2">
                                            {transactions
                                                .filter(t => {
                                                    const targetDate = getTransactionTargetDate(t);
                                                    return t.cardId === bill.cardId &&
                                                        !t.isInvoicePayment &&
                                                        targetDate.getMonth() === viewDate.getMonth() &&
                                                        targetDate.getFullYear() === viewDate.getFullYear();
                                                })
                                                .sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime())
                                                .map(t => (
                                                    <div key={t.id} className="flex items-center justify-between p-2 rounded-xl bg-background/50 border border-border/30 hover:border-primary/30 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <div className={cn("p-1.5 rounded-lg",
                                                                t.type === 'income' ? "bg-success/5 text-success" : "bg-danger/5 text-danger")}>
                                                                {t.type === 'income' ? <ArrowUpCircle className="w-3 h-3" /> : <ArrowDownCircle className="w-3 h-3" />}
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-bold leading-none">{t.description}</p>
                                                                <p className="text-[9px] text-muted-foreground mt-0.5">
                                                                    {format(parseLocalDate(t.date), "dd/MM")} • {categories.find(c => c.id === t.categoryId)?.name || 'Outros'}
                                                                    {t.installmentNumber && ` • Parcela ${t.installmentNumber}${t.installmentTotal ? `/${t.installmentTotal}` : ''}`}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <span className={cn("text-xs font-black",
                                                            t.type === 'income' ? "text-success" : "text-danger")}>
                                                            {t.type === 'income' ? '-' : ''}{formatCurrency(t.amount)}
                                                        </span>
                                                    </div>
                                                ))}

                                            {/* ✅ FIX: filtro de bills no detalhamento usa parseLocalDate */}
                                            {bills
                                                .filter(b =>
                                                    b.cardId === bill.cardId &&
                                                    b.status === 'pending' &&
                                                    b.categoryId !== 'card-payment' &&
                                                    parseLocalDate(b.dueDate).getMonth() === viewDate.getMonth() &&
                                                    parseLocalDate(b.dueDate).getFullYear() === viewDate.getFullYear()
                                                )
                                                .map(b => (
                                                    <div key={b.id} className="flex items-center justify-between p-2 rounded-xl bg-background/50 border border-border/30 hover:border-primary/30 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-1.5 rounded-lg bg-warning/5 text-warning">
                                                                <Receipt className="w-3 h-3" />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-bold leading-none">{b.name} (Conta)</p>
                                                                <p className="text-[9px] text-muted-foreground mt-0.5">
                                                                    Vence em {format(parseLocalDate(b.dueDate), "dd/MM")}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <span className="text-xs font-black text-danger">{formatCurrency(b.amount)}</span>
                                                    </div>
                                                ))}

                                            {transactions.filter(t => {
                                                const targetDate = getTransactionTargetDate(t);
                                                return t.cardId === bill.cardId && !t.isInvoicePayment &&
                                                    targetDate.getMonth() === viewDate.getMonth() &&
                                                    targetDate.getFullYear() === viewDate.getFullYear();
                                            }).length === 0 &&
                                                bills.filter(b =>
                                                    b.cardId === bill.cardId && b.status === 'pending' &&
                                                    b.categoryId !== 'card-payment' &&
                                                    parseLocalDate(b.dueDate).getMonth() === viewDate.getMonth() &&
                                                    parseLocalDate(b.dueDate).getFullYear() === viewDate.getFullYear()
                                                ).length === 0 && (
                                                    <p className="text-[10px] text-muted-foreground text-center py-2 italic">
                                                        Nenhuma compra listada para esta fatura.
                                                    </p>
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
                        <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-200 border border-border max-h-[80vh] overflow-y-auto"
                            onClick={e => e.stopPropagation()}>
                            <div className="px-5 py-4 border-b border-border sticky top-0 bg-card rounded-t-2xl z-10">
                                <h2 className="text-lg font-black tracking-tight">
                                    {isPaying.type === 'receivable' ? 'Receber com qual conta?' : 'Pagar com qual conta?'}
                                </h2>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    <span className={cn("font-bold", isPaying.type === 'receivable' ? "text-success" : "text-danger")}>
                                        {formatCurrency(isPaying.amount)}
                                    </span>{' — '}{isPaying.name}
                                </p>
                            </div>

                            <div className="p-4 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Data do Pagamento</label>
                                    <label className="relative flex items-center bg-muted/30 border border-input rounded-xl p-3 focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all cursor-pointer">
                                        <Calendar className="absolute left-3 w-4 h-4 text-primary" />
                                        <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)}
                                            className="w-full pl-8 pr-2 bg-transparent text-sm font-bold focus:outline-none appearance-none cursor-pointer text-foreground" />
                                    </label>
                                </div>

                                {/* ✅ FIX: usa categoryId === 'card-payment' em vez de id.startsWith('card-') */}
                                {isPaying.categoryId !== 'card-payment' && !isPaying.cardId && (
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
                                )}

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Valor do Pagamento</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">R$</span>
                                        <Input type="number" value={paymentAmount}
                                            onChange={e => setPaymentAmount(e.target.value)}
                                            className="pl-10 h-11 rounded-xl font-bold bg-muted/20" placeholder="0.00" />
                                    </div>
                                    {/* ✅ FIX: usa categoryId === 'card-payment' */}
                                    {isPaying.categoryId === 'card-payment' && (
                                        <p className="text-[10px] text-primary font-bold leading-tight">
                                            Este pagamento será registrado como um abatimento na fatura deste mês.
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="p-3 pt-0 space-y-2">
                                {paymentMethod === 'account' && (
                                    accounts.length === 0 ? (
                                        <p className="text-center text-muted-foreground py-8 text-sm">Nenhuma conta cadastrada.</p>
                                    ) : (
                                        accounts.map(acc => {
                                            const availableTotal = acc.balance + (acc.hasOverdraft ? (acc.overdraftLimit || 0) : 0);
                                            const wouldGoNegative = isPaying.type === 'payable' && acc.balance < isPaying.amount;
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

            {/* Modal de Exclusão */}
            {deletingBill && (
                <Portal>
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setDeletingBill(null)}>
                        <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-200 border border-border overflow-hidden"
                            onClick={e => e.stopPropagation()}>
                            <div className="p-6 text-center space-y-4">
                                <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto mb-4">
                                    <Trash2 className="w-6 h-6" />
                                </div>
                                <h2 className="text-xl font-black tracking-tight">Excluir Conta?</h2>
                                <p className="text-sm text-muted-foreground">
                                    Tem certeza que deseja remover <strong>{deletingBill.name}</strong>?
                                </p>
                                <div className="pt-4 text-left">
                                    <label className="flex items-start gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors cursor-pointer">
                                        <input type="checkbox" checked={deleteFutureBills}
                                            onChange={e => setDeleteFutureBills(e.target.checked)}
                                            className="mt-1 w-4 h-4 rounded text-primary focus:ring-primary" />
                                        <div>
                                            <span className="text-sm font-bold block">Aplicar a futuras?</span>
                                            <span className="text-xs text-muted-foreground">
                                                Também exclui os lançamentos desta conta nos próximos meses
                                            </span>
                                        </div>
                                    </label>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setDeletingBill(null)}>Cancelar</Button>
                                    <Button variant="destructive" className="flex-1 rounded-xl" onClick={handleConfirmDeleteBill}>Excluir</Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </Portal>
            )}
        </div>
    );
}
