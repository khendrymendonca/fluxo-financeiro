import { useState } from 'react';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Receipt,
    Plus,
    Trash2,
    CheckCircle2,
    Clock,
    Calendar,
    AlertCircle,
    ArrowUpCircle,
    ArrowDownCircle,
    Filter,
    ShieldAlert,
    Pencil,
    CreditCard as CardIcon
} from 'lucide-react';
import { Portal } from '@/components/ui/Portal';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function BillsManager() {
    const {
        bills,
        categories,
        accounts,
        creditCards,
        debts,
        addBill,
        updateBill,
        deleteBill,
        payBill,
        getCardExpenses
    } = useFinanceStore();

    const [showAddForm, setShowAddForm] = useState(false);
    const [filter, setFilter] = useState<'all' | 'payable' | 'receivable'>('all');
    const [isPaying, setIsPaying] = useState<any>(null);
    const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState<'account' | 'credit_card'>('account');
    const [editingBillId, setEditingBillId] = useState<string | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<'payable' | 'receivable'>('payable');
    const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
    const [categoryId, setCategoryId] = useState('');
    const [accountId, setAccountId] = useState('');
    const [isFixed, setIsFixed] = useState(false);
    const [applyToFuture, setApplyToFuture] = useState(false);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !amount || !dueDate) return;

        if (editingBillId) {
            updateBill(editingBillId, {
                name,
                amount: parseFloat(amount),
                type,
                dueDate,
                categoryId: categoryId || undefined,
                accountId: accountId || undefined,
                isFixed
            }, applyToFuture);
            setEditingBillId(null);
            setApplyToFuture(false);
        } else {
            addBill({
                name,
                amount: parseFloat(amount),
                type,
                dueDate,
                categoryId: categoryId || undefined,
                accountId: accountId || undefined,
                status: 'pending',
                isFixed
            });
        }

        // Reset form
        setName('');
        setAmount('');
        setCategoryId('');
        setAccountId('');
        setIsFixed(false);
        setShowAddForm(false);
    };

    const handleMarkAsPaid = async (targetId: string, isCard: boolean) => {
        if (!isPaying) return;
        await payBill(isPaying.id, isCard ? undefined : targetId, paymentDate, isCard ? targetId : undefined);
        setIsPaying(null);
    };

    const handleEdit = (bill: any) => {
        setEditingBillId(bill.id);
        setName(bill.name);
        setAmount(bill.amount.toString());
        setType(bill.type);
        setDueDate(bill.dueDate);
        setCategoryId(bill.categoryId || '');
        setAccountId(bill.accountId || '');
        setIsFixed(bill.isFixed);
        setApplyToFuture(false);
        setShowAddForm(true);
        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancel = () => {
        setShowAddForm(false);
        setEditingBillId(null);
        setName('');
        setAmount('');
        setCategoryId('');
        setAccountId('');
        setIsFixed(false);
        setApplyToFuture(false);
    };

    // 1. Get virtual bills from debts
    const debtBills = debts.map(debt => ({
        id: `debt-${debt.id}`,
        name: `Dívida: ${debt.name}`,
        amount: debt.monthlyPayment,
        type: 'payable' as const,
        dueDate: new Date(new Date().setDate(debt.dueDay)).toISOString().split('T')[0],
        status: 'pending' as const,
        isFixed: true,
        categoryId: 'debt-payment',
        isVirtual: true,
        icon: ShieldAlert
    }));

    // 2. Get virtual bills from credit cards
    const cardBills = creditCards.map(card => {
        const amount = getCardExpenses(card.id);
        return {
            id: `card-${card.id}`,
            name: `Fatura: ${card.name}`,
            amount: amount,
            type: 'payable' as const,
            dueDate: new Date(new Date().setDate(card.dueDay)).toISOString().split('T')[0],
            status: 'pending' as const,
            isFixed: true,
            categoryId: 'card-payment',
            isVirtual: true,
            icon: CardIcon
        };
    }).filter(c => c.amount > 0);

    const allBills = [...bills, ...debtBills, ...cardBills];

    const filteredBills = allBills.filter(b => {
        if (filter === 'all') return true;
        return b.type === filter;
    }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const pendingPayable = bills.filter(b => b.type === 'payable' && b.status === 'pending');
    const totalPendingPayable = pendingPayable.reduce((acc, b) => acc + b.amount, 0);

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

                <div className="flex gap-2">
                    <div className="px-4 py-2 rounded-xl bg-danger/5 border border-danger/10">
                        <p className="text-[10px] uppercase font-bold text-danger/70">A Pagar Pendente</p>
                        <p className="text-lg font-bold text-danger">{formatCurrency(totalPendingPayable)}</p>
                    </div>
                    <Button onClick={() => setShowAddForm(!showAddForm)} className="rounded-xl h-full px-6 gap-2">
                        {showAddForm ? 'Cancelar' : <><Plus className="w-4 h-4" /> Nova Conta</>}
                    </Button>
                </div>
            </div>

            {/* Add Form */}
            {showAddForm && (
                <form onSubmit={handleSubmit} className="card-elevated p-6 border-2 border-primary/20 animate-scale-in space-y-4 bg-muted/30">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label>Nome da Conta</Label>
                            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Aluguel" required />
                        </div>
                        <div className="space-y-2">
                            <Label>Valor (R$)</Label>
                            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" required />
                        </div>
                        <div className="space-y-2">
                            <Label>Vencimento</Label>
                            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Tipo</Label>
                            <select className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={type} onChange={e => setType(e.target.value as any)}>
                                <option value="payable">A Pagar (Despesa)</option>
                                <option value="receivable">A Receber (Receita)</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div className="space-y-2">
                            <Label>Categoria</Label>
                            <select className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                                <option value="">Selecione...</option>
                                {categories.filter(c => c.type === (type === 'payable' ? 'expense' : 'income')).map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 h-6">
                                <input type="checkbox" id="isFixed" checked={isFixed} onChange={e => setIsFixed(e.target.checked)} className="w-4 h-4" />
                                <Label htmlFor="isFixed" className="cursor-pointer">Conta Fixa / Recorrente?</Label>
                            </div>
                            {editingBillId && isFixed && (
                                <div className="flex items-center gap-2 h-6 animate-fade-in">
                                    <input type="checkbox" id="applyFuture" checked={applyToFuture} onChange={e => setApplyToFuture(e.target.checked)} className="w-4 h-4" />
                                    <Label htmlFor="applyFuture" className="cursor-pointer text-xs text-primary font-bold">Aplicar a futuras?</Label>
                                </div>
                            )}
                        </div>
                        <Button type="submit" className="w-full rounded-xl h-11">{editingBillId ? 'Atualizar Conta' : 'Salvar Conta'}</Button>
                    </div>
                </form>
            )}

            {/* Filters */}
            <div className="flex items-center gap-2 p-1 bg-muted rounded-2xl w-full overflow-x-auto no-scrollbar md:w-fit">
                {[
                    { id: 'all', label: 'Todas', icon: Filter },
                    { id: 'payable', label: 'A Pagar', icon: ArrowDownCircle },
                    { id: 'receivable', label: 'A Receber', icon: ArrowUpCircle },
                ].map((btn) => (
                    <button
                        key={btn.id}
                        onClick={() => setFilter(btn.id as any)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                            filter === btn.id ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <btn.icon className="w-4 h-4" />
                        {btn.label}
                    </button>
                ))}
            </div>

            {/* Bills List */}
            <div className="grid gap-3">
                {filteredBills.length === 0 ? (
                    <div className="card-elevated p-12 text-center text-muted-foreground">
                        <Receipt className="w-12 h-12 mx-auto mb-4 opacity-10" />
                        <p>Nenhuma conta encontrada com este filtro.</p>
                    </div>
                ) : (
                    filteredBills.map((bill) => {
                        const isLate = new Date(bill.dueDate) < new Date() && bill.status === 'pending';
                        const category = categories.find(c => c.id === bill.categoryId);

                        return (
                            <div
                                key={bill.id}
                                className={cn(
                                    "card-elevated p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:translate-x-1 border-l-4",
                                    bill.status === 'paid' ? "border-success opacity-80" : isLate ? "border-danger bg-danger/5" : "border-info"
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "p-3 rounded-2xl",
                                        bill.type === 'payable' ? "bg-danger/10 text-danger" : "bg-success/10 text-success"
                                    )}>
                                        {bill.type === 'payable' ? <ArrowDownCircle className="w-5 h-5" /> : <ArrowUpCircle className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <h4 className="font-bold">{bill.name}</h4>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Calendar className="w-3 h-3" />
                                            {bill.status === 'paid' && (bill.paymentDate || bill.dueDate) ? (
                                                <span className="text-success font-bold">
                                                    Pago em {format(new Date(bill.paymentDate || bill.dueDate), "dd 'de' MMMM", { locale: ptBR })}
                                                </span>
                                            ) : (
                                                <>{format(new Date(bill.dueDate), "dd 'de' MMMM", { locale: ptBR })}</>
                                            )}
                                            {category && (
                                                <>
                                                    <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                                                    <span>{category.name}</span>
                                                </>
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

                                    <div className="flex gap-2">
                                        {bill.status === 'pending' && (
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => {
                                                        setIsPaying(bill);
                                                        setPaymentDate(bill.dueDate || new Date().toISOString().split('T')[0]);
                                                        setPaymentMethod('account');
                                                    }}
                                                    className="h-11 px-4 rounded-2xl bg-success/5 text-success hover:bg-success/10 flex items-center gap-2 font-black uppercase text-[10px] tracking-wider"
                                                >
                                                    <CheckCircle2 className="w-5 h-5" />
                                                    Baixar Conta
                                                </Button>
                                            </div>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleEdit(bill)}
                                            className="h-10 w-10 p-0 rounded-xl hover:bg-primary/10 hover:text-primary"
                                        >
                                            <Pencil className="w-5 h-5" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => deleteBill(bill.id)}
                                            className="h-10 w-10 p-0 rounded-xl hover:bg-danger/10 hover:text-danger"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Payment Account Selection Popup */}
            {isPaying && (
                <Portal>
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setIsPaying(null)}
                    >
                        <div
                            className="bg-card rounded-2xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-200 border border-border max-h-[80vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="px-5 py-4 border-b border-border sticky top-0 bg-card rounded-t-2xl z-10">
                                <h2 className="text-lg font-black tracking-tight">
                                    {isPaying.type === 'receivable' ? 'Receber com qual conta?' : 'Pagar com qual conta?'}
                                </h2>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    <span className={cn("font-bold", isPaying.type === 'receivable' ? "text-success" : "text-danger")}>
                                        {formatCurrency(isPaying.amount)}
                                    </span>
                                    {' — '}
                                    {isPaying.name}
                                </p>
                            </div>

                            {/* Advanced Payment Options */}
                            <div className="p-4 space-y-4">
                                {/* Date Selection */}
                                <div className="space-y-2 relative">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Data do Pagamento</label>
                                    <label className="relative flex items-center bg-muted/30 border border-input rounded-xl p-3 focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all cursor-pointer">
                                        <Calendar className="absolute left-3 w-4 h-4 text-primary" />
                                        <input
                                            type="date"
                                            value={paymentDate}
                                            onChange={(e) => setPaymentDate(e.target.value)}
                                            className="w-full pl-8 pr-2 bg-transparent text-sm font-bold focus:outline-none appearance-none cursor-pointer text-foreground"
                                        />
                                    </label>
                                </div>

                                {/* Account / Card Tabs */}
                                <div className="flex rounded-xl bg-muted/40 p-1">
                                    <button
                                        onClick={() => setPaymentMethod('account')}
                                        className={cn(
                                            "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                                            paymentMethod === 'account' ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        Conta Bancária
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod('credit_card')}
                                        className={cn(
                                            "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                                            paymentMethod === 'credit_card' ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        Cartão de Crédito
                                    </button>
                                </div>
                            </div>

                            {/* Targets List */}
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
                                                <button
                                                    key={acc.id}
                                                    onClick={() => handleMarkAsPaid(acc.id, false)}
                                                    disabled={insufficientFunds}
                                                    className={cn(
                                                        "w-full p-4 rounded-xl border-2 text-left transition-all",
                                                        insufficientFunds
                                                            ? "border-border/30 opacity-40 cursor-not-allowed"
                                                            : "border-border hover:border-primary/50 hover:bg-primary/5 hover:shadow-md active:scale-[0.98] cursor-pointer"
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                className="w-4 h-4 rounded-full shadow-sm"
                                                                style={{ backgroundColor: acc.color }}
                                                            />
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
                                                            {insufficientFunds && (
                                                                <p className="text-[9px] text-danger font-bold">Saldo inadequado</p>
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
                                        creditCards.map(card => {
                                            return (
                                                <button
                                                    key={card.id}
                                                    onClick={() => handleMarkAsPaid(card.id, true)}
                                                    className="w-full p-4 rounded-xl border-2 border-border hover:border-primary/50 hover:bg-primary/5 hover:shadow-md active:scale-[0.98] transition-all text-left cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="w-4 h-4 rounded-full shadow-sm"
                                                            style={{ backgroundColor: card.color }}
                                                        />
                                                        <div>
                                                            <p className="font-bold text-sm">{card.name}</p>
                                                            <p className="text-[10px] text-muted-foreground font-bold uppercase">{card.bank}</p>
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })
                                    )
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-5 py-3 border-t border-border">
                                <Button
                                    variant="ghost"
                                    onClick={() => setIsPaying(null)}
                                    className="w-full rounded-xl text-sm font-bold"
                                >
                                    Cancelar
                                </Button>
                            </div>
                        </div>
                    </div>
                </Portal>
            )}

        </div>
    );
}
