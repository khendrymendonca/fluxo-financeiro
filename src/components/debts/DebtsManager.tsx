import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { TrendingDown, Plus, Trash2, X, AlertTriangle, Edit2 } from 'lucide-react';
import { useRenegotiateDebt } from '@/hooks/useDebtMutations';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';
import { Debt } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { parseLocalDate } from '@/utils/dateUtils';
import {
  calculateAgreementRemaining,
  calculateAgreementTotal,
  getAgreementEntryState,
  isAgreementEntryTransaction,
} from '@/utils/debtAgreement';

interface DebtsManagerProps {
  debts: Debt[];
  onAddDebt: (debt: Omit<Debt, 'id' | 'userId'>) => Promise<unknown> | unknown;
  onUpdateDebt: (id: string, updates: Partial<Debt>) => Promise<unknown> | unknown;
  onDeleteDebt: (id: string) => Promise<unknown> | unknown;
}

export function DebtsManager({
  debts,
  onAddDebt,
  onUpdateDebt,
  onDeleteDebt,
}: DebtsManagerProps) {
  const createEmptyAgreementForm = () => ({
    name: '',
    installmentAmount: '',
    totalInstallments: '',
    dueDay: '',
    hasEntry: false,
    entryAmount: '',
    entryDate: '',
    entryIsPaid: false,
    entryAccountId: '',
    firstInstallmentDate: '',
  });

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState(createEmptyAgreementForm().name);
  const [installmentAmount, setInstallmentAmount] = useState(createEmptyAgreementForm().installmentAmount);
  const [totalInstallments, setTotalInstallments] = useState(createEmptyAgreementForm().totalInstallments);
  const [dueDay, setDueDay] = useState(createEmptyAgreementForm().dueDay);
  const [hasEntry, setHasEntry] = useState(createEmptyAgreementForm().hasEntry);
  const [entryAmount, setEntryAmount] = useState(createEmptyAgreementForm().entryAmount);
  const [entryDate, setEntryDate] = useState(createEmptyAgreementForm().entryDate);
  const [entryIsPaid, setEntryIsPaid] = useState(createEmptyAgreementForm().entryIsPaid);
  const [entryAccountId, setEntryAccountId] = useState(createEmptyAgreementForm().entryAccountId);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [firstInstallmentDate, setFirstInstallmentDate] = useState(createEmptyAgreementForm().firstInstallmentDate);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { mutateAsync: renegotiateDebt } = useRenegotiateDebt();
  const { transactions, accounts } = useFinanceStore();
  const canUseUnlimitedDebts = useFeatureFlag('unlimited_debts');
  const freeDebtsLimit = 3;
  const hasReachedDebtsLimit = !canUseUnlimitedDebts && debts.length >= freeDebtsLimit;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const resetFormState = () => {
    const emptyForm = createEmptyAgreementForm();
    setName(emptyForm.name);
    setInstallmentAmount(emptyForm.installmentAmount);
    setTotalInstallments(emptyForm.totalInstallments);
    setDueDay(emptyForm.dueDay);
    setHasEntry(emptyForm.hasEntry);
    setEntryAmount(emptyForm.entryAmount);
    setEntryDate(emptyForm.entryDate);
    setEntryIsPaid(emptyForm.entryIsPaid);
    setEntryAccountId(emptyForm.entryAccountId);
    setFirstInstallmentDate(emptyForm.firstInstallmentDate);
    setEditingDebt(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!name || !installmentAmount || !totalInstallments) return;

    const parsedInstallmentAmount = parseFloat(installmentAmount);
    const parsedTotalInstallments = parseInt(totalInstallments, 10);
    const parsedEntryAmount = hasEntry ? parseFloat(entryAmount || '0') : 0;

    if (!Number.isFinite(parsedInstallmentAmount) || parsedInstallmentAmount <= 0) {
      toast({ title: 'Informe um valor de parcela maior que zero.', variant: 'destructive' });
      return;
    }

    if (!Number.isFinite(parsedTotalInstallments) || parsedTotalInstallments <= 0) {
      toast({ title: 'Informe uma quantidade de parcelas maior que zero.', variant: 'destructive' });
      return;
    }

    if (hasEntry) {
      if (!Number.isFinite(parsedEntryAmount) || parsedEntryAmount <= 0) {
        toast({ title: 'Informe um valor de entrada maior que zero.', variant: 'destructive' });
        return;
      }

      if (!entryDate) {
        toast({ title: 'Informe a data da entrada.', variant: 'destructive' });
        return;
      }

      if (entryIsPaid && !entryAccountId) {
        toast({ title: 'Selecione a conta da entrada paga.', variant: 'destructive' });
        return;
      }
    }

    const computedTotalAmount = calculateAgreementTotal(parsedEntryAmount, parsedInstallmentAmount, parsedTotalInstallments);
    const computedRemainingAmount = calculateAgreementRemaining(
      parsedEntryAmount,
      parsedInstallmentAmount,
      parsedTotalInstallments,
      hasEntry && entryIsPaid,
    );

    const debtData: Omit<Debt, 'id' | 'userId'> = {
      name,
      totalAmount: computedTotalAmount,
      remainingAmount: computedRemainingAmount,
      installmentAmount: parsedInstallmentAmount,
      interestRateMonthly: editingDebt?.interestRateMonthly || 0,
      totalInstallments: parsedTotalInstallments,
      dueDay: parseInt(dueDay, 10) || undefined,
      status: editingDebt?.status || 'renegotiated',
      startDate: firstInstallmentDate,
      debtType: editingDebt?.debtType || 'agreement',
      entryAmount: parsedEntryAmount,
      entryDate: hasEntry ? entryDate : undefined,
      entryIsPaid: hasEntry ? entryIsPaid : false,
      entryAccountId: hasEntry && entryIsPaid ? entryAccountId : undefined,
    };

    try {
      setIsSubmitting(true);
      if (editingDebt) {
        await onUpdateDebt(editingDebt.id, debtData);
      } else {
        if (hasReachedDebtsLimit) {
          toast({
            title: 'Limite do plano Free atingido',
            description: 'Você pode cadastrar até 3 dívidas/acordos no plano Free. Para adicionar mais, libere dívidas ilimitadas.',
          });
          return;
        }

        await onAddDebt(debtData);
      }

      handleCloseForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (debt: Debt) => {
    const existingEntry = transactions.find((tx) => isAgreementEntryTransaction(tx, debt.id));
    const entryState = getAgreementEntryState({
      entryAmount: existingEntry?.amount,
      entryDate: existingEntry?.date,
      entryAccountId: existingEntry?.accountId,
      entryIsPaid: existingEntry?.isPaid,
    });

    setEditingDebt(debt);
    setName(debt.name);
    setInstallmentAmount(debt.installmentAmount.toString());
    setTotalInstallments(debt.totalInstallments?.toString() || '1');
    setDueDay(debt.dueDay?.toString() || '');
    setHasEntry(entryState.hasEntry);
    setEntryAmount(entryState.hasEntry ? entryState.entryAmount.toString() : '');
    setEntryDate(entryState.entryDate || '');
    setEntryIsPaid(entryState.hasEntry ? entryState.entryIsPaid : false);
    setEntryAccountId(entryState.entryAccountId);
    setFirstInstallmentDate(debt.startDate ? format(parseLocalDate(debt.startDate), 'yyyy-MM-dd') : '');
    setShowForm(true);
  };

  const handleCloseForm = () => {
    resetFormState();
    setShowForm(false);
  };

  const openAddDebtForm = () => {
    if (hasReachedDebtsLimit) {
      toast({
        title: 'Limite do plano Free atingido',
        description: 'Você pode cadastrar até 3 dívidas/acordos no plano Free. Para adicionar mais, libere dívidas ilimitadas.',
      });
      return;
    }

    resetFormState();
    setShowForm(true);
  };

  const debtSummaries = useMemo(() => {
    return debts.reduce<Record<string, {
      totalAmount: number;
      remainingAmount: number;
      paidAmount: number;
      totalInstallments: number;
      paidInstallments: number;
      pendingInstallments: number;
      currentInstallment: number;
      hasDerivedInstallments: boolean;
    }>>((acc, debt) => {
      const debtTransactions = transactions
        .filter((tx) => !tx.isVirtual && tx.debtId === debt.id && !tx.deleted_at);
      const installments = debtTransactions
        .filter((tx) => !isAgreementEntryTransaction(tx, debt.id))
        .sort((a, b) => {
          const aOrder = a.installmentNumber ?? Number.MAX_SAFE_INTEGER;
          const bOrder = b.installmentNumber ?? Number.MAX_SAFE_INTEGER;
          return aOrder - bOrder;
        });

      const paidInstallments = installments.filter((tx) => tx.isPaid);
      const pendingInstallments = installments.filter((tx) => !tx.isPaid);
      const hasDerivedInstallments = installments.length > 0;

      const totalAmount = hasDerivedInstallments
        ? debtTransactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
        : Number(debt.totalAmount) || 0;
      const remainingAmount = hasDerivedInstallments
        ? debtTransactions.filter((tx) => !tx.isPaid).reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
        : Number(debt.remainingAmount) || 0;
      const paidAmount = hasDerivedInstallments
        ? debtTransactions.filter((tx) => tx.isPaid).reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
        : Math.max(0, totalAmount - remainingAmount);
      const totalInstallments = hasDerivedInstallments
        ? installments.length
        : Number(debt.totalInstallments) || 0;
      const currentInstallment = totalInstallments > 0
        ? Math.min(
          paidInstallments.length + (pendingInstallments.length > 0 ? 1 : 0),
          totalInstallments
        )
        : 0;

      acc[debt.id] = {
        totalAmount,
        remainingAmount,
        paidAmount,
        totalInstallments,
        paidInstallments: paidInstallments.length,
        pendingInstallments: pendingInstallments.length,
        currentInstallment,
        hasDerivedInstallments,
      };

      return acc;
    }, {});
  }, [debts, transactions]);

  const totalDebt = debts.reduce((sum, d) => sum + (debtSummaries[d.id]?.remainingAmount ?? d.remainingAmount), 0);
  const totalMonthly = debts.reduce((sum, d) => sum + d.installmentAmount, 0);
  const parsedEntryAmount = hasEntry ? parseFloat(entryAmount || '0') || 0 : 0;
  const parsedInstallmentAmount = parseFloat(installmentAmount || '0') || 0;
  const parsedTotalInstallments = parseInt(totalInstallments || '0', 10) || 0;
  const computedAgreementTotal = calculateAgreementTotal(parsedEntryAmount, parsedInstallmentAmount, parsedTotalInstallments);

  const toNegotiate = debts.filter(d => d.status !== 'renegotiated');
  const inPayment = debts.filter(d => d.status === 'renegotiated');

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm dark:shadow-none border border-gray-100 dark:border-zinc-800 animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800">
            <TrendingDown className="w-5 h-5 text-danger" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-zinc-50">Controle de Acordos</h2>
            <p className="text-sm text-gray-500 dark:text-zinc-500">
              Acompanhe e quite seus acordos
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-danger-light">
            <p className="text-[11px] sm:text-sm font-bold text-muted-foreground uppercase tracking-widest">Total em Acordos</p>
            <p className="mt-1 text-xl sm:text-2xl font-black tabular-nums text-danger whitespace-nowrap">
              {formatCurrency(totalDebt)}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-warning-light">
            <p className="text-[11px] sm:text-sm font-bold text-muted-foreground uppercase tracking-widest">Parcelas Mensais</p>
            <p className="mt-1 text-xl sm:text-2xl font-black tabular-nums text-warning whitespace-nowrap">
              {formatCurrency(totalMonthly)}
            </p>
          </div>
        </div>
      </div>

      <Button
        onClick={openAddDebtForm}
        className="w-full rounded-xl py-6"
        variant="outline"
      >
        <Plus className="w-5 h-5 mr-2" />
        Adicionar Acordo
      </Button>

      <div className="space-y-8">
        {debts.length === 0 ? (
          <div className="card-elevated p-12 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum acordo cadastrado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Que bom! Continue assim.
            </p>
          </div>
        ) : (
          <>
            {toNegotiate.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground ml-1">Para Negociar</h3>
                {toNegotiate.map((debt) => {
                  const instAmount = Number(debt.installmentAmount) || 0;
                  const remAmount = Number(debt.remainingAmount) || 0;
                  const monthsRemaining = instAmount > 0
                    ? Math.ceil(remAmount / instAmount)
                    : 0;

                  return (
                    <div key={debt.id} className="bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-sm dark:shadow-none border border-gray-100 dark:border-zinc-800 space-y-4 group animate-fade-in border-l-4 border-l-warning">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg text-gray-900 dark:text-zinc-50">{debt.name}</h3>
                          <p className="text-xs text-gray-500 dark:text-zinc-500 uppercase font-bold tracking-tighter">
                            {debt.dueDay && `Vence dia ${debt.dueDay} · `}
                            ~{monthsRemaining} parcelas estimadas
                          </p>
                        </div>
                        <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all">
                          <button onClick={() => handleEdit(debt)} className="p-2 rounded-lg hover:bg-info/10 text-info" title="Editar">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => onDeleteDebt(debt.id)} className="p-2 rounded-lg hover:bg-danger/10 text-danger" title="Excluir">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between items-center py-2 border-y border-gray-100 dark:border-zinc-800">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-zinc-500 font-bold uppercase">Saldo Devedor</p>
                          <p className="text-xl font-black text-danger">{formatCurrency(debt.remainingAmount)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500 dark:text-zinc-500 font-bold uppercase">Valor Sugerido Parcela</p>
                          <p className="text-lg font-bold text-gray-900 dark:text-zinc-50">{formatCurrency(debt.installmentAmount || 0)}</p>
                        </div>
                      </div>

                      <Button
                        onClick={() => renegotiateDebt({ debt, firstInstallmentDate: format(new Date(), 'yyyy-MM-dd') })}
                        className="w-full rounded-xl bg-warning hover:bg-warning/90 text-warning-foreground font-black uppercase text-xs tracking-widest h-11"
                      >
                        Gerar Parcelas do Acordo
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {inPayment.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground ml-1">Em Pagamento (Acordos)</h3>
                {inPayment.map((debt) => {
                  const summary = debtSummaries[debt.id];
                  const totalAmt = summary?.totalAmount ?? Number(debt.totalAmount || 0);
                  const remAmt = summary?.remainingAmount ?? Number(debt.remainingAmount || 0);
                  const progress = totalAmt > 0
                    ? ((totalAmt - remAmt) / totalAmt) * 100
                    : 0;

                  return (
                    <div key={debt.id} className="bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-sm dark:shadow-none border border-gray-100 dark:border-zinc-800 space-y-4 group animate-fade-in border-l-4 border-l-success opacity-90 hover:opacity-100 transition-opacity">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg text-gray-900 dark:text-zinc-50">{debt.name}</h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {debt.debtType === 'invoice_installment' ? (
                              <span className="px-1.5 py-0.5 rounded bg-info/10 text-info text-[11px] font-black uppercase">Fatura Parcelada</span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-success/10 text-success text-[11px] font-black uppercase">Acordo Ativo</span>
                            )}
                            <p className="text-[11px] sm:text-xs text-gray-500 dark:text-zinc-500 font-bold">
                              {summary?.hasDerivedInstallments
                                ? `${summary.paidInstallments}/${summary.totalInstallments} pagas · Parcela ${summary.currentInstallment}/${summary.totalInstallments}`
                                : `${debt.totalInstallments} parcelas`}
                              {debt.dueDay ? ` · Dia ${debt.dueDay}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all">
                          <button onClick={() => handleEdit(debt)} className="p-2 rounded-lg hover:bg-info/10 text-info" title="Editar">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => onDeleteDebt(debt.id)} className="p-2 rounded-lg hover:bg-danger/10 text-danger" title="Excluir">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-[11px] sm:text-xs font-black uppercase">
                          <span className="text-muted-foreground whitespace-nowrap">Pago: {formatCurrency(summary?.paidAmount ?? Math.max(0, (Number(debt.totalAmount) || 0) - (Number(debt.remainingAmount) || 0)))}</span>
                          <span className="text-danger whitespace-nowrap">Restante: {formatCurrency(remAmt)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
                          <div className="h-full rounded-full bg-success transition-all duration-500" style={{ width: `${progress}%` }} />
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-success/5 border border-success/10 text-center">
                        <p className="text-xs font-bold text-success select-none">
                          As parcelas deste acordo estão na sua Gestão de Contas para pagamento.
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm">
          <div className="bg-card rounded-3xl shadow-xl w-full max-w-3xl max-h-[92vh] overflow-hidden animate-scale-in flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-semibold">
                {editingDebt ? 'Editar Acordo' : 'Novo Acordo'}
              </h2>
              <button
                onClick={handleCloseForm}
                className="p-2 rounded-xl hover:bg-muted transition-colors"
                disabled={isSubmitting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              key={editingDebt ? `edit-${editingDebt.id}` : 'new-agreement'}
              onSubmit={handleSubmit}
              autoComplete="off"
              className="flex min-h-0 flex-1 flex-col"
            >
              <div
                data-testid="agreement-modal-body"
                className="min-h-0 flex-1 overflow-y-auto px-6 py-6 space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="agreement-name">Nome/Descrição</Label>
                  <Input
                    id="agreement-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Acordo banco"
                    className="rounded-xl"
                    autoComplete="off"
                    required
                  />
                </div>

                <div className="rounded-2xl border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Label htmlFor="agreement-entry-toggle">Tem entrada?</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        A entrada é separada das parcelas do acordo.
                      </p>
                    </div>
                    <Switch
                      id="agreement-entry-toggle"
                      checked={hasEntry}
                      onCheckedChange={(checked) => {
                        setHasEntry(checked);
                        if (!checked) {
                          setEntryAmount('');
                          setEntryDate('');
                          setEntryAccountId('');
                          setEntryIsPaid(false);
                        }
                      }}
                    />
                  </div>

                  {hasEntry && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="agreement-entry-amount">Valor da Entrada (R$)</Label>
                          <Input
                            id="agreement-entry-amount"
                            type="number"
                            step="0.01"
                            min="0"
                            value={entryAmount}
                            onChange={(e) => setEntryAmount(e.target.value)}
                            placeholder="79.60"
                            className="rounded-xl"
                            autoComplete="off"
                            required={hasEntry}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="agreement-entry-date">Data da Entrada</Label>
                          <Input
                            id="agreement-entry-date"
                            type="date"
                            value={entryDate}
                            onChange={(e) => setEntryDate(e.target.value)}
                            className="rounded-xl"
                            required={hasEntry}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/40 px-3 py-2">
                        <div>
                          <Label htmlFor="agreement-entry-paid">Entrada paga no ato?</Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Se desligado, a entrada vira obrigação pendente na Gestão de Contas.
                          </p>
                        </div>
                        <Switch
                          id="agreement-entry-paid"
                          checked={entryIsPaid}
                          onCheckedChange={(checked) => {
                            setEntryIsPaid(checked);
                            if (!checked) setEntryAccountId('');
                          }}
                        />
                      </div>

                      {entryIsPaid && (
                        <div className="space-y-2">
                          <Label htmlFor="agreement-entry-account">Conta/Carteira da Entrada</Label>
                          <select
                            id="agreement-entry-account"
                            value={entryAccountId}
                            onChange={(e) => setEntryAccountId(e.target.value)}
                            className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                            required={hasEntry && entryIsPaid}
                          >
                            <option value="">Selecione uma conta</option>
                            {accounts.map((account) => (
                              <option key={account.id} value={account.id}>
                                {account.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="agreement-installment-amount">Parcela do Acordo (R$)</Label>
                    <Input
                      id="agreement-installment-amount"
                      type="number"
                      step="0.01"
                      value={installmentAmount}
                      onChange={(e) => setInstallmentAmount(e.target.value)}
                      placeholder="90.39"
                      className="rounded-xl font-bold"
                      autoComplete="off"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agreement-total-installments">Nº de Parcelas</Label>
                    <Input
                      id="agreement-total-installments"
                      type="number"
                      min="1"
                      value={totalInstallments}
                      onChange={(e) => setTotalInstallments(e.target.value)}
                      placeholder="11"
                      className="rounded-xl font-bold"
                      autoComplete="off"
                      required
                    />
                  </div>
                </div>

                <div className="rounded-2xl bg-muted/40 px-4 py-3 space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Total do acordo</p>
                  <p className="text-lg font-black text-foreground">
                    {formatCurrency(computedAgreementTotal)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {parsedTotalInstallments > 0 || parsedEntryAmount > 0
                      ? `${formatCurrency(parsedEntryAmount)} + ${parsedTotalInstallments}x de ${formatCurrency(parsedInstallmentAmount)} = ${formatCurrency(computedAgreementTotal)}`
                      : 'Preencha entrada e parcelas para calcular o total.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="agreement-first-installment-date">Data da 1ª Parcela</Label>
                    <Input
                      id="agreement-first-installment-date"
                      type="date"
                      value={firstInstallmentDate}
                      onChange={e => setFirstInstallmentDate(e.target.value)}
                      className="rounded-xl"
                      autoComplete="off"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agreement-due-day">Dia de Vencimento</Label>
                    <Input
                      id="agreement-due-day"
                      type="number"
                      min="1"
                      max="31"
                      value={dueDay}
                      onChange={e => setDueDay(e.target.value)}
                      placeholder="10"
                      className="rounded-xl"
                      autoComplete="off"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-border px-6 py-4 bg-card/95 backdrop-blur-sm">
                <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
                  <Button type="button" variant="outline" className="rounded-xl" onClick={handleCloseForm} disabled={isSubmitting}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className={cn(
                    'w-full rounded-xl sm:w-auto sm:min-w-[220px]',
                    editingDebt?.status === 'renegotiated' ? 'bg-success hover:bg-success/90' : 'bg-danger hover:bg-danger/90'
                  )}>
                    {editingDebt?.status === 'renegotiated' ? 'Atualizar Acordo' : editingDebt ? 'Atualizar Acordo' : 'Adicionar Acordo'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


