import { useState } from 'react';
import { Building2, CreditCard as CreditCardIcon, Plus, Trash2, X } from 'lucide-react';
import { Account, CreditCard } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface AccountsManagerProps {
  accounts: Account[];
  creditCards: CreditCard[];
  getCardExpenses: (cardId: string) => number;
  onAddAccount: (account: Omit<Account, 'id'>) => void;
  onDeleteAccount: (id: string) => void;
  onAddCard: (card: Omit<CreditCard, 'id'>) => void;
  onDeleteCard: (id: string) => void;
}

const COLORS = [
  '#8B5CF6', '#F97316', '#10B981', '#3B82F6', '#EC4899', '#14B8A6'
];

export function AccountsManager({
  accounts,
  creditCards,
  getCardExpenses,
  onAddAccount,
  onDeleteAccount,
  onAddCard,
  onDeleteCard,
}: AccountsManagerProps) {
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  
  // Account form state
  const [accountName, setAccountName] = useState('');
  const [accountBank, setAccountBank] = useState('');
  const [accountBalance, setAccountBalance] = useState('');
  const [accountColor, setAccountColor] = useState(COLORS[0]);

  // Card form state
  const [cardName, setCardName] = useState('');
  const [cardBank, setCardBank] = useState('');
  const [cardLimit, setCardLimit] = useState('');
  const [cardClosingDay, setCardClosingDay] = useState('15');
  const [cardDueDay, setCardDueDay] = useState('22');
  const [cardColor, setCardColor] = useState(COLORS[0]);

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
    });
    
    setAccountName('');
    setAccountBank('');
    setAccountBalance('');
    setShowAccountForm(false);
  };

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardName || !cardBank || !cardLimit) return;
    
    onAddCard({
      name: cardName,
      bank: cardBank,
      limit: parseFloat(cardLimit),
      closingDay: parseInt(cardClosingDay),
      dueDay: parseInt(cardDueDay),
      color: cardColor,
    });
    
    setCardName('');
    setCardBank('');
    setCardLimit('');
    setShowCardForm(false);
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="card-elevated p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Patrimônio Total</h2>
          <span className="text-3xl font-bold text-primary">
            {formatCurrency(totalBalance)}
          </span>
        </div>
      </div>

      {/* Bank Accounts */}
      <div className="card-elevated p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Contas Bancárias</h3>
          <Button 
            onClick={() => setShowAccountForm(true)}
            size="sm"
            className="rounded-xl"
          >
            <Plus className="w-4 h-4 mr-1" /> Adicionar
          </Button>
        </div>

        <div className="space-y-3">
          {accounts.map((account) => (
            <div 
              key={account.id}
              className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 group"
            >
              <div className="flex items-center gap-3">
                <div 
                  className="p-2.5 rounded-xl"
                  style={{ backgroundColor: `${account.color}20` }}
                >
                  <Building2 className="w-5 h-5" style={{ color: account.color }} />
                </div>
                <div>
                  <p className="font-medium">{account.name}</p>
                  <p className="text-sm text-muted-foreground">{account.bank}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-lg">
                  {formatCurrency(account.balance)}
                </span>
                <button
                  onClick={() => onDeleteAccount(account.id)}
                  className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-danger-light text-danger transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Account Form Modal */}
        {showAccountForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm">
            <div className="bg-card rounded-3xl shadow-xl w-full max-w-md animate-scale-in">
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-lg font-semibold">Nova Conta</h2>
                <button 
                  onClick={() => setShowAccountForm(false)}
                  className="p-2 rounded-xl hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleAddAccount} className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label>Nome da Conta</Label>
                  <Input
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Ex: Conta Principal"
                    className="rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Banco</Label>
                  <Input
                    value={accountBank}
                    onChange={(e) => setAccountBank(e.target.value)}
                    placeholder="Ex: Nubank"
                    className="rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Saldo Atual (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={accountBalance}
                    onChange={(e) => setAccountBalance(e.target.value)}
                    placeholder="0.00"
                    className="rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cor</Label>
                  <div className="flex gap-2">
                    {COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setAccountColor(color)}
                        className={cn(
                          "w-8 h-8 rounded-lg transition-all",
                          accountColor === color && "ring-2 ring-offset-2 ring-foreground"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <Button type="submit" className="w-full rounded-xl">
                  Adicionar Conta
                </Button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Credit Cards */}
      <div className="card-elevated p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Cartões de Crédito</h3>
          <Button 
            onClick={() => setShowCardForm(true)}
            size="sm"
            className="rounded-xl"
          >
            <Plus className="w-4 h-4 mr-1" /> Adicionar
          </Button>
        </div>

        <div className="space-y-3">
          {creditCards.map((card) => {
            const expenses = getCardExpenses(card.id);
            const usagePercent = (expenses / card.limit) * 100;
            
            return (
              <div 
                key={card.id}
                className="p-4 rounded-2xl bg-muted/30 space-y-3 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="p-2.5 rounded-xl"
                      style={{ backgroundColor: `${card.color}20` }}
                    >
                      <CreditCardIcon className="w-5 h-5" style={{ color: card.color }} />
                    </div>
                    <div>
                      <p className="font-medium">{card.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {card.bank} • Venc. dia {card.dueDay}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold text-danger">{formatCurrency(expenses)}</p>
                      <p className="text-xs text-muted-foreground">de {formatCurrency(card.limit)}</p>
                    </div>
                    <button
                      onClick={() => onDeleteCard(card.id)}
                      className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-danger-light text-danger transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${Math.min(usagePercent, 100)}%`,
                      backgroundColor: usagePercent > 80 ? 'hsl(0, 70%, 60%)' : card.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Card Form Modal */}
        {showCardForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm">
            <div className="bg-card rounded-3xl shadow-xl w-full max-w-md animate-scale-in">
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-lg font-semibold">Novo Cartão</h2>
                <button 
                  onClick={() => setShowCardForm(false)}
                  className="p-2 rounded-xl hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleAddCard} className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label>Nome do Cartão</Label>
                  <Input
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="Ex: Nubank"
                    className="rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Banco/Bandeira</Label>
                  <Input
                    value={cardBank}
                    onChange={(e) => setCardBank(e.target.value)}
                    placeholder="Ex: Nubank"
                    className="rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Limite (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={cardLimit}
                    onChange={(e) => setCardLimit(e.target.value)}
                    placeholder="5000.00"
                    className="rounded-xl"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Dia Fechamento</Label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={cardClosingDay}
                      onChange={(e) => setCardClosingDay(e.target.value)}
                      className="rounded-xl"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Dia Vencimento</Label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={cardDueDay}
                      onChange={(e) => setCardDueDay(e.target.value)}
                      className="rounded-xl"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Cor</Label>
                  <div className="flex gap-2">
                    {COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setCardColor(color)}
                        className={cn(
                          "w-8 h-8 rounded-lg transition-all",
                          cardColor === color && "ring-2 ring-offset-2 ring-foreground"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <Button type="submit" className="w-full rounded-xl">
                  Adicionar Cartão
                </Button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
