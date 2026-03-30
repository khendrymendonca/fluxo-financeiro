import { useState } from 'react';
// formatCurrency local from '@/utils/formatters';
import { Building2, Plus, Trash2, X, Wallet, Pencil, ShieldCheck, ArrowRightLeft, TrendingUp } from 'lucide-react';
import { Account, AccountType } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { ColorSelector, APP_COLORS } from '@/components/ui/ColorSelector';
import { Portal } from '@/components/ui/Portal';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { useTransferBetweenAccounts } from '@/hooks/useAccountMutations';
import { useAddTransaction } from '@/hooks/useTransactionMutations';
import { toast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { todayLocalString } from '@/utils/dateUtils';
import { PageHeader } from '@/components/ui/PageHeader';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface AccountsManagerProps {
  accounts: Account[];
  onAddAccount: (account: Omit<Account, 'id' | 'userId'>) => void;
  onUpdateAccount: (id: string, updates: Partial<Account>) => void;
  onDeleteAccount: (id: string) => void;
}

export function AccountsManager({
  accounts,
  onAddAccount,
  onUpdateAccount,
  onDeleteAccount,
}: AccountsManagerProps) {
  const { viewDate, currentMonthTransactions, categories } = useFinanceStore();
  const { mutateAsync: transferBetweenAccounts } = useTransferBetweenAccounts();
  const { mutateAsync: addTransaction } = useAddTransaction();

  const [showAccountForm, setShowAccountForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // Transfer modal state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferFrom, setTransferFrom] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDescription, setTransferDescription] = useState('Transferência entre contas');

  // Account form state
  const [accountName, setAccountName] = useState('');
  const [accountInstitution, setAccountInstitution] = useState('');
  const [accountBalance, setAccountBalance] = useState('');
  const [accountType, setAccountType] = useState<string>('corrente');
  const [accountColor, setAccountColor] = useState(APP_COLORS[0]);
  const [hasOverdraft, setHasOverdraft] = useState(false);
  const [overdraftLimit, setOverdraftLimit] = useState('');
  const [monthlyYieldRate, setMonthlyYieldRate] = useState('');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Helper function to calculate view balance locally since the store version might be deprecated or inconsistent
  const getAccountViewBalance = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return 0;

    // Filter transactions for this account up to the view date
    const balance = Number(account.balance);

    // In our new architecture, account.balance is already the real-time balance from DB triggers.
    // The "view balance" in the old context was a filtered sum. 
    // For now, we'll return the real balance as it's the most reliable.
    return balance;
  };

  const totalNetWorth = accounts
    .filter(acc => ['corrente', 'benefit_vr', 'benefit_va', 'benefit_flex'].includes(acc.accountType))
    .reduce((sum, acc) => sum + Number(acc.balance), 0);

  const resetForm = () => {
    setAccountName('');
    setAccountInstitution('');
    setAccountBalance('');
    setAccountType('corrente');
    setAccountColor(APP_COLORS[0]);
    setHasOverdraft(false);
    setOverdraftLimit('');
    setMonthlyYieldRate('');
    setEditingAccount(null);
  };

  const openAddForm = () => {
    resetForm();
    setShowAccountForm(true);
  };

  const openEditForm = (account: Account) => {
    setEditingAccount(account);
    setAccountName(account.name);
    setAccountInstitution(account.institution || account.bank || '');
    setAccountBalance(account.balance.toFixed(2));
    setAccountType(account.accountType);
    setAccountColor(account.color);
    setHasOverdraft(account.hasOverdraft || false);
    setOverdraftLimit(account.overdraftLimit?.toString() || '');
    setMonthlyYieldRate(account.monthlyYieldRate?.toString() || '');
    setShowAccountForm(true);
  };

  const closeForm = () => {
    setShowAccountForm(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: string[] = [];
    if (!accountInstitution) errors.push('Instituição');
    if (!accountBalance || parseFloat(accountBalance) < 0) errors.push('Saldo');

    if (errors.length > 0) {
      toast({
        title: 'Campos obrigatórios',
        description: `Preencha: ${errors.join(', ')}`,
        variant: 'destructive'
      });
      return;
    }

    const parsedNewBalance = parseFloat(accountBalance);
    const finalName = accountName.trim() ? accountName : accountInstitution;

    if (editingAccount) {
      const currentRealBalance = Number(editingAccount.balance);

      if (parsedNewBalance !== currentRealBalance) {
        const diferenca = parsedNewBalance - currentRealBalance;

        try {
          await addTransaction({
            description: 'Ajuste de Saldo',
            amount: Math.abs(diferenca),
            type: diferenca > 0 ? 'income' : 'expense',
            transactionType: 'adjustment',
            isPaid: true,
            date: new Date().toISOString().split('T')[0],
            accountId: editingAccount.id,
            categoryId: categories.length > 0 ? categories[0].id : undefined
          });
        } catch (error) {
          console.error('Erro ao criar ajuste:', error);
          toast({ title: 'Erro ao ajustar saldo', variant: 'destructive' });
          return;
        }
      }

      // Propagate color to all accounts of the same institution if color changed
      if (accountColor !== editingAccount.color) {
        const sameInstAccounts = accounts.filter(a =>
          (a.institution || a.bank) === (editingAccount.institution || editingAccount.bank) &&
          a.id !== editingAccount.id
        );

        for (const acc of sameInstAccounts) {
          onUpdateAccount(acc.id, { color: accountColor });
        }
      }

      const accountDataToUpdate = {
        name: finalName,
        institution: accountInstitution,
        bank: accountInstitution,
        color: accountColor,
        accountType: accountType as AccountType,
        hasOverdraft: hasOverdraft,
        overdraftLimit: hasOverdraft ? parseFloat(overdraftLimit || '0') : 0,
        monthlyYieldRate: ['metas', 'caixinha', 'investment'].includes(accountType) ? parseFloat(monthlyYieldRate || '0') : 0,
      };

      onUpdateAccount(editingAccount.id, accountDataToUpdate);
      toast({ title: 'Conta atualizada com sucesso!' });
    } else {
      // Check if institution already exists to inherit color if not explicitly changed
      const existingInst = accounts.find(a => (a.institution || a.bank) === accountInstitution);
      const finalColor = existingInst ? existingInst.color : accountColor;

      const accountData = {
        name: finalName,
        institution: accountInstitution,
        bank: accountInstitution,
        balance: parsedNewBalance,
        color: finalColor,
        accountType: accountType as AccountType,
        hasOverdraft: hasOverdraft,
        overdraftLimit: hasOverdraft ? parseFloat(overdraftLimit || '0') : 0,
        monthlyYieldRate: ['metas', 'caixinha', 'investment'].includes(accountType) ? parseFloat(monthlyYieldRate || '0') : 0,
      };
      onAddAccount(accountData);
    }

    closeForm();
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: string[] = [];
    if (!transferFrom) errors.push('Conta de Origem');
    if (!transferTo) errors.push('Conta de Destino');
    if (!transferAmount || parseFloat(transferAmount) <= 0) errors.push('Valor');

    if (errors.length > 0) {
      toast({
        title: 'Campos obrigatórios',
        description: `Preencha: ${errors.join(', ')}`,
        variant: 'destructive'
      });
      return;
    }
    if (transferFrom === transferTo) {
      toast({ title: 'As contas de origem e destino devem ser diferentes', variant: 'destructive' });
      return;
    }

    const amount = parseFloat(transferAmount);
    if (amount <= 0) {
      toast({ title: 'O valor da transferência deve ser maior que zero', variant: 'destructive' });
      return;
    }

    try {
      await transferBetweenAccounts({
        from: transferFrom,
        to: transferTo,
        amount,
        description: transferDescription,
        date: format(new Date(), 'yyyy-MM-dd')
      });
      setShowTransferModal(false);
      setTransferFrom('');
      setTransferTo('');
      setTransferAmount('');
      setTransferDescription('Transferência entre contas');
    } catch (error) {
      // Error is handled by mutation
    }
  };

  const isEditing = !!editingAccount;

  const getAccountTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      checking: 'Conta Corrente',
      savings: 'Poupança',
      caixinha: 'Caixinha',
      investment: 'Investimento',
      benefit_vr: 'Vale Refeição',
      benefit_va: 'Vale Alimentação',
      benefit_flex: 'Benefício Flexível',
      corrente: 'Conta Corrente',
    };
    return labels[type] || 'Outro';
  };

  const showYieldRateInput = ['metas', 'caixinha', 'investment'].includes(accountType);

  return (
    <div className="space-y-6">
      <PageHeader title="Minha Carteira" icon={Wallet} />

      {/* Summary Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 shadow-sm dark:shadow-none border border-gray-100 dark:border-zinc-800 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent animate-fade-in relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Wallet className="w-32 h-32" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="text-sm font-bold text-primary/70 uppercase tracking-widest mb-1">Patrimônio (Soma das Carteiras)</p>
            <h2 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white">{formatCurrency(totalNetWorth)}</h2>
            <p className="text-[10px] text-muted-foreground mt-1 font-medium">
              Apenas Contas Corrente e Benefícios. Poupança e Investimentos não inclusos.
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            {accounts.length >= 2 && (
              <Button
                onClick={() => setShowTransferModal(true)}
                size="lg"
                variant="outline"
                className="rounded-2xl h-14 px-8 gap-2 border-primary/30 text-primary shadow-xl shadow-primary/5 font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95"
              >
                <ArrowRightLeft className="w-5 h-5" /> Transferir
              </Button>
            )}
            <Button
              onClick={openAddForm}
              size="lg"
              className="rounded-2xl h-14 px-8 gap-2 shadow-xl shadow-primary/20 font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-5 h-5" /> Adicionar Conta
            </Button>
          </div>
        </div>
      </div>

      {/* Bank Accounts Grouped by Institution */}
      <div className="space-y-4 animate-fade-in pb-20 md:pb-0">
        {Object.entries(
          accounts.reduce((acc, account) => {
            const inst = account.institution || account.bank || 'Instituição não informada';
            if (!acc[inst]) acc[inst] = [];
            acc[inst].push(account);
            return acc;
          }, {} as Record<string, Account[]>)
        ).sort(([a], [b]) => a === 'Instituição não informada' ? 1 : b === 'Instituição não informada' ? -1 : a.localeCompare(b))
          .map(([institution, instAccounts]) => {
            const instTotal = instAccounts.reduce((sum, a) => sum + Number(a.balance), 0);
            const instColor = instAccounts[0]?.color || APP_COLORS[0];

            return (
              <Accordion type="single" collapsible key={institution} className="w-full">
                <AccordionItem value={institution} className="border-none bg-white dark:bg-zinc-900 rounded-3xl mb-4 overflow-hidden border border-gray-100 dark:border-zinc-800 shadow-sm transition-all hover:shadow-md">
                  <AccordionTrigger className="px-6 py-5 hover:no-underline group">
                    <div className="flex items-center justify-between w-full pr-4 text-left">
                      <div className="flex items-center gap-4">
                        <Avatar className="w-10 h-10 border-2 border-white dark:border-zinc-800 shadow-sm">
                          <AvatarFallback
                            className="font-black uppercase text-xs text-white"
                            style={{ backgroundColor: instColor }}
                          >
                            {institution.substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-bold text-lg text-gray-900 dark:text-zinc-50">{institution}</h3>
                          <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">{instAccounts.length} {instAccounts.length === 1 ? 'conta' : 'contas'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-1">Saldo Consolidado</p>
                        <p className="font-black text-xl text-primary">{formatCurrency(instTotal)}</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6 pt-2">
                    <Separator className="mb-6 opacity-50" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {instAccounts.map((account) => {
                        const viewAccountBalance = getAccountViewBalance(account.id);
                        const typeLabel = getAccountTypeLabel(account.accountType);

                        return (
                          <div
                            key={account.id}
                            className="p-5 rounded-2xl bg-gray-50/50 dark:bg-zinc-800/20 border border-gray-100 dark:border-zinc-800 hover:border-primary/40 transition-all cursor-pointer group flex flex-col justify-between"
                            onClick={() => openEditForm(account)}
                          >
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={cn(
                                    "text-[8px] font-black uppercase px-2 py-0.5 rounded-full border",
                                    account.accountType === 'corrente' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                                      ['benefit_vr', 'benefit_va', 'benefit_flex'].includes(account.accountType) ? "bg-orange-500/10 text-orange-500 border-orange-500/20" :
                                        "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                  )}>
                                    {typeLabel}
                                  </span>
                                  {account.hasOverdraft && (
                                    <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                      Limite
                                    </span>
                                  )}
                                </div>
                                <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-50">{account.name}</h4>
                              </div>
                              <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity ml-2">
                                <button
                                  onClick={(e) => { e.stopPropagation(); openEditForm(account); }}
                                  className="p-2 rounded-xl hover:bg-primary/10 text-primary transition-colors border border-transparent hover:border-primary/20"
                                  title="Editar conta"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            <div className="flex items-end justify-between mt-auto">
                              <div>
                                <p className="text-[10px] uppercase font-black text-zinc-400 tracking-tighter">Saldo Disponível</p>
                                <p className={cn(
                                  "font-black text-xl tracking-tighter",
                                  viewAccountBalance < 0 ? "text-danger" : "text-zinc-900 dark:text-zinc-50"
                                )}>
                                  {formatCurrency(viewAccountBalance)}
                                </p>
                              </div>
                              <div className="w-8 h-8 rounded-full border-4 border-white dark:border-zinc-900 shadow-sm" style={{ backgroundColor: account.color }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            );
          })}

        {accounts.length === 0 && !showAccountForm && (
          <div className="col-span-full py-20 text-center card-elevated border-dashed border-2 bg-muted/20">
            <p className="text-muted-foreground font-medium">Nenhuma conta ou carteira cadastrada.</p>
            <Button variant="ghost" onClick={openAddForm} className="mt-4">Começar agora</Button>
          </div>
        )}
      </div>

      {/* Account Form Modal (Add / Edit) */}
      {showAccountForm && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={closeForm}>
            <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200 border border-border max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card rounded-t-2xl z-10">
                <div>
                  <h2 className="text-lg font-black tracking-tight">{isEditing ? 'Editar Conta' : 'Nova Conta'}</h2>
                  <p className="text-xs text-muted-foreground">{isEditing ? 'Atualize os dados da sua conta.' : 'Cadastre um banco ou carteira digital.'}</p>
                </div>
                <button onClick={closeForm} className="p-2 rounded-xl hover:bg-muted transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 col-span-2 md:col-span-1">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Apelido da Conta (Opcional)</Label>
                    <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Ex: Principal" className="h-10 rounded-xl border-2 focus:border-primary/50 transition-colors px-4" />
                  </div>
                  <div className="space-y-1.5 col-span-2 md:col-span-1">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Instituição (Banco)</Label>
                    <Input value={accountInstitution} onChange={(e) => setAccountInstitution(e.target.value)} placeholder="Ex: Itaú, Nubank" className="h-10 rounded-xl border-2 focus:border-primary/50 transition-colors px-4" required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{isEditing ? 'Saldo Atual (R$)' : 'Saldo Inicial (R$)'}</Label>
                    <Input type="number" step="0.01" value={accountBalance} onChange={(e) => setAccountBalance(e.target.value)} placeholder="0.00" className="h-10 rounded-xl border-2 focus:border-primary/50 transition-colors px-4 font-bold" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tipo de Conta</Label>
                    <select
                      value={accountType}
                      onChange={(e) => {
                        setAccountType(e.target.value as AccountType);
                        if (!['metas', 'caixinha', 'investment'].includes(e.target.value)) setMonthlyYieldRate('');
                      }}
                      className="w-full h-10 rounded-xl border-2 border-input bg-background px-3 py-2 text-sm font-bold focus:border-primary/50 outline-none"
                    >
                      <option value="corrente">Corrente</option>
                      <option value="metas">Poupança</option>
                      <option value="caixinha">Caixinha</option>
                      <option value="investment">Investimento</option>
                      <option value="benefit_va">VA (Ali.)</option>
                      <option value="benefit_vr">VR (Ref.)</option>
                      <option value="benefit_flex">Flexível</option>
                    </select>
                  </div>
                </div>

                {showYieldRateInput && (
                  <div className="space-y-1.5 p-3 rounded-xl bg-success/5 border border-success/20 animate-fade-in">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-success flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> Rendimento Mensal (% a.m.)
                    </Label>
                    <Input type="number" step="0.01" min="0" value={monthlyYieldRate} onChange={(e) => setMonthlyYieldRate(e.target.value)} placeholder="Ex: 0.85" className="h-10 rounded-xl border-2 border-success/30 focus:border-success/50 transition-colors px-4 font-bold" />
                    <p className="text-[9px] text-muted-foreground">O rendimento é projetado sobre o saldo positivo.</p>
                  </div>
                )}

                {/* Overdraft / Limite da Conta */}
                <div className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Limite da Conta</Label>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Permite saldo negativo (tipo cheque especial)</p>
                    </div>
                    <button type="button" onClick={() => setHasOverdraft(!hasOverdraft)} className={cn("relative w-12 h-7 rounded-full transition-colors duration-200 focus:outline-none", hasOverdraft ? "bg-primary" : "bg-muted-foreground/30")}>
                      <span className={cn("absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200", hasOverdraft && "translate-x-5")} />
                    </button>
                  </div>

                  {hasOverdraft && (
                    <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-amber-600">Valor do Limite (R$)</Label>
                      <Input type="number" step="0.01" min="0" value={overdraftLimit} onChange={(e) => setOverdraftLimit(e.target.value)} placeholder="Ex: 1000.00" className="h-10 rounded-xl border-2 border-amber-500/30 focus:border-amber-500/50 transition-colors px-4 font-bold" />
                      <p className="text-[9px] text-muted-foreground">Seu saldo poderá ir até <strong className="text-amber-600">-{formatCurrency(parseFloat(overdraftLimit || '0'))}</strong></p>
                    </div>
                  )}
                </div>

                <ColorSelector label="Escolha uma Cor de Identificação" selectedColor={accountColor} onSelect={setAccountColor} />

                <Button type="submit" className="w-full h-12 rounded-xl text-sm font-black uppercase tracking-wider shadow-lg shadow-primary/20 transition-all hover:translate-y-[-1px] active:translate-y-[0px]">
                  {isEditing ? 'Salvar Alterações' : 'Confirmar Cadastro'}
                </Button>
              </form>
            </div>
          </div>
        </Portal>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowTransferModal(false)}>
            <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200 border border-border max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card rounded-t-2xl z-10">
                <div>
                  <h2 className="text-lg font-black tracking-tight">Transferir Saldo</h2>
                  <p className="text-xs text-muted-foreground">Mova dinheiro entre suas contas cadastradas.</p>
                </div>
                <button onClick={() => setShowTransferModal(false)} className="p-2 rounded-xl hover:bg-muted transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleTransferSubmit} className="px-5 py-4 space-y-4">

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Conta de Origem (Debitar)</Label>
                  <select
                    value={transferFrom}
                    onChange={(e) => setTransferFrom(e.target.value)}
                    className="w-full h-10 rounded-xl border-2 border-input bg-background px-3 py-2 text-sm font-bold focus:border-primary/50 outline-none"
                    required
                  >
                    <option value="">Selecione...</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.bank} - {a.name} (Saldo: {formatCurrency(a.balance + (a.hasOverdraft ? (a.overdraftLimit || 0) : 0))})</option>)}
                  </select>
                </div>

                <div className="flex justify-center -my-2 relative z-10">
                  <div className="bg-muted rounded-full p-2 border-4 border-card">
                    <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Conta de Destino (Creditar)</Label>
                  <select
                    value={transferTo}
                    onChange={(e) => setTransferTo(e.target.value)}
                    className="w-full h-10 rounded-xl border-2 border-input bg-background px-3 py-2 text-sm font-bold focus:border-primary/50 outline-none"
                    required
                  >
                    <option value="">Selecione...</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.bank} - {a.name}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Valor (R$)</Label>
                  <Input type="number" step="0.01" min="0.01" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} placeholder="0.00" className="h-10 rounded-xl border-2 focus:border-primary/50 transition-colors px-4 font-bold text-lg" required />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Descrição (Opcional)</Label>
                  <Input value={transferDescription} onChange={(e) => setTransferDescription(e.target.value)} placeholder="Ex: Transferência para caixinha" className="h-10 rounded-xl border-2 focus:border-primary/50 transition-colors px-4" required />
                </div>

                <Button type="submit" className="w-full h-12 rounded-xl text-sm font-black uppercase tracking-wider shadow-lg shadow-primary/20 transition-all hover:translate-y-[-1px] active:translate-y-[0px] mt-2">
                  Confirmar Transferência
                </Button>
              </form>
            </div>
          </div>
        </Portal>
      )}

    </div>
  );
}


