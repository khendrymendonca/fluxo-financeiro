import { useState, useEffect, useMemo } from 'react';
import { X, Calendar, CreditCard, RotateCw, Coins, Check, ChevronsUpDown, Trash2, ArrowRightLeft, TrendingUp, TrendingDown, Wallet, ArrowUpCircle, ArrowDownCircle, Info, Percent } from 'lucide-react';
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
import { formatCurrency } from '@/utils/formatters';
import { toast } from '@/components/ui/use-toast';
import { parseLocalDate, todayLocalString } from '@/utils/dateUtils';
import { calcInvoiceMonthYear } from '@/utils/creditCardUtils';

interface TransactionFormProps {
  accounts: Account[];
  creditCards: CreditCardType[];
  initialData?: Transaction;
  onSubmit: (transaction: Omit<Transaction, 'id'> & { cardClosingDay?: number, cardDueDay?: number }, customInstallments?: { date: string, amount: number }[], applyScope?: 'this' | 'future' | 'all') => void;
  onDelete?: (id: string, applyScope: 'this' | 'future' | 'all') => void;
  onClose: () => void;
  initialTab?: TabType;
}

type TabType = 'pontual' | 'parcelamento' | 'fixo' | 'transfer' | 'renda_fixa';
type Step = 'SELECT_TYPE' | 'SELECT_SUBTYPE' | 'DETAILS';

const isDateTodayOrPast = (dateStr: string): boolean => {
  const d = parseLocalDate(dateStr);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return d <= today;
};

export function TransactionForm({ accounts, creditCards, initialData, onSubmit, onDelete, onClose, initialTab }: TransactionFormProps) {
  // Wizard State
  const [step, setStep] = useState<Step>(initialData || initialTab ? 'DETAILS' : 'SELECT_TYPE');
  const [activeTab, setActiveTab] = useState<TabType>(initialTab || 'pontual');
  const [type, setType] = useState<'income' | 'expense'>(initialData?.type || 'expense');

  // Form Fields
  const [description, setDescription] = useState(initialData?.description || '');
  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [categoryId, setCategoryId] = useState<string>(initialData?.categoryId || '');
  const [subcategoryId, setSubcategoryId] = useState<string>(initialData?.subcategoryId || (initialData as any)?.subcategory_id || '');
  const [date, setDate] = useState(initialData?.date || todayLocalString());
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
  const [debtInterest, setDebtInterest] = useState('0');
  const [debtFirstPaymentDate, setDebtFirstPaymentDate] = useState(todayLocalString());

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

  const {
    debts,
    categories,
    subcategories,
    transferBetweenAccounts,
    getAccountViewBalance,
    getCardExpenses,
    isAddingTransaction,
    isUpdatingTransaction,
    isTransferring
  } = useFinanceStore();

  const isPending = isAddingTransaction || isUpdatingTransaction || isTransferring;

  const [openCategory, setOpenCategory] = useState(false);
  const [openSubcategory, setOpenSubcategory] = useState(false);

  const filteredCategories = categories.filter(c => c.type === type);
  const currentCategorySubcategories = subcategories.filter(s => s.categoryId === categoryId);

  useEffect(() => {
    if (initialData) {
      if (initialData.transactionType === 'recurring' || initialData.isRecurring || (initialData as any).is_recurring) {
        if (initialData.type === 'income' && (initialData as any).isAutomatic) {
          setActiveTab('renda_fixa');
        } else {
          setActiveTab('fixo');
        }
      } else if (initialData.transactionType === 'installment' || (initialData.installmentTotal && initialData.installmentTotal > 1)) {
        setActiveTab('parcelamento');
        setInstallmentsCount(initialData.installmentTotal?.toString() || '2');
      } else if (initialData.debtId) {
        // Agora dívidas são gerenciadas apenas no DebtsManager, 
        // mas marcamos como pontual se vier algo com debtId para não quebrar.
        setActiveTab('pontual');
      } else {
        setActiveTab('pontual');
      }
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();


    if (activeTab === 'transfer') {
      const errors: string[] = [];
      if (!transferFrom) errors.push('Conta de Origem');
      if (!transferTo) errors.push('Conta de Destino');
      if (!amount || parseFloat(amount) <= 0) errors.push('Valor');

      if (errors.length > 0) {
        toast({ title: 'Campos obrigatórios', description: `Preencha: ${errors.join(', ')}`, variant: 'destructive' });
        return;
      }

      if (transferFrom === transferTo && transferToType === 'account') {
        toast({ title: 'Origem e destino não podem ser iguais', variant: 'destructive' });
        return;
      }

      let invoiceMonthYear;
      if (transferToType === 'card') {
        const selectedCard = creditCards.find(c => c.id === transferTo);
        if (selectedCard) {
          invoiceMonthYear = calcInvoiceMonthYear(parseLocalDate(date), {
            closingDay: selectedCard.closingDay,
            dueDay: selectedCard.dueDay
          });
        }
      }

      transferBetweenAccounts(transferFrom, transferTo, parseFloat(amount), transferDescription, date, transferToType, invoiceMonthYear);
      onClose();
      return;
    }

    const errors: string[] = [];
    if (!description) errors.push('Descrição');
    if (!amount || parseFloat(amount) <= 0) errors.push('Valor');
    if (activeTab !== 'renda_fixa' && !categoryId) errors.push('Categoria');
    if (paymentMethod === 'account' && !accountId) errors.push('Conta');
    if (paymentMethod === 'card' && !cardId) errors.push('Cartão');

    if (errors.length > 0) {
      toast({
        title: 'Campos obrigatórios',
        description: `Preencha: ${errors.join(', ')}`,
        variant: 'destructive'
      });
      return;
    }

    let finalCategoryId = categoryId;
    if (activeTab === 'renda_fixa' && !categoryId) {
      const salaryCat = categories.find(c => c.name.toLowerCase().includes('salário') || c.name.toLowerCase().includes('renda'));
      const firstIncomeCat = categories.find(c => c.type === 'income');
      finalCategoryId = salaryCat?.id || firstIncomeCat?.id || '';

      if (!finalCategoryId) {
        toast({ title: 'Erro de Categoria', description: 'Nenhuma categoria de receita encontrada. Crie uma em Configurações.', variant: 'destructive' });
        return;
      }
    }

    const parsedAmount = parseFloat(amount);

    let isPayingNow = false;
    if (initialData) {
      isPayingNow = isPaidLocally;
    } else if (activeTab === 'pontual') {
      isPayingNow = isDateTodayOrPast(date);
    }

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

    executeSubmit(parsedAmount, finalCategoryId);
  };

  const executeSubmit = (parsedAmount: number, finalCategoryId?: string) => {
    let isPaid = false;
    if (initialData) {
      isPaid = isPaidLocally;
    } else if (activeTab === 'pontual') {
      isPaid = isDateTodayOrPast(date);
    }
    const selectedCard = creditCards.find(c => c.id === (paymentMethod === 'card' ? cardId : ''));
    const finalInvoiceMonthYear = (paymentMethod === 'card' && selectedCard)
      ? calcInvoiceMonthYear(parseLocalDate(date), { closingDay: selectedCard.closingDay, dueDay: selectedCard.dueDay })
      : undefined;

    // --- LÓGICA DE PARCELAMENTO (BULK) ---
    if (activeTab === 'parcelamento' && !initialData) {
      const count = parseInt(installmentsCount) || 2;
      const groupId = crypto.randomUUID();
      const baseDate = parseLocalDate(date);
      const installmentList: any[] = [];

      for (let i = 0; i < count; i++) {
        const currentInstDate = addMonths(baseDate, i);
        const dateStr = format(currentInstDate, 'yyyy-MM-dd');

        // Se for cartão, consideramos pago (já que o limite é consumido)
        // Se não for cartão, marcamos como pago apenas se a data for hoje ou passada
        const instIsPaid = paymentMethod === 'card' ? true : isDateTodayOrPast(dateStr);

        const invoiceMonthYear = (paymentMethod === 'card' && selectedCard)
          ? calcInvoiceMonthYear(currentInstDate, { closingDay: selectedCard.closingDay, dueDay: selectedCard.dueDay })
          : undefined;

        installmentList.push({
          type,
          transactionType: 'installment',
          description: `${description} (${i + 1}/${count})`,
          amount: parseFloat((parsedAmount / count).toFixed(2)),
          categoryId: finalCategoryId || categoryId,
          subcategoryId: subcategoryId || undefined,
          date: dateStr,
          accountId: paymentMethod === 'account' ? accountId : undefined,
          cardId: paymentMethod === 'card' ? cardId : undefined,
          installmentGroupId: groupId,
          installmentNumber: i + 1,
          installmentTotal: count,
          isPaid: instIsPaid,
          paymentDate: instIsPaid ? dateStr : undefined,
          invoiceMonthYear
        });
      }

      // Ajuste de dízima na última parcela
      const totalGenerated = installmentList.reduce((sum, inst) => sum + inst.amount, 0);
      const diff = parseFloat((parsedAmount - totalGenerated).toFixed(2));
      if (!Number.isNaN(diff) && Math.abs(diff) > 0.001) {
        installmentList[count - 1].amount = parseFloat((installmentList[count - 1].amount + diff).toFixed(2));
      }

      onSubmit(installmentList as any, undefined, applyScope);
      onClose();
      return;
    }

    // --- LÓGICA PONTUAL OU RECORRENTE ---
    const isPaidFinal = initialData ? isPaidLocally : (activeTab === 'pontual' ? isDateTodayOrPast(date) : false);

    onSubmit({
      type,
      transactionType: (activeTab === 'fixo' || activeTab === 'renda_fixa') ? 'recurring' : 'punctual',
      description,
      amount: parsedAmount,
      categoryId: finalCategoryId || categoryId,
      subcategoryId: subcategoryId || null,
      isRecurring: Boolean(activeTab === 'fixo' || activeTab === 'renda_fixa'),
      date: parseLocalDate(date).toISOString(),
      accountId: paymentMethod === 'account' ? accountId : undefined,
      cardId: paymentMethod === 'card' ? cardId : undefined,
      installmentTotal: undefined, 
      recurrence: (activeTab === 'fixo' || activeTab === 'renda_fixa') ? recurrence : undefined,
      isAutomatic: activeTab === 'renda_fixa' ? true : isAutomatic,
      debtId: selectedDebtId || undefined,
      invoiceMonthYear: paymentMethod === 'card' ? finalInvoiceMonthYear : undefined,
      isPaid: isPaidFinal,
      paymentDate: isPaidFinal ? date : undefined,
      installmentGroupId: initialData?.installmentGroupId
    } as any, undefined, applyScope);

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
    if (newInst.length > 0 && !Number.isNaN(diff) && Math.abs(diff) > 0.001) {
      newInst[newInst.length - 1].amount = parseFloat((newInst[newInst.length - 1].amount + diff).toFixed(2));
    }
    setCustomInstallmentDates(newInst);
  };

  const renderStep1 = () => (
    <div className="grid grid-cols-2 gap-4 p-6 animate-in fade-in zoom-in duration-300">
      <button
        onClick={() => { setType('income'); setCategoryId(''); setStep('SELECT_SUBTYPE'); }}
        className="flex flex-col items-center justify-center p-8 rounded-3xl border-2 border-transparent bg-success/10 hover:bg-success/20 hover:border-success/30 transition-all group"
      >
        <div className="p-4 rounded-2xl bg-success text-success-foreground mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-success/20">
          <ArrowUpCircle className="w-10 h-10" />
        </div>
        <span className="text-xl font-black text-success">Receita</span>
        <p className="text-[10px] text-success/60 uppercase font-bold mt-1 tracking-widest">Dinheiro entrando</p>
      </button>

      <button
        onClick={() => { setType('expense'); setCategoryId(''); setStep('SELECT_SUBTYPE'); }}
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
              <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border/50 mb-2">
                <div className="flex items-center gap-2">
                  <div className={cn("p-2 rounded-xl", type === 'income' ? "bg-success text-success-foreground" : "bg-danger text-danger-foreground")}>
                    {activeTab === 'renda_fixa' ? <RotateCw className="w-4 h-4" /> : <Coins className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-50">{type === 'income' ? 'RECEITA' : 'DESPESA'}</p>
                    <p className="text-sm font-black flex items-center gap-2">
                      {activeTab === 'pontual' && 'Lançamento Pontual'}
                      {activeTab === 'parcelamento' && 'Lançamento Parcelado'}
                      {activeTab === 'fixo' && 'Lançamento Fixo'}
                      {activeTab === 'transfer' && 'Transferência'}
                      {activeTab === 'renda_fixa' && 'Rendimento'}
                      {initialData?.isVirtual && <span className="text-[9px] bg-amber-500/20 text-amber-600 px-1.5 py-0.5 rounded uppercase tracking-tighter">Projeção</span>}
                    </p>
                  </div>
                </div>
                {initialData?.isVirtual ? (
                  <Button variant="ghost" size="sm" disabled className="text-[10px] font-bold uppercase opacity-50" title="Altere a transação original para mudar o tipo estrutural">Bloqueado</Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => setStep('SELECT_SUBTYPE')} disabled={isPending} className="text-[10px] font-bold uppercase">Alterar</Button>
                )}
              </div>

              {/* Form Content based on activeTab */}
              {activeTab === 'transfer' ? (
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
                              {formatCurrency(balance)}
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
                            <span className="text-xs font-black mt-1 ml-1">{formatCurrency(getAccountViewBalance(a.id))}</span>
                          </button>
                        ))
                      ) : (
                        creditCards.map(c => (
                          <button key={c.id} type="button" onClick={() => setTransferTo(c.id)}
                            className={cn("flex flex-col items-start p-3 rounded-2xl border-2 transition-all text-left relative overflow-hidden",
                              transferTo === c.id ? "border-primary bg-primary/5 shadow-md" : "border-transparent bg-muted/30 hover:bg-muted/50")}>
                            <div className="w-1.5 h-full absolute left-0 top-0 bg-primary" />
                            <span className="text-[10px] font-bold truncate block w-full ml-1">{c.bank} - {c.name}</span>
                            <span className="text-[10px] text-muted-foreground ml-1">Fatura: {formatCurrency(getCardExpenses(c.id))}</span>
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
                      <Input type="date" value={date?.split('T')[0] || ''} onChange={e => setDate(e.target.value)} className="h-12 rounded-2xl border-2" />
                    </div>
                  </div>
                </div>

              ) : (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">
                      {activeTab === 'renda_fixa' ? 'Nome da Renda' : 'Descrição'}
                    </Label>
                    <Input value={description} onChange={e => setDescription(e.target.value)} placeholder={type === 'income' ? "Ex: Salário" : "Ex: Supermercado"} className="h-12 rounded-2xl border-2 font-bold" required />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Valor (R$)</Label>
                      <Input type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="h-12 rounded-2xl border-2 font-black text-xl" required />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">
                        {activeTab === 'renda_fixa' ? 'Dia do Crédito' : 'Data'}
                      </Label>
                      <Input type="date" value={date?.split('T')[0] || ''} onChange={e => { setDate(e.target.value); setInvoiceReference(e.target.value.slice(0, 7)); }} className="h-12 rounded-2xl border-2" required />
                    </div>
                  </div>

                  {activeTab !== 'renda_fixa' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Categoria */}
                      <div className="space-y-2 flex flex-col">
                        <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Categoria</Label>
                        <Popover open={openCategory} onOpenChange={setOpenCategory}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" aria-expanded={openCategory}
                              className={cn("w-full justify-between rounded-2xl h-12 border-2", !categoryId && "text-muted-foreground",
                                type === 'income' && categoryId ? "border-success/30 text-success bg-success/5" :
                                  type === 'expense' && categoryId ? "border-danger/30 text-danger bg-danger/5" : "")}>
                              {categoryId ? filteredCategories.find(c => c.id === categoryId)?.name : "Selecione..."}
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

                      {/* Subcategoria */}
                      <div className="space-y-2 flex flex-col">
                        <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Subcategoria</Label>
                        <Popover open={openSubcategory} onOpenChange={setOpenSubcategory}>
                          <PopoverTrigger asChild disabled={!categoryId}>
                            <Button variant="outline" role="combobox" aria-expanded={openSubcategory}
                              className={cn("w-full justify-between rounded-2xl h-12 border-2", !subcategoryId && "text-muted-foreground")}>
                              {subcategoryId ? currentCategorySubcategories.find(s => s.id === subcategoryId)?.name : "Opcional..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0 rounded-2xl" align="start">
                            <Command>
                              <CommandInput placeholder="Buscar subcategoria..." />
                              <CommandList>
                                <CommandEmpty>Nenhuma subcategoria encontrada.</CommandEmpty>
                                <CommandGroup>
                                  {currentCategorySubcategories.map(sub => (
                                    <CommandItem key={sub.id} value={sub.name} onSelect={() => { setSubcategoryId(sub.id); setOpenSubcategory(false); }}>
                                      <Check className={cn("mr-2 h-4 w-4", subcategoryId === sub.id ? "opacity-100" : "opacity-0")} />
                                      {sub.name}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
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

              {/* Alcance da Atualização / Exclusão */}
              {(initialData?.installmentGroupId || initialData?.isRecurring) && (
                <div className="flex flex-col gap-2 p-4 bg-primary/5 rounded-2xl border border-primary/20 animate-in fade-in zoom-in duration-300">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 rounded-lg bg-primary text-primary-foreground">
                      <RotateCw className="w-3 h-3" />
                    </div>
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Alcance da Alteração / Exclusão</Label>
                  </div>
                  <select
                    className="h-11 rounded-xl border-2 border-primary/20 bg-background px-3 text-xs font-bold focus:ring-2 focus:ring-primary outline-none transition-all cursor-pointer hover:border-primary/40"
                    value={applyScope}
                    onChange={e => setApplyScope(e.target.value as any)}
                  >
                    <option value="this">Somente este lançamento</option>
                    <option value="future">Este e todos os futuros</option>
                    <option value="all">Todo o grupo (todos os meses)</option>
                  </select>
                  <p className="text-[9px] text-primary/60 font-medium leading-tight px-1">
                    {applyScope === 'this' ? 'A alteração afetará apenas o mês selecionado.' :
                      applyScope === 'future' ? 'A alteração será replicada para os próximos meses.' :
                        'A alteração será aplicada em todo o histórico deste lançamento.'}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 pt-2">
                <Button type="submit" disabled={isPending} className={cn("w-full rounded-2xl py-7 text-lg font-black shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]",
                  type === 'income' ? "bg-success hover:bg-success/90 shadow-success/20" : "bg-danger hover:bg-danger/90 shadow-danger/20")}>
                  {isPending ? (
                    <div className="flex items-center gap-2">
                      <RotateCw className="w-5 h-5 animate-spin" />
                      <span>Processando...</span>
                    </div>
                  ) : (
                    initialData ? 'Salvar Alterações' :
                      activeTab === 'renda_fixa' ? 'Confirmar Renda Fixa' :
                        activeTab === 'transfer' ? 'Confirmar Transferência' : 'Concluir Lançamento'
                  )}
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


