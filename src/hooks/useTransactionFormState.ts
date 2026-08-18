// Extraído de src/components/transactions/TransactionForm.tsx (organização de
// arquivo, sem mudança de comportamento). Concentra todo o estado, os efeitos
// e a lógica de submissão do formulário de lançamento — o componente fica
// responsável só pelo JSX, consumindo o que este hook devolve.
import { useState, useEffect, useMemo } from 'react';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Transaction, Account, CreditCard as CreditCardType } from '@/types/finance';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { formatCurrency } from '@/utils/formatters';
import { toast } from '@/components/ui/use-toast';
import { parseLocalDate, todayLocalString } from '@/utils/dateUtils';
import { calcInvoiceMonthYearForCard } from '@/utils/creditCardUtils';

export type TabType = 'pontual' | 'parcelamento' | 'fixo' | 'transfer' | 'renda_fixa';
export type Step = 'SELECT_TYPE' | 'SELECT_SUBTYPE' | 'DETAILS';

export const isDateTodayOrPast = (dateStr: string): boolean => {
  const d = parseLocalDate(dateStr);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return d <= today;
};

export const stripTransferDirection = (description?: string) =>
  String(description || '').replace(/^\[(Saída|Saida|Entrada)\]\s*/i, '').trim();

export const addMonthsToInvoiceMonthYear = (invoiceMonthYear: string, monthsToAdd: number): string => {
  if (!invoiceMonthYear) return '';
  const parts = invoiceMonthYear.split('-');
  const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1 + monthsToAdd, 1);
  return format(date, 'yyyy-MM');
};

interface UseTransactionFormStateParams {
  accounts: Account[];
  creditCards: CreditCardType[];
  initialData?: Transaction;
  onSubmit: (transaction: Omit<Transaction, 'id'> & { cardClosingDay?: number, cardDueDay?: number }, customInstallments?: { date: string, amount: number }[], applyScope?: 'this' | 'future' | 'all') => void;
  onClose: () => void;
  initialTab?: TabType;
}

export function useTransactionFormState({ accounts, creditCards, initialData, onSubmit, onClose, initialTab }: UseTransactionFormStateParams) {
  const isTransferEdit = Boolean(initialData?.isTransfer || (initialData as any)?.transferGroupId || (initialData as any)?.transfer_group_id);
  const transferCounterpart = (initialData as any)?.transferCounterpart as Transaction | undefined;
  const initialTransferFrom = isTransferEdit
    ? (initialData?.type === 'expense' ? (initialData.accountId || initialData.cardId) : (transferCounterpart?.accountId || transferCounterpart?.cardId)) || ''
    : '';
  const initialTransferTarget = isTransferEdit
    ? (initialData?.type === 'income'
      ? (initialData.accountId || initialData.cardId)
      : (transferCounterpart?.accountId || transferCounterpart?.cardId)) || ''
    : '';
  const initialTransferToType = isTransferEdit && (
    (initialData?.type === 'income' && initialData.cardId) ||
    (initialData?.type === 'expense' && transferCounterpart?.cardId)
  ) ? 'card' : 'account';
  const initialTransferFromType = isTransferEdit && (
    (initialData?.type === 'expense' && initialData.cardId) ||
    (initialData?.type === 'income' && transferCounterpart?.cardId)
  ) ? 'card' : 'account';

  // Wizard State
  const [step, setStep] = useState<Step>(initialData || initialTab ? 'DETAILS' : 'SELECT_TYPE');
  const [activeTab, setActiveTab] = useState<TabType>(isTransferEdit ? 'transfer' : (initialTab || 'pontual'));
  const [type, setType] = useState<'income' | 'expense'>(initialData?.type || 'expense');

  // Form Fields
  const [description, setDescription] = useState(initialData?.description || '');
  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [categoryId, setCategoryId] = useState<string>(initialData?.categoryId || '');
  const [subcategoryId, setSubcategoryId] = useState<string>(initialData?.subcategoryId || (initialData as any)?.subcategory_id || '');
  const [date, setDate] = useState(initialData?.date || todayLocalString());
  const [accountId, setAccountId] = useState<string>(initialData?.accountId || '');
  const [cardId, setCardId] = useState<string>(initialData?.cardId || '');
  const [paymentMethod, setPaymentMethod] = useState<'account' | 'card' | 'boleto' | 'carne'>(initialData?.cardId ? 'card' : 'account');
  const [sourceAccountId, setSourceAccountId] = useState<string>('');

  // Installments / Recurrence
  const [installmentsCount, setInstallmentsCount] = useState('2');
  const [areInstallmentsEqual, setAreInstallmentsEqual] = useState(true);
  const [fixedPaymentDay, setFixedPaymentDay] = useState(true);
  const [customInstallmentDates, setCustomInstallmentDates] = useState<{ date: string, amount: number }[]>([]);
  const [recurrence, setRecurrence] = useState<'monthly' | 'weekly'>('monthly');

  // Transfer Specific
  const [transferFrom, setTransferFrom] = useState(initialTransferFrom);
  const [transferFromType, setTransferFromType] = useState<'account' | 'card'>(initialTransferFromType);
  const [transferTo, setTransferTo] = useState(initialTransferTarget);
  const [transferToType, setTransferToType] = useState<'account' | 'card'>(initialTransferToType);
  const [transferDescription, setTransferDescription] = useState(
    isTransferEdit ? stripTransferDirection(initialData?.description) : 'Transferência entre contas'
  );

  // Custom Invoice Selection
  const [invoiceMode, setInvoiceMode] = useState<'auto' | 'custom'>(
    initialData?.invoiceMonthYear ? 'custom' : 'auto'
  );
  const [selectedInvoiceMonthYear, setSelectedInvoiceMonthYear] = useState<string>(
    initialData?.invoiceMonthYear || ''
  );

  // Custom Invoice for Transfers (From / To)
  const hasInitialFromInvoice = isTransferEdit && (
    (initialData?.type === 'expense' && initialData.invoiceMonthYear) ||
    (initialData?.type === 'income' && transferCounterpart?.invoiceMonthYear)
  );
  const initialFromInvoiceVal = isTransferEdit
    ? (initialData?.type === 'expense' ? initialData.invoiceMonthYear : transferCounterpart?.invoiceMonthYear)
    : '';
  const [transferFromInvoiceMode, setTransferFromInvoiceMode] = useState<'auto' | 'custom'>(
    hasInitialFromInvoice ? 'custom' : 'auto'
  );
  const [transferFromInvoiceMonthYear, setTransferFromInvoiceMonthYear] = useState<string>(
    initialFromInvoiceVal || ''
  );

  const hasInitialToInvoice = isTransferEdit && (
    (initialData?.type === 'income' && initialData.invoiceMonthYear) ||
    (initialData?.type === 'expense' && transferCounterpart?.invoiceMonthYear)
  );
  const initialToInvoiceVal = isTransferEdit
    ? (initialData?.type === 'income' ? initialData.invoiceMonthYear : transferCounterpart?.invoiceMonthYear)
    : '';
  const [transferToInvoiceMode, setTransferToInvoiceMode] = useState<'auto' | 'custom'>(
    hasInitialToInvoice ? 'custom' : 'auto'
  );
  const [transferToInvoiceMonthYear, setTransferToInvoiceMonthYear] = useState<string>(
    initialToInvoiceVal || ''
  );

  const invoiceOptions = useMemo(() => {
    const baseDate = date ? parseLocalDate(date) : new Date();
    const options = [];
    for (let i = -2; i <= 6; i++) {
      const d = addMonths(baseDate, i);
      const val = format(d, 'yyyy-MM');
      const label = format(d, 'MMMM yyyy', { locale: ptBR }).replace(/^\w/, (c) => c.toUpperCase());
      options.push({ value: val, label });
    }
    return options;
  }, [date]);

  useEffect(() => {
    if (date && creditCards.length > 0 && cardId) {
      if (invoiceMode === 'auto') {
        const card = creditCards.find(c => c.id === cardId);
        if (card) {
          setSelectedInvoiceMonthYear(calcInvoiceMonthYearForCard(parseLocalDate(date), card));
        }
      }
    }
  }, [date, cardId, creditCards, invoiceMode]);

  useEffect(() => {
    if (date && creditCards.length > 0 && transferFrom && transferFromType === 'card') {
      if (transferFromInvoiceMode === 'auto') {
        const card = creditCards.find(c => c.id === transferFrom);
        if (card) {
          setTransferFromInvoiceMonthYear(calcInvoiceMonthYearForCard(parseLocalDate(date), card));
        }
      }
    }
  }, [date, transferFrom, transferFromType, creditCards, transferFromInvoiceMode]);

  useEffect(() => {
    if (date && creditCards.length > 0 && transferTo && transferToType === 'card') {
      if (transferToInvoiceMode === 'auto') {
        const card = creditCards.find(c => c.id === transferTo);
        if (card) {
          setTransferToInvoiceMonthYear(calcInvoiceMonthYearForCard(parseLocalDate(date), card));
        }
      }
    }
  }, [date, transferTo, transferToType, creditCards, transferToInvoiceMode]);

  const isCardInstallmentEdit = Boolean(
    initialData?.cardId &&
    initialData?.installmentGroupId &&
    initialData?.transactionType === 'installment' &&
    !initialData?.debtId &&
    !initialData?.isInvoicePayment
  );

  const [applyScope, setApplyScope] = useState<'this' | 'future' | 'all'>(
    isCardInstallmentEdit ? 'all' : 'this'
  );
  const [isPaidLocally, setIsPaidLocally] = useState(initialData?.isPaid || false);

  const [showOverdraftWarning, setShowOverdraftWarning] = useState(false);
  const [overdraftAmountUsed, setOverdraftAmountUsed] = useState(0);
  const [overdraftAccountName, setOverdraftAccountName] = useState('');
  const [pendingAmount, setPendingAmount] = useState<number | null>(null);

  const {
    categories,
    subcategories,
    transferBetweenAccounts,
    deleteTransaction,
    getAccountViewBalance,
    getCardExpenses,
    isAddingTransaction,
    isUpdatingTransaction,
    isTransferring
  } = useFinanceStore();

  const isPending = isAddingTransaction || isUpdatingTransaction || isTransferring;

  const [openCategory, setOpenCategory] = useState(false);
  const [openSubcategory, setOpenSubcategory] = useState(false);

  const selectedCategory = categories.find(c => c.id === categoryId);
  const isAbatementCategory = !!selectedCategory?.name.toLowerCase().includes('abatimento');
  // Categoria "Abatimento no Cartão" pré-configurada pra todo usuário (migration
  // 0048). Usada pra oferecer o atalho direto no passo 2 sem o usuário precisar
  // achar/criar a categoria na mão — ela já vem com o nome certo, então toda a
  // lógica existente de isAbatementCategory (seletor de cartão, conta de origem
  // obrigatória) funciona sem precisar de nenhum TabType novo.
  const abatementCategory = categories.find(
    c => c.type === 'expense' && c.name.toLowerCase().includes('abatimento')
  );
  const filteredCategories = categories.filter(c => c.type === type);
  const currentCategorySubcategories = subcategories.filter(s => s.categoryId === categoryId);

  useEffect(() => {
    if (initialData) {
      if (initialData.isTransfer) {
        const counterpart = (initialData as any).transferCounterpart as Transaction | undefined;
        setActiveTab('transfer');
        setTransferFrom(
          (initialData.type === 'expense' ? initialData.accountId : counterpart?.accountId) || ''
        );
        setTransferTo(
          (initialData.type === 'income'
            ? (initialData.accountId || initialData.cardId)
            : (counterpart?.accountId || counterpart?.cardId)) || ''
        );
        setTransferToType(
          ((initialData.type === 'income' && initialData.cardId) || (initialData.type === 'expense' && counterpart?.cardId))
            ? 'card'
            : 'account'
        );
        setTransferDescription(stripTransferDirection(initialData.description));
      } else if (initialData.transactionType === 'recurring' || initialData.isRecurring || (initialData as any).is_recurring) {
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

  useEffect(() => {
    if (isCardInstallmentEdit) {
      setApplyScope('all');
    }
  }, [isCardInstallmentEdit]);

  useEffect(() => {
    if (categoryId) {
      const cat = categories.find(c => c.id === categoryId);
      if (cat?.name.toLowerCase().includes('abatimento')) {
        setPaymentMethod('card');
      }
    }
  }, [categoryId, categories]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isPending) return;

    if (activeTab === 'transfer') {
      const errors: string[] = [];
      if (!transferFrom) errors.push('Conta/Cartão de Origem');
      if (!transferTo) errors.push('Conta/Cartão de Destino');
      if (!transferDescription) errors.push('Descrição');
      if (!amount || parseFloat(String(amount)) <= 0) {
        toast({
          title: "Valor inválido",
          description: "O valor da transação deve ser maior que zero.",
          variant: "destructive",
        });
        return;
      }

      if (errors.length > 0) {
        toast({ title: 'Campos obrigatórios', description: `Preencha: ${errors.join(', ')}`, variant: 'destructive' });
        return;
      }

      if (transferFrom === transferTo && transferFromType === transferToType) {
        toast({ title: 'Origem e destino não podem ser iguais', variant: 'destructive' });
        return;
      }

      let invoiceMonthYear;
      if (transferToType === 'card') {
        if (transferToInvoiceMode === 'custom' && transferToInvoiceMonthYear) {
          invoiceMonthYear = transferToInvoiceMonthYear;
        } else {
          const selectedCard = creditCards.find(c => c.id === transferTo);
          if (selectedCard) {
            invoiceMonthYear = calcInvoiceMonthYearForCard(parseLocalDate(date), selectedCard);
          }
        }
      }

      let fromInvoiceMonthYear;
      if (transferFromType === 'card') {
        if (transferFromInvoiceMode === 'custom' && transferFromInvoiceMonthYear) {
          fromInvoiceMonthYear = transferFromInvoiceMonthYear;
        } else {
          const selectedCard = creditCards.find(c => c.id === transferFrom);
          if (selectedCard) {
            fromInvoiceMonthYear = calcInvoiceMonthYearForCard(parseLocalDate(date), selectedCard);
          }
        }
      }

      const isTransferFromAccount = transferFromType === 'account';

      if (isTransferEdit) {
        await onSubmit({
          type: 'expense',
          transactionType: 'punctual',
          description: transferDescription,
          transferDescription,
          amount: parseFloat(amount),
          date,
          accountId: isTransferFromAccount ? transferFrom : null,
          cardId: !isTransferFromAccount ? transferFrom : null,
          transferFrom,
          transferFromType,
          transferTo,
          transferToType,
          invoiceMonthYear: transferToType === 'card' ? invoiceMonthYear : null,
          fromInvoiceMonthYear: !isTransferFromAccount ? fromInvoiceMonthYear : null,
          isPaid: isTransferFromAccount,
          paymentDate: isTransferFromAccount ? date : null,
          isTransfer: isTransferFromAccount,
          transferGroupId: initialData.transferGroupId || (initialData as any).transfer_group_id || null,
        } as any, undefined, 'this');
        onClose();
        return;
      }

      await transferBetweenAccounts(
        transferFrom,
        transferTo,
        parseFloat(amount),
        transferDescription,
        date,
        transferToType,
        invoiceMonthYear,
        transferFromType,
        fromInvoiceMonthYear
      );
      onClose();
      return;
    }

    const errors: string[] = [];
    if (!description) errors.push('Descrição');
    if (!amount || parseFloat(String(amount)) <= 0) {
      toast({
        title: "Valor inválido",
        description: "O valor da transação deve ser maior que zero.",
        variant: "destructive",
      });
      return;
    }
    if (activeTab !== 'renda_fixa' && !categoryId) errors.push('Categoria');

    const isRecurringTab = activeTab === 'fixo' || activeTab === 'renda_fixa';
    if (!isRecurringTab && paymentMethod === 'account' && !accountId) errors.push('Conta');
    if (!isRecurringTab && paymentMethod === 'card' && !cardId) errors.push('Cartão');
    if (!isRecurringTab && paymentMethod === 'card' && isAbatementCategory && !sourceAccountId) errors.push('Conta de Origem');

    if (errors.length > 0) {
      toast({
        title: 'Campos obrigatórios',
        description: `Preencha: ${errors.join(', ')}`,
        variant: 'destructive'
      });
      return;
    }

    if (paymentMethod === 'card' && sourceAccountId && (type === 'income' || (type === 'expense' && isAbatementCategory))) {
      if (initialData?.id && !initialData.isTransfer && !(initialData as any).transfer_group_id) {
        await deleteTransaction(initialData, 'this');
      }

      const selectedCard = creditCards.find(c => c.id === cardId);
      const invoiceMonthYear = selectedCard
        ? (invoiceMode === 'custom' && selectedInvoiceMonthYear
          ? selectedInvoiceMonthYear
          : calcInvoiceMonthYearForCard(parseLocalDate(date), selectedCard))
        : '';

      await transferBetweenAccounts(
        sourceAccountId,
        cardId,
        parseFloat(amount),
        description,
        date,
        'card',
        invoiceMonthYear || undefined,
        'account',
        undefined,
        categoryId,
        categoryId
      );
      onClose();
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

  const executeSubmit = async (parsedAmount: number, finalCategoryId?: string) => {
    let isPaid = false;
    if (initialData) {
      isPaid = isPaidLocally;
    } else if (activeTab === 'pontual') {
      isPaid = isDateTodayOrPast(date);
    }
    const selectedCard = creditCards.find(c => c.id === (paymentMethod === 'card' ? cardId : ''));
    const finalInvoiceMonthYear = (paymentMethod === 'card' && selectedCard)
      ? (invoiceMode === 'custom' && selectedInvoiceMonthYear
          ? selectedInvoiceMonthYear
          : calcInvoiceMonthYearForCard(parseLocalDate(date), selectedCard))
      : undefined;

    // --- LÓGICA DE PARCELAMENTO (BULK) ---
    if (activeTab === 'parcelamento' && !initialData) {
      const count = parseInt(installmentsCount) || 2;
      const groupId = crypto.randomUUID();
      const baseDate = parseLocalDate(date);
      const installmentList: any[] = [];

      const isBoletoOrCarne = paymentMethod === 'boleto' || paymentMethod === 'carne';

      if (!areInstallmentsEqual) {
        const totalCustom = customInstallmentDates.reduce((s, x) => s + x.amount, 0);
        if (Math.abs(totalCustom - parsedAmount) > 0.10) {
          toast({ title: 'Valores não batem', description: `Total das parcelas (${formatCurrency(totalCustom)}) difere do valor total (${formatCurrency(parsedAmount)}).`, variant: 'destructive' });
          return;
        }
      }

      for (let i = 0; i < count; i++) {
        const currentInstDate = (!areInstallmentsEqual && customInstallmentDates[i])
          ? parseLocalDate(customInstallmentDates[i].date)
          : addMonths(baseDate, i);
        const dateStr = format(currentInstDate, 'yyyy-MM-dd');

        // Se for cartão, consideramos pago (já que o limite é consumido)
        // Se for boleto/carne, a despesa é criada como NÃO paga (para aparecer no Gerenciador de Contas)
        // Se for conta, marcamos como pago apenas se a data for hoje ou passada
        const instIsPaid = paymentMethod === 'card'
          ? true
          : (isBoletoOrCarne ? false : isDateTodayOrPast(dateStr));

        const invoiceMonthYear = (paymentMethod === 'card' && selectedCard)
          ? (invoiceMode === 'custom' && selectedInvoiceMonthYear
              ? addMonthsToInvoiceMonthYear(selectedInvoiceMonthYear, i)
              : calcInvoiceMonthYearForCard(currentInstDate, selectedCard))
          : undefined;

        let descStr = `${description} (${i + 1}/${count})`;
        if (paymentMethod === 'boleto') {
          descStr = `[Boleto] ${description} (${i + 1}/${count})`;
        } else if (paymentMethod === 'carne') {
          descStr = `[Carnê] ${description} (${i + 1}/${count})`;
        }

        installmentList.push({
          type,
          transactionType: 'installment',
          description: descStr,
          amount: !areInstallmentsEqual && customInstallmentDates[i]
            ? customInstallmentDates[i].amount
            : parseFloat((parsedAmount / count).toFixed(2)),
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

      // Ajuste de dízima na última parcela (apenas se forem iguais)
      if (areInstallmentsEqual) {
        const totalGenerated = installmentList.reduce((sum, inst) => sum + inst.amount, 0);
        const diff = parseFloat((parsedAmount - totalGenerated).toFixed(2));
        if (!Number.isNaN(diff) && Math.abs(diff) > 0.001) {
          installmentList[count - 1].amount = parseFloat((installmentList[count - 1].amount + diff).toFixed(2));
        }
      }

      await onSubmit(installmentList as any, undefined, applyScope);
      onClose();
      return;
    }

    // --- LÓGICA PONTUAL OU RECORRENTE ---
    const isPaidFinal = initialData ? isPaidLocally : (activeTab === 'pontual' ? isDateTodayOrPast(date) : false);
    const isRecurring = Boolean(activeTab === 'fixo' || activeTab === 'renda_fixa');
    const isInstallment = Boolean(activeTab === 'parcelamento');

    await onSubmit({
      type,
      transactionType: isRecurring ? 'recurring' : (isInstallment ? 'installment' : 'punctual'),
      description,
      amount: parsedAmount,
      categoryId: finalCategoryId || categoryId,
      subcategoryId: subcategoryId || null,
      isRecurring,
      date: format(parseLocalDate(date), 'yyyy-MM-dd'),
      accountId: isRecurring ? null : (paymentMethod === 'account' ? accountId : undefined),
      cardId: isRecurring ? null : (paymentMethod === 'card' ? cardId : undefined),
      installmentGroupId: initialData?.installmentGroupId,
      installmentNumber: isInstallment ? initialData?.installmentNumber : undefined,
      installmentTotal: isInstallment ? (initialData?.installmentTotal || (parseInt(installmentsCount) || undefined)) : undefined,
      recurrence: isRecurring ? recurrence : undefined,
      isAutomatic: activeTab === 'renda_fixa' ? true : ((initialData as any)?.isAutomatic || false),
      debtId: initialData?.debtId || undefined,
      invoiceMonthYear: paymentMethod === 'card' ? finalInvoiceMonthYear : undefined,
      isPaid: isPaidFinal,
      paymentDate: isPaidFinal ? date : undefined
    } as any, undefined, applyScope);

    onClose();
  };

  return {
    // Wizard
    step, setStep,
    activeTab, setActiveTab,
    type, setType,
    isTransferEdit,
    isCardInstallmentEdit,

    // Form fields
    description, setDescription,
    amount, setAmount,
    categoryId, setCategoryId,
    subcategoryId, setSubcategoryId,
    date, setDate,
    accountId, setAccountId,
    cardId, setCardId,
    paymentMethod, setPaymentMethod,
    sourceAccountId, setSourceAccountId,

    // Installments / Recurrence
    installmentsCount, setInstallmentsCount,
    areInstallmentsEqual, setAreInstallmentsEqual,
    fixedPaymentDay, setFixedPaymentDay,
    customInstallmentDates, setCustomInstallmentDates,

    // Transfer
    transferFrom, setTransferFrom,
    transferFromType, setTransferFromType,
    transferTo, setTransferTo,
    transferToType, setTransferToType,
    transferDescription, setTransferDescription,

    // Invoice
    invoiceMode, setInvoiceMode,
    selectedInvoiceMonthYear, setSelectedInvoiceMonthYear,
    transferFromInvoiceMode, setTransferFromInvoiceMode,
    transferFromInvoiceMonthYear, setTransferFromInvoiceMonthYear,
    transferToInvoiceMode, setTransferToInvoiceMode,
    transferToInvoiceMonthYear, setTransferToInvoiceMonthYear,
    invoiceOptions,

    // Scope / status
    applyScope, setApplyScope,
    showOverdraftWarning, setShowOverdraftWarning,
    overdraftAmountUsed,
    overdraftAccountName,
    pendingAmount, setPendingAmount,

    // Category combobox
    openCategory, setOpenCategory,
    openSubcategory, setOpenSubcategory,
    isAbatementCategory,
    abatementCategory,
    filteredCategories,
    currentCategorySubcategories,

    // Store passthroughs usados direto no JSX
    getAccountViewBalance,
    getCardExpenses,
    isPending,

    // Submit
    handleSubmit,
    executeSubmit,
  };
}
