import { useState, useEffect } from 'react';
import { X, Calendar, CreditCard, RotateCw, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Transaction,
  Account,
  CreditCard as CreditCardType,
  Category,
  Subcategory,
  Debt
} from '@/types/finance';
import { cn } from '@/lib/utils';
import { useFinanceStore } from '@/hooks/useFinanceStore';

interface TransactionFormProps {
  accounts: Account[];
  creditCards: CreditCardType[];
  initialData?: Transaction;
  onSubmit: (transaction: Omit<Transaction, 'id'>, customInstallments?: { date: string, amount: number }[]) => void;
  onClose: () => void;
}

type TabType = 'pontual' | 'parcelamento' | 'fixo' | 'divida';

export function TransactionForm({ accounts, creditCards, initialData, onSubmit, onClose }: TransactionFormProps) {
  const [activeTab, setActiveTab] = useState<TabType>('pontual');
  const [type, setType] = useState<'income' | 'expense'>(initialData?.type || 'expense');

  // Common Fields
  const [description, setDescription] = useState(initialData?.description || '');
  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [categoryId, setCategoryId] = useState<string>(initialData?.categoryId || '');
  const [subcategoryId, setSubcategoryId] = useState<string>(initialData?.subcategoryId || '');
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState<string>(initialData?.accountId || '');
  const [cardId, setCardId] = useState<string>(initialData?.cardId || '');
  const [paymentMethod, setPaymentMethod] = useState<'account' | 'card'>(initialData?.cardId ? 'card' : 'account');
  const [selectedDebtId, setSelectedDebtId] = useState<string>(initialData?.debtId || '');

  // Installment Specifics
  const [installmentsCount, setInstallmentsCount] = useState('2');
  const [areInstallmentsEqual, setAreInstallmentsEqual] = useState(true);
  const [fixedPaymentDay, setFixedPaymentDay] = useState(true);
  const [customInstallmentDates, setCustomInstallmentDates] = useState<{ date: string, amount: number }[]>([]);

  // Fixed/Recurring Specifics
  const [recurrence, setRecurrence] = useState<'monthly' | 'weekly'>('monthly');

  // Debt Specifics
  const [debtTotal, setDebtTotal] = useState('');
  const [debtInstallments, setDebtInstallments] = useState('');
  const [debtFirstPaymentDate, setDebtFirstPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  // Invoice Specifics
  const [invoiceReference, setInvoiceReference] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  const { debts, createDebtWithInstallments, categories, subcategories } = useFinanceStore();

  const filteredCategories = categories.filter(c => c.type === type);
  const currentCategorySubcategories = subcategories.filter(s => s.categoryId === categoryId);

  // Helper to generate initial custom installments
  const generateCustomInstallments = () => {
    const count = parseInt(installmentsCount) || 2;
    const baseAmount = parseFloat(amount) || 0;
    const val = baseAmount / count;

    // Always regenerate to ensure sync with current amount/count
    const newInst = [];
    for (let i = 0; i < count; i++) {
      const d = new Date(date);
      d.setMonth(d.getMonth() + i);
      newInst.push({
        date: d.toISOString().split('T')[0],
        amount: parseFloat(val.toFixed(2))
      });
    }
    // Adjust last installment to match total exactly
    const currentSum = newInst.reduce((acc, curr) => acc + curr.amount, 0);
    const diff = baseAmount - currentSum;
    if (newInst.length > 0 && Math.abs(diff) > 0.001) {
      newInst[newInst.length - 1].amount += diff;
      newInst[newInst.length - 1].amount = parseFloat(newInst[newInst.length - 1].amount.toFixed(2));
    }

    setCustomInstallmentDates(newInst);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validations based on tabs
    if (activeTab === 'divida') {
      if (!description || !debtTotal || !debtInstallments) return;
      createDebtWithInstallments({
        name: description,
        totalAmount: parseFloat(debtTotal),
        remainingAmount: parseFloat(debtTotal), // Starts full
        monthlyPayment: parseFloat(debtTotal) / parseInt(debtInstallments),
        interestRateMonthly: 0, // Simplified for this view
        startDate: new Date().toISOString(),
        userId: '',
      }, debtFirstPaymentDate);
      onClose();
      return;
    }

    if (!description || !amount || !categoryId) return;

    let finalCustomInstallments = undefined;

    // Logic for Manual Installments
    if (activeTab === 'parcelamento') {
      if (!areInstallmentsEqual || !fixedPaymentDay) {
        // Use custom logic
        if (customInstallmentDates.length === 0) {
          // Should have been generated, but if not:
          const count = parseInt(installmentsCount) || 2;
          const baseAmount = parseFloat(amount) || 0;
          const val = baseAmount / count;
          const newInst = [];
          for (let i = 0; i < count; i++) {
            const d = new Date(date);
            d.setMonth(d.getMonth() + i);
            newInst.push({
              date: d.toISOString().split('T')[0],
              amount: val
            });
          }
          finalCustomInstallments = newInst;
        } else {
          finalCustomInstallments = customInstallmentDates;
        }
      }
    }

    onSubmit({
      type,
      transactionType: activeTab === 'parcelamento' ? 'installment' : activeTab === 'fixo' ? 'recurring' : 'punctual',
      description,
      amount: parseFloat(amount),
      categoryId,
      subcategoryId: subcategoryId || undefined,
      date,
      accountId: paymentMethod === 'account' ? accountId : undefined,
      cardId: paymentMethod === 'card' ? cardId : undefined,
      installmentTotal: activeTab === 'parcelamento' ? parseInt(installmentsCount) : undefined,
      isRecurring: activeTab === 'fixo',
      recurrence: activeTab === 'fixo' ? recurrence : undefined,
      debtId: selectedDebtId || undefined,
      invoiceMonthYear: (paymentMethod === 'card' && type === 'expense') ? invoiceReference : undefined,
      isPaid: new Date(date) <= new Date(),
      userId: initialData?.userId || '' // Will be handled by store
    }, finalCustomInstallments);

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm">
      <div className="bg-card rounded-3xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold">{initialData ? 'Editar Lançamento' : 'Novo Lançamento'}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex p-2 gap-1 border-b border-border overflow-x-auto">
          {[
            { id: 'pontual', label: 'Pontual', icon: Coins },
            { id: 'parcelamento', label: 'Parcelado', icon: CreditCard },
            { id: 'fixo', label: 'Fixo', icon: RotateCw },
            { id: 'divida', label: 'Dívida', icon: Calendar },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as TabType)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-1 overflow-y-auto">

          {/* Debt Tab Specifics */}
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
          ) : (
            <>
              {/* Type Toggle for Non-Debt */}
              <div className="flex gap-2 p-1 bg-muted rounded-2xl">
                <button
                  type="button"
                  onClick={() => { setType('income'); setCategoryId(''); setSubcategoryId(''); }}
                  className={cn(
                    "flex-1 py-2.5 px-4 rounded-xl font-medium text-sm transition-all",
                    type === 'income' ? "bg-success text-success-foreground shadow-sm" : "text-muted-foreground"
                  )}
                >
                  Receita
                </button>
                <button
                  type="button"
                  onClick={() => { setType('expense'); setCategoryId(''); setSubcategoryId(''); }}
                  className={cn(
                    "flex-1 py-2.5 px-4 rounded-xl font-medium text-sm transition-all",
                    type === 'expense' ? "bg-danger text-danger-foreground shadow-sm" : "text-muted-foreground"
                  )}
                >
                  Despesa
                </button>
              </div>

              {/* Standard Fields */}
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
                    // If manual installments active, reset them to force regen or update
                    if (activeTab === 'parcelamento' && !areInstallmentsEqual) setCustomInstallmentDates([]);
                  }}
                  placeholder="0.00"
                  className="text-lg font-semibold"
                  required
                />
              </div>

              {/* Category */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {filteredCategories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => { setCategoryId(cat.id); setSubcategoryId(''); }}
                        className={cn(
                          "py-2 px-3 rounded-xl text-xs font-medium transition-all border",
                          categoryId === cat.id
                            ? type === 'income' ? "bg-success text-success-foreground border-success" : "bg-danger text-danger-foreground border-danger"
                            : "bg-muted/50 border-transparent hover:bg-muted"
                        )}
                      >
                        {cat.name}
                      </button>
                    ))}
                    {filteredCategories.length === 0 && (
                      <p className="col-span-3 text-xs text-muted-foreground text-center py-2">
                        Nenhuma categoria cadastrada para {type === 'income' ? 'receitas' : 'despesas'}.
                      </p>
                    )}
                  </div>
                </div>

                {categoryId && currentCategorySubcategories.length > 0 && (
                  <div className="space-y-2">
                    <Label>Subcategoria</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {currentCategorySubcategories.map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => setSubcategoryId(sub.id)}
                          className={cn(
                            "py-2 px-3 rounded-xl text-xs font-medium transition-all border",
                            subcategoryId === sub.id
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted/50 border-transparent hover:bg-muted"
                          )}
                        >
                          {sub.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Tab Specific logic */}
              {activeTab === 'parcelamento' && (
                <div className="space-y-4 border-t pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nº Parcelas</Label>
                      <Input
                        type="number"
                        value={installmentsCount}
                        onChange={e => {
                          setInstallmentsCount(e.target.value);
                          setCustomInstallmentDates([]);
                        }}
                        min="2"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>1ª Parcela</Label>
                      <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="cursor-pointer" htmlFor="equal-inst">Parcelas Iguais?</Label>
                    <input type="checkbox" id="equal-inst" checked={areInstallmentsEqual} onChange={e => setAreInstallmentsEqual(e.target.checked)} className="w-4 h-4" />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="cursor-pointer" htmlFor="fixed-pay">Data Fixa (Mensal)?</Label>
                    <input type="checkbox" id="fixed-pay" checked={fixedPaymentDay} onChange={e => setFixedPaymentDay(e.target.checked)} className="w-4 h-4" />
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

              {activeTab === 'fixo' && (
                <div className="space-y-2">
                  <Label>Periodicidade</Label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2"
                    value={recurrence}
                    onChange={e => setRecurrence(e.target.value as any)}
                  >
                    <option value="monthly">Mensal</option>
                    <option value="weekly">Semanal</option>
                  </select>
                  <p className="text-xs text-muted-foreground">O sistema lançará projeções automáticas para os 12 meses.</p>
                </div>
              )}

              {(activeTab === 'pontual' || activeTab === 'fixo') && (
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={e => {
                      setDate(e.target.value);
                      // Auto-update invoice reference if simple change
                      setInvoiceReference(e.target.value.slice(0, 7));
                    }}
                  />
                </div>
              )}

              {/* Payment Method & Debt Link (Same as before) */}
              {type === 'expense' && (
                <>
                  <div className="space-y-2">
                    <Label>Forma de Pagamento</Label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('account')}
                        className={cn(
                          "flex-1 py-2.5 px-4 rounded-xl font-medium text-sm transition-all border",
                          paymentMethod === 'account' ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 border-transparent"
                        )}
                      >
                        Conta
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('card')}
                        className={cn(
                          "flex-1 py-2.5 px-4 rounded-xl font-medium text-sm transition-all border",
                          paymentMethod === 'card' ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 border-transparent"
                        )}
                      >
                        Cartão
                      </button>
                    </div>
                  </div>

                  {/* Payment Method Details */}
                  {paymentMethod === 'account' && accounts.length > 0 && (
                    <div className="space-y-2">
                      <Label>Conta</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {accounts.map((acc) => (
                          <button key={acc.id} type="button" onClick={() => setAccountId(acc.id)} className={cn("py-2 px-3 rounded-xl text-sm font-medium transition-all border", accountId === acc.id ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 border-transparent hover:bg-muted")}>{acc.name}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'card' && creditCards.length > 0 && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Cartão</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {creditCards.map((card) => (
                            <button key={card.id} type="button" onClick={() => setCardId(card.id)} className={cn("py-2 px-3 rounded-xl text-sm font-medium transition-all border", cardId === card.id ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 border-transparent hover:bg-muted")}>{card.name}</button>
                          ))}
                        </div>
                      </div>

                      {/* Invoice Reference Toggle */}
                      <div className="space-y-2 p-3 bg-muted/50 rounded-xl border border-dashed text-sm">
                        <div className="flex items-center justify-between">
                          <Label>Referência da Fatura</Label>
                          <Input
                            type="month"
                            value={invoiceReference}
                            onChange={e => setInvoiceReference(e.target.value)}
                            className="w-32 h-8 text-xs bg-background"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">O sistema agrupa gastos por esta data. Altere se o fechamento mudar.</p>
                      </div>
                    </div>
                  )}

                  {debts.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-border">
                      <Label>Vincular a uma Dívida (Opcional)</Label>
                      <select className="w-full h-10 rounded-md border border-input bg-background px-3 py-2" value={selectedDebtId} onChange={e => setSelectedDebtId(e.target.value)}>
                        <option value="">Selecione uma dívida...</option>
                        {debts.map(d => <option key={d.id} value={d.id}>{d.name} (Resta: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(d.remainingAmount)})</option>)}
                      </select>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          <Button type="submit" className={cn("w-full rounded-xl py-6 font-semibold", activeTab === 'divida' ? "bg-primary" : type === 'income' ? "bg-success hover:bg-success/90" : "bg-danger hover:bg-danger/90")}>
            {activeTab === 'divida' ? 'Criar Dívida e Parcelas' : 'Salvar Lançamento'}
          </Button>

        </form>
      </div>
    </div>
  );
}
