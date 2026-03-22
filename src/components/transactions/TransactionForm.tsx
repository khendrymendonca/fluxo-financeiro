import { useState, useEffect } from 'react';
import { X, Calendar, CreditCard, RotateCw, Coins, Check, ChevronsUpDown, Trash2, ArrowRightLeft } from 'lucide-react';
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

type TabType = 'pontual' | 'parcelamento' | 'fixo' | 'divida' | 'transfer';

// ✅ FIX: helper local para construir datas sem bug de fuso UTC
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
  const [activeTab, setActiveTab] = useState<TabType>('pontual');
  const [type, setType] = useState<'income' | 'expense'>(initialData?.type || 'expense');

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

  const [installmentsCount, setInstallmentsCount] = useState('2');
  const [areInstallmentsEqual, setAreInstallmentsEqual] = useState(true);
  const [fixedPaymentDay, setFixedPaymentDay] = useState(true);
  const [customInstallmentDates, setCustomInstallmentDates] = useState<{ date: string, amount: number }[]>([]);

  const [recurrence, setRecurrence] = useState<'monthly' | 'weekly'>('monthly');

  const [debtTotal, setDebtTotal] = useState('');
  const [debtInstallments, setDebtInstallments] = useState('');
  const [debtFirstPaymentDate, setDebtFirstPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [invoiceReference, setInvoiceReference] = useState(() => {
    if (initialData?.invoiceMonthYear) return initialData.invoiceMonthYear;
    if (initialData?.date) return initialData.date.slice(0, 7);
    return format(new Date(), 'yyyy-MM');
  });

  const [applyScope, setApplyScope] = useState<'this' | 'future' | 'all'>('this');
  const [isPaidLocally, setIsPaidLocally] = useState(initialData?.isPaid || false);

  const [transferFrom, setTransferFrom] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferToType, setTransferToType] = useState<'account' | 'card'>('account');
  const [transferDescription, setTransferDescription] = useState('Transferência entre contas');

  const [showOverdraftWarning, setShowOverdraftWarning] = useState(false);
  const [overdraftAmountUsed, setOverdraftAmountUsed] = useState(0);
  const [overdraftAccountName, setOverdraftAccountName] = useState('');
  // ✅ FIX: pendingSubmitData armazena apenas parsedAmount, sem o evento sintético
  const [pendingAmount, setPendingAmount] = useState<number | null>(null);

  const { debts, createDebtWithInstallments, categories, subcategories, transferBetweenAccounts, getAccountViewBalance, getCardExpenses } = useFinanceStore();

  const [openCategory, setOpenCategory] = useState(false);
  const [openSubcategory, setOpenSubcategory] = useState(false);

  const filteredCategories = categories.filter(c => c.type === type);
  const currentCategorySubcategories = subcategories.filter(s => s.categoryId === categoryId);

  // ✅ FIX: geração de parcelas com parseLocalDate e addMonths (sem bug de fuso ou pulo de mês)
  const generateCustomInstallments = () => {
    const count = parseInt(installmentsCount) || 2;
    const baseAmount = parseFloat(amount) || 0;
    const val = parseFloat((baseAmount / count).toFixed(2));
    const baseDate = parseLocalDate(date);

    const newInst = Array.from({ length: count }, (_, i) => {
      const instDate = addMonths(baseDate, i);
      return {
        date: format(instDate, 'yyyy-MM-dd'),
        amount: val
      };
    });

    // Ajusta último centavo
    const diff = parseFloat((baseAmount - newInst.reduce((s, i) => s + i.amount, 0)).toFixed(2));
    if (newInst.length > 0 && Math.abs(diff) > 0.001) {
      newInst[newInst.length - 1].amount = parseFloat((newInst[newInst.length - 1].amount + diff).toFixed(2));
    }

    setCustomInstallmentDates(newInst);
  };

  // Auto-sugestão de categoria
  useEffect(() => {
    if (!categoryId && description.length > 3 && categories.length > 0) {
      const desc = description.toLowerCase();
      const suggestion = categories.find(c => {
        const catName = c.name.toLowerCase();
        if (desc.includes(catName)) return true;
        if (c.name === 'Alimentação' && (desc.includes('ifood') || desc.includes('restaurante') || desc.includes('mercado'))) return true;
        if (c.name === 'Transporte' && (desc.includes('uber') || desc.includes('99') || desc.includes('posto') || desc.includes('combustivel'))) return true;
        if (c.name === 'Assinaturas' && (desc.includes('netflix') || desc.includes('spotify') || desc.includes('disney') || desc.includes('prime'))) return true;
        if (c.name === 'Moradia' && (desc.includes('aluguel') || desc.includes('condominio') || desc.includes('energia') || desc.includes('agua'))) return true;
        return false;
      });
      if (suggestion) setCategoryId(suggestion.id);
    }
  }, [description, categories, categoryId]);

  // Sincroniza tab com tipo da transação ao editar
  useEffect(() => {
    if (initialData) {
      if (initialData.transactionType === 'recurring' || initialData.isRecurring) {
        setActiveTab('fixo');
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
    // ✅ FIX: usa isDateTodayOrPast com comparação local
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
            // ✅ FIX: armazena apenas o número, não o evento sintético
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
      // ✅ FIX: usa generateCustomInstallments como fonte única de geração
      if (customInstallmentDates.length > 0) {
        finalCustomInstallments = customInstallmentDates;
      } else {
        // Gera inline com a mesma lógica corrigida de fuso e addMonths
        const count = parseInt(installmentsCount) || 2;
        const val = parseFloat((parsedAmount / count).toFixed(2));
        const baseDate = parseLocalDate(date);
        finalCustomInstallments = Array.from({ length: count }, (_, i) => {
          const instDate = addMonths(baseDate, i);
          return {
            date: format(instDate, 'yyyy-MM-dd'),
            amount: val
          };
        });
        const diff = parseFloat((parsedAmount - finalCustomInstallments.reduce((s, i) => s + i.amount, 0)).toFixed(2));
        if (finalCustomInstallments.length > 0 && Math.abs(diff) > 0.001) {
          finalCustomInstallments[finalCustomInstallments.length - 1].amount = parseFloat(
            (finalCustomInstallments[finalCustomInstallments.length - 1].amount + diff).toFixed(2)
          );
        }
      }
    }

    const isPaid = initialData ? isPaidLocally : isDateTodayOrPast(date);

    onSubmit({
      type,
      transactionType: activeTab === 'parcelamento' ? 'installment' : activeTab === 'fixo' ? 'recurring' : 'punctual',
      description,
      amount: parsedAmount,
      categoryId,
      subcategoryId: subcategoryId || undefined,
      date,
      accountId: paymentMethod === 'account' ? accountId : undefined,
      cardId: paymentMethod === 'card' ? cardId : undefined,
      installmentTotal: activeTab === 'parcelamento' ? parseInt(installmentsCount) : undefined,
      isRecurring: activeTab === 'fixo',
      recurrence: activeTab === 'fixo' ? recurrence : undefined,
      isAutomatic: (activeTab === 'pontual' || activeTab === 'fixo') ? isAutomatic : false,
      debtId: selectedDebtId || undefined,
      // ✅ FIX: invoiceMonthYear só é enviado na edição — criação deixa o store calcular
      invoiceMonthYear: (paymentMethod === 'card' && initialData) ? invoiceReference : undefined,
      isPaid,
      paymentDate: isPaid ? date : undefined,
      userId: initialData?.userId || ''
    }, finalCustomInstallments, applyScope);

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm">
      <div className="bg-card rounded-3xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold">{initialData ? 'Editar Lançamento' : 'Novo Lançamento'}</h2>
            <p className="text-sm text-muted-foreground">
              {initialData ? 'Altere os dados abaixo' : 'Registre uma transação ou transferência'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {initialData && onDelete && (
              <button
                onClick={() => onDelete(initialData.id, applyScope)}
                className="p-3 rounded-2xl hover:bg-danger/10 text-danger transition-colors bg-danger/5"
                title="Excluir Lançamento"
              >
                <Trash2 className="w-6 h-6" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-3 rounded-2xl hover:bg-muted transition-colors"
              title="Fechar"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* ✅ FIX: tabs desabilitadas em modo edição para evitar corrupção de dados */}
        <div className="flex p-2 gap-1 border-b border-border overflow-x-auto">
          {[
            { id: 'pontual', label: 'Pontual', icon: Coins },
            { id: 'parcelamento', label: 'Parcelado', icon: CreditCard },
            { id: 'fixo', label: 'Fixo', icon: RotateCw },
            { id: 'divida', label: 'Dívida', icon: Calendar },
            { id: 'transfer', label: 'Transferência', icon: ArrowRightLeft },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              disabled={!!initialData}
              onClick={() => !initialData && setActiveTab(tab.id as TabType)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground",
                !!initialData && activeTab !== tab.id && "opacity-30 cursor-default"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-1 overflow-y-auto">
          {/* Debt Tab */}
          {activeTab === 'divida' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Descrição da Dívida</Label>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Acordo Banco X" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor Total (R$)</Label>
                  <Input type="number" value={debtTotal} onChange={e => setDebtTotal(e.target.value)} placeholder="0.00" required />
                </div>
                <div className="space-y-2">
                  <Label>Nº Parcelas</Label>
                  <Input type="number" value={debtInstallments} onChange={e => setDebtInstallments(e.target.value)} placeholder="12" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Data 1º Pagamento</Label>
                <Input type="date" value={debtFirstPaymentDate} onChange={e => setDebtFirstPaymentDate(e.target.value)} required />
              </div>
              <div className="p-4 bg-muted/50 rounded-xl text-sm text-muted-foreground">
                Isso criará um registro em <strong>Controle de Dívidas</strong> e lançará {debtInstallments || 0} despesas futuras no seu contas a pagar.
              </div>
            </div>

          ) : activeTab === 'transfer' ? (
            <div className="space-y-6">
              {/* Conta Origem */}
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sair da Conta</Label>
                <div className="grid grid-cols-2 gap-2">
                  {accounts.map(a => {
                    const viewBalance = getAccountViewBalance(a.id);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setTransferFrom(a.id)}
                        className={cn(
                          "flex flex-col items-start p-3 rounded-2xl border-2 transition-all text-left relative overflow-hidden",
                          transferFrom === a.id ? "border-primary bg-primary/5 shadow-md" : "border-transparent bg-muted/30 hover:bg-muted/50"
                        )}
                      >
                        <div className="w-1.5 h-full absolute left-0 top-0" style={{ backgroundColor: a.color }} />
                        <span className="text-xs font-bold truncate block w-full ml-1">{a.bank} - {a.name}</span>
                        <span className={cn("text-sm font-black mt-1 ml-1", viewBalance < 0 ? "text-danger" : "text-foreground")}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(viewBalance)}
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
                      className={cn("px-3 py-1 text-[10px] font-bold rounded-md transition-all", transferToType === 'account' ? "bg-card shadow-sm" : "text-muted-foreground")}>
                      Conta
                    </button>
                    <button type="button" onClick={() => { setTransferToType('card'); setTransferTo(''); }}
                      className={cn("px-3 py-1 text-[10px] font-bold rounded-md transition-all", transferToType === 'card' ? "bg-card shadow-sm" : "text-muted-foreground")}>
                      Cartão
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {transferToType === 'account' ? (
                    accounts.map(a => (
                      <button key={a.id} type="button" onClick={() => setTransferTo(a.id)}
                        className={cn(
                          "flex flex-col items-start p-3 rounded-2xl border-2 transition-all text-left relative overflow-hidden",
                          transferTo === a.id ? "border-primary bg-primary/5 shadow-md" : "border-transparent bg-muted/30 hover:bg-muted/50"
                        )}
                      >
                        <div className="w-1.5 h-full absolute left-0 top-0" style={{ backgroundColor: a.color }} />
                        <span className="text-xs font-bold truncate block w-full ml-1">{a.bank} - {a.name}</span>
                        <span className="text-sm font-black mt-1 ml-1">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(getAccountViewBalance(a.id))}
                        </span>
                      </button>
                    ))
                  ) : (
                    creditCards.map(c => (
                      <button key={c.id} type="button" onClick={() => setTransferTo(c.id)}
                        className={cn(
                          "flex flex-col items-start p-3 rounded-2xl border-2 transition-all text-left relative overflow-hidden",
                          transferTo === c.id ? "border-primary bg-primary/5 shadow-md" : "border-transparent bg-muted/30 hover:bg-muted/50"
                        )}
                      >
                        <div className="w-1.5 h-full absolute left-0 top-0 bg-primary" />
                        <span className="text-xs font-bold truncate block w-full ml-1">{c.bank} - {c.name}</span>
                        <span className="text-[10px] text-muted-foreground ml-1">
                          Fatura: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(getCardExpenses(c.id))}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor (R$)</Label>
                  <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
                    placeholder="0.00" className="h-12 rounded-2xl border-2 focus:border-primary px-4 font-black text-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)}
                    className="h-12 rounded-2xl border-2 focus:border-primary px-4" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input value={transferDescription} onChange={e => setTransferDescription(e.target.value)}
                  placeholder="Ex: Reserva mensal" className="h-11 rounded-2xl border-2 focus:border-primary px-4" />
              </div>
            </div>

          ) : (
            <>
              {/* Toggle Receita/Despesa */}
              <div className="flex gap-2 p-1 bg-muted rounded-2xl">
                <button type="button" onClick={() => { setType('income'); setCategoryId(''); setSubcategoryId(''); }}
                  className={cn("flex-1 py-2.5 px-4 rounded-xl font-medium text-sm transition-all",
                    type === 'income' ? "bg-success text-success-foreground shadow-sm" : "text-muted-foreground")}>
                  Receita
                </button>
                <button type="button" onClick={() => { setType('expense'); setCategoryId(''); setSubcategoryId(''); }}
                  className={cn("flex-1 py-2.5 px-4 rounded-xl font-medium text-sm transition-all",
                    type === 'expense' ? "bg-danger text-danger-foreground shadow-sm" : "text-muted-foreground")}>
                  Despesa
                </button>
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Supermercado" required />
              </div>

              <div className="space-y-2">
                <Label>Valor {activeTab === 'parcelamento' && 'Total'} (R$)</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={e => {
                    setAmount(e.target.value);
                    if (activeTab === 'parcelamento' && !areInstallmentsEqual) setCustomInstallmentDates([]);
                  }}
                  placeholder="0.00"
                  className="text-lg font-semibold"
                  required
                />
              </div>

              {/* Categoria */}
              <div className="space-y-4">
                <div className="space-y-2 flex flex-col">
                  <Label>Categoria</Label>
                  <Popover open={openCategory} onOpenChange={setOpenCategory}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={openCategory}
                        className={cn("w-full justify-between rounded-xl h-11", !categoryId && "text-muted-foreground",
                          type === 'income' && categoryId ? "border-success text-success bg-success/5" :
                          type === 'expense' && categoryId ? "border-danger text-danger bg-danger/5" : "")}>
                        {categoryId ? filteredCategories.find(c => c.id === categoryId)?.name : "Selecione uma categoria..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0 rounded-xl" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar categoria..." />
                        <CommandList>
                          <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
                          <CommandGroup>
                            {filteredCategories.map(cat => (
                              <CommandItem key={cat.id} value={cat.name}
                                onSelect={() => { setCategoryId(cat.id); setSubcategoryId(''); setOpenCategory(false); }}>
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

                {categoryId && currentCategorySubcategories.length > 0 && (
                  <div className="space-y-2 flex flex-col animate-fade-in">
                    <Label>Subcategoria</Label>
                    <Popover open={openSubcategory} onOpenChange={setOpenSubcategory}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" aria-expanded={openSubcategory}
                          className={cn("w-full justify-between rounded-xl h-11", !subcategoryId && "text-muted-foreground",
                            subcategoryId && "border-primary text-primary bg-primary/5")}>
                          {subcategoryId ? currentCategorySubcategories.find(s => s.id === subcategoryId)?.name : "Selecione (opcional)..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 rounded-xl" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar subcategoria..." />
                          <CommandList>
                            <CommandEmpty>Nenhuma subcategoria.</CommandEmpty>
                            <CommandGroup>
                              {currentCategorySubcategories.map(sub => (
                                <CommandItem key={sub.id} value={sub.name}
                                  onSelect={() => { setSubcategoryId(sub.id); setOpenSubcategory(false); }}>
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
                )}
              </div>

              {/* Parcelamento */}
              {activeTab === 'parcelamento' && (
                <div className="space-y-4 border-t pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nº Parcelas</Label>
                      <Input type="number" value={installmentsCount}
                        onChange={e => { setInstallmentsCount(e.target.value); setCustomInstallmentDates([]); }} min="2" />
                    </div>
                    <div className="space-y-2">
                      <Label>1ª Parcela</Label>
                      <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="cursor-pointer" htmlFor="equal-inst">Parcelas Iguais?</Label>
                    <input type="checkbox" id="equal-inst" checked={areInstallmentsEqual}
                      onChange={e => setAreInstallmentsEqual(e.target.checked)} className="w-4 h-4" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="cursor-pointer" htmlFor="fixed-pay">Data Fixa (Mensal)?</Label>
                    <input type="checkbox" id="fixed-pay" checked={fixedPaymentDay}
                      onChange={e => setFixedPaymentDay(e.target.checked)} className="w-4 h-4" />
                  </div>
                  {(!areInstallmentsEqual || !fixedPaymentDay) && (
                    <div className="space-y-2 max-h-40 overflow-y-auto p-2 border rounded-xl">
                      <Button type="button" size="sm" variant="outline" onClick={generateCustomInstallments} className="w-full mb-2">
                        Gerar Base para Edição
                      </Button>
                      {customInstallmentDates.map((inst, i) => (
                        <div key={i} className="flex gap-2">
                          <Input type="date" value={inst.date} onChange={e => {
                            const newArr = [...customInstallmentDates];
                            newArr[i].date = e.target.value;
                            setCustomInstallmentDates(newArr);
                          }} className="flex-1" />
                          <Input type="number" value={inst.amount} onChange={e => {
                            const newArr = [...customInstallmentDates];
                            newArr[i].amount = parseFloat(e.target.value);
                            setCustomInstallmentDates(newArr);
                          }} className="w-24" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Recorrente */}
              {activeTab === 'fixo' && (
                <div className="space-y-2">
                  <Label>Periodicidade</Label>
                  <select className="w-full h-10 rounded-md border border-input bg-background px-3 py-2"
                    value={recurrence} onChange={e => setRecurrence(e.target.value as any)}>
                    <option value="monthly">Mensal</option>
                    <option value="weekly">Semanal</option>
                  </select>
                  <p className="text-xs text-muted-foreground">O sistema lançará projeções automáticas para os 12 meses.</p>
                </div>
              )}

              {(activeTab === 'pontual' || activeTab === 'fixo') && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Data</Label>
                    <Input type="date" value={date} onChange={e => {
                      setDate(e.target.value);
                      setInvoiceReference(e.target.value.slice(0, 7));
                    }} />
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-2xl border-2 border-transparent hover:border-primary/20 transition-all cursor-pointer"
                    onClick={() => setIsAutomatic(!isAutomatic)}>
                    <input
                      type="checkbox"
                      checked={isAutomatic}
                      onChange={(e) => setIsAutomatic(e.target.checked)}
                      className="w-5 h-5 rounded-lg border-2 border-primary text-primary focus:ring-0 transition-all"
                    />
                    <div className="flex-1">
                      <Label className="text-sm font-bold cursor-pointer">Efetivar automaticamente na data</Label>
                      <p className="text-[10px] text-muted-foreground leading-tight">O sistema marcará como pago e atualizará o saldo assim que chegar o dia.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Forma de Pagamento */}
              <div className="space-y-2">
                <Label>{type === 'income' ? 'Onde será recebido?' : 'Forma de Pagamento'}</Label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setPaymentMethod('account')}
                    className={cn("flex-1 py-2.5 px-4 rounded-xl font-medium text-sm transition-all border",
                      paymentMethod === 'account' ? (type === 'income' ? "bg-success text-success-foreground border-success" : "bg-primary text-primary-foreground border-primary") : "bg-muted/50 border-transparent")}>
                    Conta
                  </button>
                  <button type="button" onClick={() => setPaymentMethod('card')}
                    className={cn("flex-1 py-2.5 px-4 rounded-xl font-medium text-sm transition-all border",
                      paymentMethod === 'card' ? (type === 'income' ? "bg-success text-success-foreground border-success" : "bg-primary text-primary-foreground border-primary") : "bg-muted/50 border-transparent")}>
                    Cartão
                  </button>
                </div>
              </div>

              {paymentMethod === 'account' && accounts.length > 0 && (
                <div className="space-y-2">
                  <Label>Conta</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {accounts.map(acc => (
                      <button key={acc.id} type="button" onClick={() => setAccountId(acc.id)}
                        className={cn("py-3 px-3 rounded-xl text-sm font-medium transition-all border flex items-center gap-2",
                          accountId === acc.id
                            ? (type === 'income' ? "bg-success text-secondary-foreground border-success shadow-sm" : "bg-primary text-primary-foreground border-primary shadow-sm")
                            : "bg-muted/50 border-transparent hover:bg-muted")}>
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: acc.color }} />
                        <span className="truncate">{acc.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {paymentMethod === 'card' && creditCards.length > 0 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Cartão</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {creditCards.map(card => (
                        <button key={card.id} type="button" onClick={() => setCardId(card.id)}
                          className={cn("py-2 px-3 rounded-xl text-sm font-medium transition-all border",
                            cardId === card.id
                              ? (type === 'income' ? "bg-success text-success-foreground border-success" : "bg-primary text-primary-foreground border-primary")
                              : "bg-muted/50 border-transparent hover:bg-muted")}>
                          {card.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Referência de fatura — apenas em edição */}
                  {initialData && (
                    <div className="space-y-2 p-3 bg-muted/50 rounded-xl border border-dashed text-sm">
                      <div className="flex items-center justify-between">
                        <Label>Referência da Fatura</Label>
                        <Input type="month" value={invoiceReference}
                          onChange={e => setInvoiceReference(e.target.value)}
                          className="w-32 h-8 text-xs bg-background" />
                      </div>
                      <p className="text-xs text-muted-foreground">O mês correspondente desta cobrança. Editar altera apenas este lançamento.</p>
                    </div>
                  )}
                </div>
              )}

              {debts.length > 0 && type === 'expense' && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <Label>Vincular a uma Dívida (Opcional)</Label>
                  <select className="w-full h-10 rounded-md border border-input bg-background px-3 py-2"
                    value={selectedDebtId} onChange={e => setSelectedDebtId(e.target.value)}>
                    <option value="">Selecione uma dívida...</option>
                    {debts.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} (Resta: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(d.remainingAmount)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {initialData?.installmentGroupId && (
                <div className="flex flex-col gap-2 p-3 bg-primary/5 rounded-xl border border-primary/20">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Alcance da Atualização / Exclusão</Label>
                  <select className="h-10 rounded-xl border border-input bg-background/50 px-3 text-xs focus:ring-1 focus:ring-primary outline-none"
                    value={applyScope} onChange={e => setApplyScope(e.target.value as any)}>
                    <option value="this">Somente esta parcela ({initialData.installmentNumber})</option>
                    <option value="future">Esta e as futuras (a partir de {initialData.installmentNumber})</option>
                    <option value="all">Todas as parcelas (1 até {initialData.installmentTotal})</option>
                  </select>
                </div>
              )}
            </>
          )}

          <Button type="submit" className={cn("w-full rounded-xl py-6 font-semibold",
            activeTab === 'divida' || activeTab === 'transfer' ? "bg-primary" :
            type === 'income' ? "bg-success hover:bg-success/90" : "bg-danger hover:bg-danger/90")}>
            {activeTab === 'divida' ? 'Criar Dívida e Parcelas' : activeTab === 'transfer' ? 'Confirmar Transferência' : 'Salvar Lançamento'}
          </Button>
        </form>
      </div>

      <OverdraftWarningDialog
        isOpen={showOverdraftWarning}
        accountName={overdraftAccountName}
        amountUsedFromLimit={overdraftAmountUsed}
        onCancel={() => {
          setShowOverdraftWarning(false);
          setPendingAmount(null);
        }}
        onConfirm={() => {
          setShowOverdraftWarning(false);
          // ✅ FIX: usa pendingAmount sem referência ao evento sintético
          if (pendingAmount !== null) {
            executeSubmit(pendingAmount);
            setPendingAmount(null);
          }
        }}
      />
    </div>
  );
}
