import { useState } from 'react';
import { Building2, Plus, Trash2, X, Wallet, Pencil, ShieldCheck } from 'lucide-react';
import { Account } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { ColorSelector, APP_COLORS } from '@/components/ui/ColorSelector';
import { Portal } from '@/components/ui/Portal';

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
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // Account form state
  const [accountName, setAccountName] = useState('');
  const [accountBank, setAccountBank] = useState('');
  const [accountBalance, setAccountBalance] = useState('');
  const [accountType, setAccountType] = useState<'checking' | 'savings' | 'benefit_vr' | 'benefit_va' | 'benefit_flex'>('checking');
  const [accountColor, setAccountColor] = useState(APP_COLORS[0]);
  const [hasOverdraft, setHasOverdraft] = useState(false);
  const [overdraftLimit, setOverdraftLimit] = useState('');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const resetForm = () => {
    setAccountName('');
    setAccountBank('');
    setAccountBalance('');
    setAccountType('checking');
    setAccountColor(APP_COLORS[0]);
    setHasOverdraft(false);
    setOverdraftLimit('');
    setEditingAccount(null);
  };

  const openAddForm = () => {
    resetForm();
    setShowAccountForm(true);
  };

  const openEditForm = (account: Account) => {
    setEditingAccount(account);
    setAccountName(account.name);
    setAccountBank(account.bank);
    setAccountBalance(account.balance.toString());
    setAccountType(account.accountType);
    setAccountColor(account.color);
    setHasOverdraft(account.hasOverdraft || false);
    setOverdraftLimit(account.overdraftLimit?.toString() || '');
    setShowAccountForm(true);
  };

  const closeForm = () => {
    setShowAccountForm(false);
    resetForm();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName || !accountBank || !accountBalance) return;

    const accountData = {
      name: accountName,
      bank: accountBank,
      balance: parseFloat(accountBalance),
      color: accountColor,
      accountType: accountType,
      hasOverdraft: hasOverdraft,
      overdraftLimit: hasOverdraft ? parseFloat(overdraftLimit || '0') : 0,
    };

    if (editingAccount) {
      onUpdateAccount(editingAccount.id, accountData);
    } else {
      onAddAccount(accountData);
    }

    closeForm();
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  const isEditing = !!editingAccount;

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="card-elevated p-8 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 animate-fade-in relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Wallet className="w-32 h-32" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="text-sm font-bold text-primary/70 uppercase tracking-widest mb-1">Patrimônio Total em Contas</p>
            <h2 className="text-4xl font-black tracking-tight">
              {formatCurrency(totalBalance)}
            </h2>
          </div>
          <Button
            onClick={openAddForm}
            size="lg"
            className="rounded-2xl h-14 px-8 gap-2 shadow-xl shadow-primary/20 font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-5 h-5" /> Adicionar Conta
          </Button>
        </div>
      </div>

      {/* Bank Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
        {accounts.map((account) => {
          const availableTotal = account.balance + (account.hasOverdraft ? (account.overdraftLimit || 0) : 0);
          const isNegative = account.balance < 0;
          const overdraftUsed = isNegative ? Math.abs(account.balance) : 0;

          return (
            <div
              key={account.id}
              className="card-elevated p-6 group hover:border-primary/50 transition-all flex flex-col justify-between h-auto min-h-[12rem] relative overflow-hidden cursor-pointer"
              onClick={() => openEditForm(account)}
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Building2 className="w-16 h-16" />
              </div>

              <div className="flex justify-between items-start relative z-10">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: account.color }}
                    />
                    <p className="text-xs font-black uppercase text-muted-foreground tracking-tighter">{account.bank}</p>
                    {account.hasOverdraft && (
                      <span className="text-[8px] bg-amber-500/15 text-amber-600 px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter flex items-center gap-0.5">
                        <ShieldCheck className="w-2.5 h-2.5" />
                        Limite
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold truncate max-w-[180px]">{account.name}</h3>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEditForm(account); }}
                    className="p-2 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-primary/10 text-primary transition-all"
                    title="Editar conta"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteAccount(account.id); }}
                    className="p-2 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-danger/10 text-danger transition-all"
                    title="Excluir conta"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-auto relative z-10 space-y-2">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">Saldo Disponível</p>
                  <p className={cn("text-2xl font-black", isNegative && "text-danger")}>
                    {formatCurrency(account.balance)}
                  </p>
                </div>

                {account.hasOverdraft && (account.overdraftLimit || 0) > 0 && (
                  <div className="pt-2 border-t border-border/50 space-y-1">
                    <div className="flex justify-between items-center">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase">Limite da Conta</p>
                      <p className="text-[9px] font-bold text-amber-600">{formatCurrency(account.overdraftLimit || 0)}</p>
                    </div>
                    {isNegative && (
                      <div className="space-y-1">
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-amber-500 transition-all duration-500"
                            style={{ width: `${Math.min(100, (overdraftUsed / (account.overdraftLimit || 1)) * 100)}%` }}
                          />
                        </div>
                        <p className="text-[9px] text-amber-600 font-bold">
                          {formatCurrency(overdraftUsed)} usado do limite
                        </p>
                      </div>
                    )}
                    <p className="text-[9px] text-muted-foreground">
                      Disponível total: <span className="font-bold text-foreground">{formatCurrency(availableTotal)}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
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
            <div
              className="bg-card rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200 border border-border max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card rounded-t-2xl z-10">
                <div>
                  <h2 className="text-lg font-black tracking-tight">
                    {isEditing ? 'Editar Conta' : 'Nova Conta'}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {isEditing ? 'Atualize os dados da sua conta.' : 'Cadastre um banco ou carteira digital.'}
                  </p>
                </div>
                <button
                  onClick={closeForm}
                  className="p-2 rounded-xl hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nome da Conta / Apelido</Label>
                  <Input
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Ex: Conta Corrente Itaú"
                    className="h-10 rounded-xl border-2 focus:border-primary/50 transition-colors px-4"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Instituição Bancária</Label>
                  <Input
                    value={accountBank}
                    onChange={(e) => setAccountBank(e.target.value)}
                    placeholder="Ex: Banco Itaú"
                    className="h-10 rounded-xl border-2 focus:border-primary/50 transition-colors px-4"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      {isEditing ? 'Saldo Atual (R$)' : 'Saldo Inicial (R$)'}
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={accountBalance}
                      onChange={(e) => setAccountBalance(e.target.value)}
                      placeholder="0.00"
                      className="h-10 rounded-xl border-2 focus:border-primary/50 transition-colors px-4 font-bold"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tipo de Conta</Label>
                    <select
                      value={accountType}
                      onChange={(e) => setAccountType(e.target.value as any)}
                      className="w-full h-10 rounded-xl border-2 border-input bg-background px-3 py-2 text-sm font-bold focus:border-primary/50 outline-none"
                    >
                      <option value="checking">Corrente</option>
                      <option value="savings">Poupança</option>
                      <option value="benefit_va">VA (Ali.)</option>
                      <option value="benefit_vr">VR (Ref.)</option>
                      <option value="benefit_flex">Flexível</option>
                    </select>
                  </div>
                </div>

                {/* Overdraft / Limite da Conta */}
                <div className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Limite da Conta</Label>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Permite saldo negativo (tipo cheque especial)</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHasOverdraft(!hasOverdraft)}
                      className={cn(
                        "relative w-12 h-7 rounded-full transition-colors duration-200 focus:outline-none",
                        hasOverdraft ? "bg-primary" : "bg-muted-foreground/30"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200",
                          hasOverdraft && "translate-x-5"
                        )}
                      />
                    </button>
                  </div>

                  {hasOverdraft && (
                    <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-amber-600">Valor do Limite (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={overdraftLimit}
                        onChange={(e) => setOverdraftLimit(e.target.value)}
                        placeholder="Ex: 1000.00"
                        className="h-10 rounded-xl border-2 border-amber-500/30 focus:border-amber-500/50 transition-colors px-4 font-bold"
                      />
                      <p className="text-[9px] text-muted-foreground">
                        Seu saldo poderá ir até <strong className="text-amber-600">-{formatCurrency(parseFloat(overdraftLimit || '0'))}</strong>
                      </p>
                    </div>
                  )}
                </div>

                <ColorSelector
                  label="Escolha uma Cor de Identificação"
                  selectedColor={accountColor}
                  onSelect={setAccountColor}
                />

                <Button type="submit" className="w-full h-12 rounded-xl text-sm font-black uppercase tracking-wider shadow-lg shadow-primary/20 transition-all hover:translate-y-[-1px] active:translate-y-[0px]">
                  {isEditing ? 'Salvar Alterações' : 'Confirmar Cadastro'}
                </Button>
              </form>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
