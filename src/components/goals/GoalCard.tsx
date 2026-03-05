import { useState } from 'react';
import { Target, Plane, Shield, PiggyBank, Plus, X, Trash2, Wallet } from 'lucide-react';
import { SavingsGoal, Account } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface GoalCardProps {
  goal: SavingsGoal;
  accounts: Account[];
  onUpdate: (id: string, updates: Partial<SavingsGoal>) => void;
  onDelete: (id: string) => void;
  onDeposit: (goalId: string, amount: number, accountId: string) => void;
}

const iconMap: Record<string, any> = {
  Target,
  Plane,
  Shield,
  PiggyBank,
};

export function GoalCard({ goal, accounts, onUpdate, onDelete, onDeposit }: GoalCardProps) {
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [fundAmount, setFundAmount] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');

  const progress = (goal.currentAmount / goal.targetAmount) * 100;
  const remaining = goal.targetAmount - goal.currentAmount;
  const Icon = iconMap[goal.icon || 'Target'] || Target;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleAddFunds = () => {
    const amount = parseFloat(fundAmount);
    if (isNaN(amount) || amount <= 0 || !selectedAccountId) return;

    onDeposit(goal.id, amount, selectedAccountId);

    setFundAmount('');
    setShowAddFunds(false);
  };

  const handleRemoveFunds = () => {
    const amount = parseFloat(fundAmount);
    if (isNaN(amount) || amount <= 0) return;

    onUpdate(goal.id, {
      currentAmount: Math.max(goal.currentAmount - amount, 0)
    });
    setFundAmount('');
    setShowAddFunds(false);
  };

  return (
    <div className="card-elevated p-6 space-y-4 animate-fade-in group">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="p-3 rounded-2xl"
            style={{ backgroundColor: `${goal.color}20` }}
          >
            <Icon className="w-6 h-6" style={{ color: goal.color }} />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{goal.name}</h3>
            {goal.deadline && (
              <p className="text-sm text-muted-foreground">
                Meta: {new Date(goal.deadline).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => onDelete(goal.id)}
          className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-danger-light text-danger transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {formatCurrency(goal.currentAmount)} de {formatCurrency(goal.targetAmount)}
          </span>
          <span className="font-semibold" style={{ color: goal.color }}>
            {progress.toFixed(1)}%
          </span>
        </div>
        <div className="h-3 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${Math.min(progress, 100)}%`,
              background: `linear-gradient(90deg, ${goal.color} 0%, ${goal.color}aa 100%)`,
            }}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Faltam {formatCurrency(remaining)} para atingir a meta
        </p>
      </div>

      {/* Add/Remove Funds */}
      {showAddFunds ? (
        <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase text-muted-foreground ml-1">Retirar de qual conta?</p>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full h-11 rounded-xl border-2 border-input bg-background px-3 py-1 text-sm font-bold focus:border-primary/50 outline-none"
            >
              <option value="">Selecione uma conta</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.bank} - {acc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <Input
              type="number"
              value={fundAmount}
              onChange={(e) => setFundAmount(e.target.value)}
              placeholder="Valor"
              className="rounded-xl h-11 border-2 font-bold"
            />
            <Button
              onClick={handleAddFunds}
              size="icon"
              className="rounded-xl h-11 w-12 bg-success hover:bg-success/90 shrink-0"
              disabled={!selectedAccountId || !fundAmount}
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => setShowAddFunds(false)}
              size="icon"
              variant="outline"
              className="rounded-xl h-11 w-12 border-muted text-muted-foreground shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        <Button
          onClick={() => setShowAddFunds(true)}
          variant="outline"
          className="w-full rounded-xl"
          style={{ borderColor: goal.color, color: goal.color }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Valor
        </Button>
      )}
    </div>
  );
}
