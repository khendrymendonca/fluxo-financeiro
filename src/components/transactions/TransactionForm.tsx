import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Transaction, 
  Account, 
  CreditCard,
  INCOME_CATEGORIES, 
  EXPENSE_CATEGORIES,
  IncomeCategory,
  ExpenseCategory 
} from '@/types/finance';
import { cn } from '@/lib/utils';

interface TransactionFormProps {
  accounts: Account[];
  creditCards: CreditCard[];
  onSubmit: (transaction: Omit<Transaction, 'id'>) => void;
  onClose: () => void;
}

export function TransactionForm({ accounts, creditCards, onSubmit, onClose }: TransactionFormProps) {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState<string>('');
  const [cardId, setCardId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'account' | 'card'>('account');

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description || !amount || !category) return;

    onSubmit({
      type,
      description,
      amount: parseFloat(amount),
      category: category as IncomeCategory | ExpenseCategory,
      date,
      accountId: paymentMethod === 'account' ? accountId : undefined,
      cardId: paymentMethod === 'card' ? cardId : undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm">
      <div className="bg-card rounded-3xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold">Novo Lançamento</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Type Toggle */}
          <div className="flex gap-2 p-1 bg-muted rounded-2xl">
            <button
              type="button"
              onClick={() => { setType('income'); setCategory(''); }}
              className={cn(
                "flex-1 py-2.5 px-4 rounded-xl font-medium text-sm transition-all",
                type === 'income' 
                  ? "bg-success text-success-foreground shadow-sm" 
                  : "text-muted-foreground"
              )}
            >
              Receita
            </button>
            <button
              type="button"
              onClick={() => { setType('expense'); setCategory(''); }}
              className={cn(
                "flex-1 py-2.5 px-4 rounded-xl font-medium text-sm transition-all",
                type === 'expense' 
                  ? "bg-danger text-danger-foreground shadow-sm" 
                  : "text-muted-foreground"
              )}
            >
              Despesa
            </button>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Supermercado"
              className="rounded-xl"
              required
            />
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Valor (R$)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              className="rounded-xl text-lg font-semibold"
              required
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Categoria</Label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(categories).map(([key, { label }]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategory(key)}
                  className={cn(
                    "py-2 px-3 rounded-xl text-xs font-medium transition-all border",
                    category === key 
                      ? type === 'income'
                        ? "bg-success text-success-foreground border-success"
                        : "bg-danger text-danger-foreground border-danger"
                      : "bg-muted/50 border-transparent hover:bg-muted"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl"
              required
            />
          </div>

          {/* Payment Method (only for expenses) */}
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
                      paymentMethod === 'account' 
                        ? "bg-primary text-primary-foreground border-primary" 
                        : "bg-muted/50 border-transparent"
                    )}
                  >
                    Conta
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={cn(
                      "flex-1 py-2.5 px-4 rounded-xl font-medium text-sm transition-all border",
                      paymentMethod === 'card' 
                        ? "bg-primary text-primary-foreground border-primary" 
                        : "bg-muted/50 border-transparent"
                    )}
                  >
                    Cartão
                  </button>
                </div>
              </div>

              {paymentMethod === 'account' && accounts.length > 0 && (
                <div className="space-y-2">
                  <Label>Conta</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {accounts.map((account) => (
                      <button
                        key={account.id}
                        type="button"
                        onClick={() => setAccountId(account.id)}
                        className={cn(
                          "py-2 px-3 rounded-xl text-sm font-medium transition-all border",
                          accountId === account.id 
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/50 border-transparent hover:bg-muted"
                        )}
                      >
                        {account.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {paymentMethod === 'card' && creditCards.length > 0 && (
                <div className="space-y-2">
                  <Label>Cartão</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {creditCards.map((card) => (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => setCardId(card.id)}
                        className={cn(
                          "py-2 px-3 rounded-xl text-sm font-medium transition-all border",
                          cardId === card.id 
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/50 border-transparent hover:bg-muted"
                        )}
                      >
                        {card.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Submit Button */}
          <Button 
            type="submit" 
            className={cn(
              "w-full rounded-xl py-6 font-semibold",
              type === 'income' 
                ? "bg-success hover:bg-success/90" 
                : "bg-danger hover:bg-danger/90"
            )}
          >
            {type === 'income' ? 'Adicionar Receita' : 'Adicionar Despesa'}
          </Button>
        </form>
      </div>
    </div>
  );
}
