import { useState, useEffect } from 'react';
import { X, Calendar, CreditCard, RotateCw, Coins, Check, ChevronsUpDown, Trash2, ArrowRightLeft, TrendingUp, TrendingDown, Wallet, ArrowUpCircle, ArrowDownCircle, Info } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import {
  Transaction,
  Account,
  CreditCard as CreditCardType,
} from '@/types/finance';
import { cn } from '@/lib/utils';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { OverdraftWarningDialog } from '@/components/ui/OverdraftWarningDialog';

interface TransactionFormProps {
  accounts: Account[];
  creditCards: CreditCardType[];
  initialData?: Transaction;
  onSubmit: (transaction: Omit<Transaction, 'id'>, customInstallments?: { date: string, amount: number }[], applyScope?: 'this' | 'future' | 'all') => void;
  onDelete?: (id: string, applyScope: 'this' | 'future' | 'all') => void;
  onClose: () => void;
}

type TabType = 'pontual' | 'parcelamento' | 'fixo' | 'divida' | 'transfer' | 'renda_fixa';
type Step = 'SELECT_TYPE' | 'SELECT_SUBTYPE' | 'DETAILS';

const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const isDateTodayOrPast = (dateStr: string): boolean => {
  const d = parseLocalDate(dateStr);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return d <= today;
};

export function TransactionForm({ accounts, creditCards, initialData, onSubmit, onDelete, onClose }: TransactionFormProps) {
  // Wizard State
  const [step, setStep] = useState<Step>(initialData ? 'DETAILS' : 'SELECT_TYPE');
  const [activeTab, setActiveTab] = useState<TabType>('pontual');
  const [type, setType] = useState<'income' | 'expense'>(initialData?.type || 'expense');

  // Form Fields
  const [description, setDescription] = useState(initialData?.description || '');
  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [categoryId, setCategoryId] = useState<string>(initialData?.categoryId || '');
  const [subcategoryId, setSubcategoryId] = useState<string>(initialData?.subcategoryId || '');
  const [date, setDate] = useState(initialData?.date || format(new Date(), 'yyyy-MM-dd'));
  const [accountId, setAccountId] = useState<string>(initialData?.accountId || '');
  const [cardId, setCardId] = useState<string>(initialData?.cardId || '');
  const [paymentMethod, setPaymentMethod] = useState<'account' | 'card'>(initialData?.cardId ? 'card' : 'account');
  const [selectedDebtId, setSelectedDebtId] = useState<string>(initialData?.debtId || '');
  const [isAutomatic, setIsAutomatic] = useState<boolean>((initialData as any)?.isAutomatic || false);

  // Installments / Recurrence
  const [installmentsCount, setInstallmentsCount] = useState('2');
  const [areInstallmentsEqual, setAreInstallmentsEqual] = useState(true);
  const [fixedPaymentDay, setFixedPaymentDay] = useState(true);
  const [customInstallmentDates, setCustomInstallmentDates] = useState<{ date: string, amount: number }[]>([]);
  const [recurrence, setRecurrence] = useState<'monthly' | 'weekly'>('monthly');

  // Debt Specific
  const [debtTotal, setDebtTotal] = useState('');
  const [debtInstallments, setDebtInstallments] = useState('');
  const [debtFirstPaymentDate, setDebtFirstPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Transfer Specific
  const [transferFrom, setTransferFrom] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferToType, setTransferToType] = useState<'account' | 'card'>('account');
  const [transferDescription, setTransferDescription] = useState('Transferência entre contas');

  // Reference for Editing
  const [invoiceReference, setInvoiceReference] = useState(() => {
    if (initialData?.invoiceMonthYear) return initialData.invoiceMonthYear;
    if (initialData?.date) return initialData.date.slice(0, 7);
    return format(new Date(), 'yyyy-MM');
  });

  const [applyScope, setApplyScope] = useState<'this' | 'future' | 'all'>('this');
  const [isPaidLocally, setIsPaidLocally] = useState(initialData?.isPaid || false);

  const [showOverdraftWarning, setShowOverdraftWarning] = useState(false);
  const [overdraftAmountUsed, setOverdraftAmountUsed] = useState(0);
  const [overdraftAccountName, setOverdraftAccountName] = useState('');
  const [pendingAmount, setPendingAmount] = useState<number | null>(null);

  const { debts, createDebtWithInstallments, categories, subcategories, transferBetweenAccounts, getAccountViewBalance, getCardExpenses } = useFinanceStore();

  const [openCategory, setOpenCategory] = useState(false);
  const [openSubcategory, setOpenSubcategory] = useState(false);

  const filteredCategories = categories.filter(c => c.type === type);
  const currentCategorySubcategories = subcategories.filter(s => s.categoryId === categoryId);

  useEffect(() => {
    if (initialData) {
      if (initialData.transactionType === 'recurring' || initialData.isRecurring) {
        if (initialData.type === 'income' && (initialData as any).isAutomatic) {
            setActiveTab('renda_fixa');
        } else {
            setActiveTab('fixo');
        }
      } else if (initialData.transactionType === 'installment' || (initialData.installmentTotal && initialData.installmentTotal > 1)) {
        setActiveTab('parcelamento');
        setInstallmentsCount(initialData.installmentTotal?.toString() || '2');
      } else if (initialData.debtId) {
        setActiveTab('divida');
      } else {
        setActiveTab('pontual');
      }
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === 'divida') {
      if (!description || !debtTotal || !debtInstallments) return;
      createDebtWithInstallments({
        name: description,
        totalAmount: parseFloat(debtTotal),
        remainingAmount: parseFloat(debtTotal),
        monthlyPayment: parseFloat(debtTotal) / parseInt(debtInstallments),
        interestRateMonthly: 0,
        startDate: format(new Date(), 'yyyy-MM-dd'),
      }, debtFirstPaymentDate);
      onClose();
      return;
    }

    if (activeTab === 'transfer') {
      if (!transferFrom || !transferTo || !amount) return;
      transferBetweenAccounts(transferFrom, transferTo, parseFloat(amount), transferDescription, date, transferToType);
      onClose();
      return;
    }

    if (!description || !amount || !categoryId) return;

    const parsedAmount = parseFloat(amount);
    const isPayingNow = initialData ? isPaidLocally : isDateTodayOrPast(date);

    if (type === 'expense' && paymentMethod === 'account' && accountId && isPayingNow) {
      const acc = accounts.find(a => a.id === accountId);
      if (acc && acc.hasOverdraft) {
        let impact = parsedAmount;
        if (initialData && initialData.isPaid && initialData.accountId === accountId) {
          impact = parsedAmount - initialData.amount;
        }
        if (impact > 0 && acc.balance < impact) {
          const deficit = impact - acc.balance;
          if (deficit > 0 && deficit <= (acc.overdraftLimit || 0)) {
            setOverdraftAmountUsed(deficit);
            setOverdraftAccountName(acc.name);
            setPendingAmount(parsedAmount);
            setShowOverdraftWarning(true);
            return;
          }
        }
      }
    }

    executeSubmit(parsedAmount);
  };

  const executeSubmit = (parsedAmount: number) => {
    let finalCustomInstallments: { date: string, amount: number }[] | undefined = undefined;

    if (activeTab === 'parcelamento' && (!areInstallmentsEqual || !fixedPaymentDay)) {
      if (customInstallmentDates.length > 0) {
        finalCustomInstallments = customInstallmentDates;
      } else {
        const count = parseInt(installmentsCount) || 2;
        const val = parseFloat((parsedAmount / count).toFixed(2));
        const baseDate = parseLocalDate(date);
        finalCustomInstallments = Array.from({ length: count }, (_, i) => {
          const instDate = addMonths(baseDate, i);
          return { date: format(instDate, 'yyyy-MM-dd'), amount: val };
        });
        const diff = parseFloat((parsedAmount - finalCustomInstallments.reduce((s, i) => s + i.amount, 0)).toFixed(2));
        if (finalCustomInstallments.length > 0 && Math.abs(diff) > 0.001) {
          finalCustomInstallments[finalCustomInstallments.length - 1].amount = parseFloat((finalCustomInstallments[finalCustomInstallments.length - 1].amount + diff).toFixed(2));
        }
      }
    }

    const isPaid = initialData ? isPaidLocally : isDateTodayOrPast(date);

    onSubmit({
      type,
      transactionType: activeTab === 'parcelamento' ? 'installment' : (activeTab === 'fixo' || activeTab === 'renda_fixa') ? 'recurring' : 'punctual',
      description,
      amount: parsedAmount,
      categoryId,
      subcategoryId: subcategoryId || undefined,
      date,
      accountId: paymentMethod === 'account' ? accountId : undefined,
      cardId: paymentMethod === 'card' ? cardId : undefined,
      installmentTotal: activeTab === 'parcelamento' ? parseInt(installmentsCount) : undefined,
      isRecurring: activeTab === 'fixo' || activeTab === 'renda_fixa',
      recurrence: (activeTab === 'fixo' || activeTab === 'renda_fixa') ? recurrence : undefined,
      isAutomatic: activeTab === 'renda_fixa' ? true : isAutomatic,
      debtId: selectedDebtId || undefined,
      invoiceMonthYear: (paymentMethod === 'card' && initialData) ? invoiceReference : undefined,
      isPaid,
      paymentDate: isPaid ? date : undefined,
      userId: initialData?.userId || ''
    }, finalCustomInstallments, applyScope);

    onClose();
  };

  const generateCustomInstallments = () => {
    const count = parseInt(installmentsCount) || 2;
    const baseAmount = parseFloat(amount) || 0;
    const val = parseFloat((baseAmount / count).toFixed(2));
    const baseDate = parseLocalDate(date);

    const newInst = Array.from({ length: count }, (_, i) => {
      const instDate = addMonths(baseDate, i);
      return { date: format(instDate, 'yyyy-MM-dd'), amount: val };
    });

    const diff = parseFloat((baseAmount - newInst.reduce((s, i) => s + i.amount, 0)).toFixed(2));
    if (newInst.length > 0 && Math.abs(diff) > 0.001) {
      newInst[newInst.length - 1].amount = parseFloat((newInst[newInst.length - 1].amount + diff).toFixed(2));
    }
    setCustomInstallmentDates(newInst);
  };

  // --- Step Renders ---

  const renderStep1 = () => (
    <div className="grid grid-cols-2 gap-4 p-6 animate-in fade-in zoom-in duration-300">
      <button
        onClick={() => { setType('income'); setStep('SELECT_SUBTYPE'); }}
        className="flex flex-col items-center justify-center p-8 rounded-3xl border-2 border-transparent bg-success/10 hover:bg-success/20 hover:border-success/30 transition-all group"
      >
        <div className="p-4 rounded-2xl bg-success text-success-foreground mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-success/20">
          <ArrowUpCircle className="w-10 h-10" />
        </div>
        <span className="text-xl font-black text-success">Receita</span>
        <p className="text-[10px] text-success/60 uppercase font-bold mt-1 tracking-widest">Dinheiro entrando</p>
      </button>

      <button
        onClick={() => { setType('expense'); setStep('SELECT_SUBTYPE'); }}
        className="flex flex-col items-center justify-center p-8 rounded-3xl border-2 border-transparent bg-danger/10 hover:bg-danger/20 hover:border-danger/30 transition-all group"
      >
        <div className="p-4 rounded-2xl bg-danger text-danger-foreground mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-danger/20">
          <ArrowDownCircle className="w-10 h-10" />
        </div>
        <span className="text-xl font-black text-danger">Despesa</span>
        <p className="text-[10px] text-danger/60 uppercase font-bold mt-1 tracking-widest">Dinheiro saindo</p>
      </button>
    </div>
  );

  const renderStep2 = () => {
    const options = type === 'income' 
      ? [
          { id: 'pontual', label: 'Pontual', icon: Coins, desc: 'Recebi hoje ou em data única.' },
          { id: 'renda_fixa', label: 'Renda Fixa', icon: RotateCw, desc: 'Salário ou renda mensal automática.' },
          { id: 'transfer', label: 'Transferência', icon: ArrowRightLeft, desc: 'Mover dinheiro entre contas.' },
        ]
      : [
          { id: 'pontual', label: 'Pontual', icon: Coins, desc: 'Compra à vista no débito ou dinheiro.' },
          { id: 'parcelamento', label: 'Parcelado', icon: CreditCard, desc: 'Compra no cartão de crédito.' },
          { id: 'fixo', label: 'Fixo', icon: RotateCw, desc: 'Contas que repetem todo mês.' },
          { id: 'divida', label: 'Dívida', icon: Calendar, desc: 'Empréstimos ou acordos judiciais.' },
          { id: 'transfer', label: 'Transferência', icon: ArrowRightLeft, desc: 'Mover entre contas ou pagar cartão.' },
        ];

    return (
      <div className="p-6 space-y-4 animate-in fade-in slide-in-from-right duration-300">
        <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" onClick={() => setStep('SELECT_TYPE')} className="rounded-xl text-xs font-bold uppercase tracking-tighter">← Voltar</Button>
            <span className={cn("text-[10px] font-black uppercase px-2 py-0.5 rounded-md", type === 'income' ? "bg-success/10 text-success" : "bg-danger/10 text-danger")}>
                {type === 'income' ? 'Receita' : 'Despesa'} selecionada
            </span>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => { setActiveTab(opt.id as TabType); setStep('DETAILS'); }}
              className="flex items-center gap-4 p-4 rounded-2xl border-2 border-border bg-card hover:border-primary hover:bg-primary/5 transition-all group text-left"
            >
              <div className="p-3 rounded-xl bg-muted group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <opt.icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-base leading-tight">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-muted opacity-0 group-hover:opacity-100 transition-opacity">
                <Check className="w-4 h-4 text-primary" />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm">
      <div className="bg-card rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col border border-border/50">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-muted/5">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">
                {step === 'SELECT_TYPE' ? 'O que deseja lançar?' : 
                 step === 'SELECT_SUBTYPE' ? 'Qual o tipo de lançamento?' :
                 initialData ? 'Editar Lançamento' : 'Detalhes do Lançamento'}
            </h2>
            <p className="text-xs text-muted-foreground font-medium">
                {step === 'SELECT_TYPE' ? 'Selecione a natureza da transação.' :
                 step === 'SELECT_SUBTYPE' ? 'Escolha como este valor será processado.' :
                 'Preencha as informações para concluir.'}
            </p>
          </div>
          <button onClick={onClose} className="p-2.5 rounded-2xl hover:bg-muted transition-colors text-muted-foreground">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {step === 'SELECT_TYPE' && renderStep1()}
          {step === 'SELECT_SUBTYPE' && renderStep2()}
          
          {step === 'DETAILS' && (
            <form onSubmit={handleSubmit} className="p-6 space-y-6 animate-in fade-in slide-in-from-right duration-300">
              
              {/* Context Header for Details Step */}
              {!initialData && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border/50 mb-2">
                    <div className="flex items-center gap-2">
                        <div className={cn("p-2 rounded-xl", type === 'income' ? "bg-success text-success-foreground" : "bg-danger text-danger-foreground")}>
                            {activeTab === 'renda_fixa' ? <RotateCw className="w-4 h-4" /> : <Coins className="w-4 h-4" />}
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-50">{type === 'income' ? 'Receita' : 'Despesa'}</p>
                            <p className="text-sm font-black">{activeTab === 'renda_fixa' ? 'Renda Fixa' : activeTab === 'transfer' ? 'Transferência' : 'Lançamento Pontual'}</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setStep('SELECT_SUBTYPE')} className="text-[10px] font-bold uppercase">Alterar</Button>
                </div>
              )}

              {/* Form Content based on activeTab */}
              {activeTab === 'divida' ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Descrição da Dívida</Label>
                    <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Acordo Banco X" className="h-12 rounded-2xl border-2" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Valor Total (R$)</Label>
                      <Input type="number" value={debtTotal} onChange={e => setDebtTotal(e.target.value)} placeholder="0.00" className="h-12 rounded-2xl border-2" required />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Nº Parcelas</Label>
                      <Input type="number" value={debtInstallments} onChange={e => setDebtInstallments(e.target.value)} placeholder="12" className="h-12 rounded-2xl border-2" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Data 1º Pagamento</Label>
                    <Input type="date" value={debtFirstPaymentDate} onChange={e => setDebtFirstPaymentDate(e.target.value)} className="h-12 rounded-2xl border-2" required />
                  </div>
                </div>

              ) : activeTab === 'transfer' ? (
                <div className="space-y-6">
                  {/* Conta Origem */}
                  <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sair da Conta</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {accounts.map(a => {
                        const balance = getAccountViewBalance(a.id);
                        return (
                          <button key={a.id} type="button" onClick={() => setTransferFrom(a.id)}
                            className={cn("flex flex-col items-start p-3 rounded-2xl border-2 transition-all text-left relative overflow-hidden",
                              transferFrom === a.id ? "border-primary bg-primary/5 shadow-md" : "border-transparent bg-muted/30 hover:bg-muted/50")}>
                            <div className="w-1.5 h-full absolute left-0 top-0" style={{ backgroundColor: a.color }} />
                            <span className="text-[10px] font-bold truncate block w-full ml-1">{a.bank} - {a.name}</span>
                            <span className={cn("text-xs font-black mt-1 ml-1", balance < 0 ? "text-danger" : "text-foreground")}>
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(balance)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-center -my-3 relative z-10">
                    <div className="bg-card rounded-full p-2.5 shadow-lg border border-border">
                      <ArrowRightLeft className="w-5 h-5 text-primary rotate-90" />
                    </div>
                  </div>

                  {/* Destino */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Entrar no Destino</Label>
                      <div className="flex bg-muted rounded-lg p-0.5">
                        <button type="button" onClick={() => { setTransferToType('account'); setTransferTo(''); }}
                          className={cn("px-3 py-1 text-[10px] font-bold rounded-md transition-all", transferToType === 'account' ? "bg-card shadow-sm" : "text-muted-foreground")}>Conta</button>
                        <button type="button" onClick={() => { setTransferToType('card'); setTransferTo(''); }}
                          className={cn("px-3 py-1 text-[10px] font-bold rounded-md transition-all", transferToType === 'card' ? "bg-card shadow-sm" : "text-muted-foreground")}>Cartão</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {transferToType === 'account' ? (
                        accounts.map(a => (
                          <button key={a.id} type="button" onClick={() => setTransferTo(a.id)}
                            className={cn("flex flex-col items-start p-3 rounded-2xl border-2 transition-all text-left relative overflow-hidden",
                              transferTo === a.id ? "border-primary bg-primary/5 shadow-md" : "border-transparent bg-muted/30 hover:bg-muted/50")}>
                            <div className="w-1.5 h-full absolute left-0 top-0" style={{ backgroundColor: a.color }} />
                            <span className="text-[10px] font-bold truncate block w-full ml-1">{a.bank} - {a.name}</span>
                            <span className="text-xs font-black mt-1 ml-1">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(getAccountViewBalance(a.id))}</span>
                          </button>
                        ))
                      ) : (
                        creditCards.map(c => (
                          <button key={c.id} type="button" onClick={() => setTransferTo(c.id)}
                            className={cn("flex flex-col items-start p-3 rounded-2xl border-2 transition-all text-left relative overflow-hidden",
                              transferTo === c.id ? "border-primary bg-primary/5 shadow-md" : "border-transparent bg-muted/30 hover:bg-muted/50")}>
                            <div className="w-1.5 h-full absolute left-0 top-0 bg-primary" />
                            <span className="text-[10px] font-bold truncate block w-full ml-1">{c.bank} - {c.name}</span>
                            <span className="text-[10px] text-muted-foreground ml-1">Fatura: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(getCardExpenses(c.id))}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Valor (R$)</Label>
                      <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="h-12 rounded-2xl border-2 font-black text-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Data</Label>
                      <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-12 rounded-2xl border-2" />
                    </div>
                  </div>
                </div>

              ) : (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">
                        {activeTab === 'renda_fixa' ? 'Nome da Renda' : 'Descrição'}
                    </Label>
                    <Input value={description} onChange={e => setDescription(e.target.value)} placeholder={activeTab === 'renda_fixa' ? "Ex: Salário Torp" : "Ex: Supermercado"} className="h-12 rounded-2xl border-2 font-bold" required />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Valor (R$)</Label>
                        <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="h-12 rounded-2xl border-2 font-black text-xl" required />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">
                            {activeTab === 'renda_fixa' ? 'Dia do Crédito' : 'Data'}
                        </Label>
                        <Input type="date" value={date} onChange={e => { setDate(e.target.value); setInvoiceReference(e.target.value.slice(0, 7)); }} className="h-12 rounded-2xl border-2" required />
                    </div>
                  </div>

                  {activeTab !== 'renda_fixa' && (
                    <div className="space-y-2 flex flex-col">
                        <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Categoria</Label>
                        <Popover open={openCategory} onOpenChange={setOpenCategory}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" aria-expanded={openCategory}
                            className={cn("w-full justify-between rounded-2xl h-12 border-2", !categoryId && "text-muted-foreground",
                                type === 'income' && categoryId ? "border-success/30 text-success bg-success/5" :
                                type === 'expense' && categoryId ? "border-danger/30 text-danger bg-danger/5" : "")}>
                            {categoryId ? filteredCategories.find(c => c.id === categoryId)?.name : "Selecione uma categoria..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0 rounded-2xl" align="start">
                            <Command>
                            <CommandInput placeholder="Buscar categoria..." />
                            <CommandList>
                                <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
                                <CommandGroup>
                                {filteredCategories.map(cat => (
                                    <CommandItem key={cat.id} value={cat.name} onSelect={() => { setCategoryId(cat.id); setSubcategoryId(''); setOpenCategory(false); }}>
                                    <Check className={cn("mr-2 h-4 w-4", categoryId === cat.id ? "opacity-100" : "opacity-0")} />
                                    {cat.name}
                                    </CommandItem>
                                ))}
                                </CommandGroup>
                            </CommandList>
                            </Command>
                        </PopoverContent>
                        </Popover>
                    </div>
                  )}

                  {/* Account / Card Selection */}
                  <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">
                        {type === 'income' ? 'Em qual conta vai cair?' : 'Forma de Pagamento'}
                    </Label>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setPaymentMethod('account')}
                            className={cn("flex-1 py-3 px-4 rounded-2xl font-bold text-sm transition-all border-2 flex items-center justify-center gap-2",
                            paymentMethod === 'account' ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-muted/50 border-transparent text-muted-foreground")}>
                            <Wallet className="w-4 h-4" /> Conta
                        </button>
                        {activeTab !== 'renda_fixa' && (
                            <button type="button" onClick={() => setPaymentMethod('card')}
                                className={cn("flex-1 py-3 px-4 rounded-2xl font-bold text-sm transition-all border-2 flex items-center justify-center gap-2",
                                paymentMethod === 'card' ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-muted/50 border-transparent text-muted-foreground")}>
                                <CreditCard className="w-4 h-4" /> Cartão
                            </button>
                        )}
                    </div>

                    {paymentMethod === 'account' && (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            {accounts.map(acc => (
                                <button key={acc.id} type="button" onClick={() => setAccountId(acc.id)}
                                    className={cn("py-3 px-3 rounded-xl text-xs font-bold transition-all border-2 flex items-center gap-2",
                                    accountId === acc.id ? "border-primary bg-primary/5 text-primary" : "bg-muted/30 border-transparent hover:bg-muted/50")}>
                                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: acc.color }} />
                                    <span className="truncate">{acc.bank} - {acc.name}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {paymentMethod === 'card' && (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            {creditCards.map(card => (
                                <button key={card.id} type="button" onClick={() => setCardId(card.id)}
                                    className={cn("py-3 px-3 rounded-xl text-xs font-bold transition-all border-2",
                                    cardId === card.id ? "border-primary bg-primary/5 text-primary" : "bg-muted/30 border-transparent hover:bg-muted/50")}>
                                    {card.name}
                                </button>
                            ))}
                        </div>
                    )}
                  </div>

                  {activeTab === 'renda_fixa' && (
                    <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex gap-3">
                        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-primary">Automação Ativa</p>
                            <p className="text-[10px] text-primary/70 leading-tight">Esta renda será lançada automaticamente na sua carteira todo mês no dia selecionado. Você poderá editar o valor a qualquer momento.</p>
                        </div>
                    </div>
                  )}

                  {activeTab === 'parcelamento' && (
                    <div className="space-y-4 border-t border-border pt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-muted-foreground">Nº Parcelas</Label>
                                <Input type="number" value={installmentsCount} onChange={e => { setInstallmentsCount(e.target.value); setCustomInstallmentDates([]); }} min="2" className="h-10 rounded-xl" />
                            </div>
                            <div className="flex flex-col gap-2 justify-center">
                                <div className="flex items-center justify-between">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground cursor-pointer" htmlFor="equal-inst">Iguais?</Label>
                                    <input type="checkbox" id="equal-inst" checked={areInstallmentsEqual} onChange={e => setAreInstallmentsEqual(e.target.checked)} className="w-4 h-4" />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground cursor-pointer" htmlFor="fixed-pay">Data Fixa?</Label>
                                    <input type="checkbox" id="fixed-pay" checked={fixedPaymentDay} onChange={e => setFixedPaymentDay(e.target.checked)} className="w-4 h-4" />
                                </div>
                            </div>
                        </div>
                    </div>
                  )}
                </>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 pt-2">
                <Button type="submit" className={cn("w-full rounded-2xl py-7 text-lg font-black shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]",
                    type === 'income' ? "bg-success hover:bg-success/90 shadow-success/20" : "bg-danger hover:bg-danger/90 shadow-danger/20")}>
                    {initialData ? 'Salvar Alterações' : 
                     activeTab === 'renda_fixa' ? 'Confirmar Renda Fixa' : 
                     activeTab === 'transfer' ? 'Confirmar Transferência' : 'Concluir Lançamento'}
                </Button>
                
                {initialData && onDelete && (
                    <Button type="button" variant="ghost" onClick={() => onDelete(initialData.id, applyScope)} className="w-full text-danger hover:bg-danger/5 font-bold rounded-xl py-6 h-auto">
                        <Trash2 className="w-4 h-4 mr-2" /> Excluir permanentemente
                    </Button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>

      <OverdraftWarningDialog
        isOpen={showOverdraftWarning}
        accountName={overdraftAccountName}
        amountUsedFromLimit={overdraftAmountUsed}
        onCancel={() => { setShowOverdraftWarning(false); setPendingAmount(null); }}
        onConfirm={() => {
          setShowOverdraftWarning(false);
          if (pendingAmount !== null) { executeSubmit(pendingAmount); setPendingAmount(null); }
        }}
      />
    </div>
  );
}
