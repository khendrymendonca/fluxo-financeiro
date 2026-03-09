import { useState } from 'react';
import { Building2, Plus, Trash2, X, Wallet } from 'lucide-react';
import { Account } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface AccountsManagerProps {
  accounts: Account[];
  onAddAccount: (account: Omit<Account, 'id' | 'userId'>) => void;
  onDeleteAccount: (id: string) => void;
}

import { ColorSelector, APP_COLORS } from '@/components/ui/ColorSelector';

export function AccountsManager({
  accounts,
  onAddAccount,
  onDeleteAccount,
}: AccountsManagerProps) {
  const [showAccountForm, setShowAccountForm] = useState(false);

  // Account form state
  const [accountName, setAccountName] = useState('');
  const [accountBank, setAccountBank] = useState('');
  const [accountBalance, setAccountBalance] = useState('');
  const [accountType, setAccountType] = useState<'checking' | 'savings' | 'benefit_vr' | 'benefit_va' | 'benefit_flex'>('checking');
  const [accountColor, setAccountColor] = useState(APP_COLORS[0]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName || !accountBank || !accountBalance) return;

    onAddAccount({
      name: accountName,
      bank: accountBank,
      balance: parseFloat(accountBalance),
      color: accountColor,
      accountType: accountType,
    });

    setAccountName('');
    setAccountBank('');
    setAccountBalance('');
    setShowAccountForm(false);
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

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
            onClick={() => setShowAccountForm(true)}
            size="lg"
            className="rounded-2xl h-14 px-8 gap-2 shadow-xl shadow-primary/20 font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-5 h-5" /> Adicionar Conta
          </Button>
        </div>
      </div>

      {/* Bank Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
        {accounts.map((account) => (
          <div
            key={account.id}
            className="card-elevated p-6 group hover:border-primary/50 transition-all flex flex-col justify-between h-48 relative overflow-hidden"
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
                </div>
                <h3 className="text-xl font-bold truncate max-w-[180px]">{account.name}</h3>
              </div>
              <button
                onClick={() => onDeleteAccount(account.id)}
                className="p-2 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-danger/10 text-danger transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-auto relative z-10">
              <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">Saldo Disponível</p>
              <p className="text-2xl font-black">
                {formatCurrency(account.balance)}
              </p>
            </div>
          </div>
        ))}

        {accounts.length === 0 && !showAccountForm && (
          <div className="col-span-full py-20 text-center card-elevated border-dashed border-2 bg-muted/20">
            <p className="text-muted-foreground font-medium">Nenhuma conta ou carteira cadastrada.</p>
            <Button variant="ghost" onClick={() => setShowAccountForm(true)} className="mt-4">Começar agora</Button>
          </div>
        )}
      </div>

      {/* Account Form Modal */}
      {showAccountForm && (
        <div className="fixed inset-0 z-[100] flex items-start md:items-center justify-center p-4 pt-8 md:pt-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto" onClick={() => setShowAccountForm(false)}>
          <div
            className="bg-card rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200 border border-border my-auto max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div>
                <h2 className="text-lg font-black tracking-tight">Nova Conta</h2>
                <p className="text-xs text-muted-foreground">Cadastre um banco ou carteira digital.</p>
              </div>
              <button
                onClick={() => setShowAccountForm(false)}
                className="p-2 rounded-xl hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddAccount} className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
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
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Saldo Inicial (R$)</Label>
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

              <ColorSelector
                label="Escolha uma Cor de Identificação"
                selectedColor={accountColor}
                onSelect={setAccountColor}
              />

              <Button type="submit" className="w-full h-12 rounded-xl text-sm font-black uppercase tracking-wider shadow-lg shadow-primary/20 transition-all hover:translate-y-[-1px] active:translate-y-[0px]">
                Confirmar Cadastro
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
