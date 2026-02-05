import { useState } from 'react';
import { Target, Plane, Shield, PiggyBank, Plus, Minus, Trash2 } from 'lucide-react';
import { SavingsGoal } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface GoalCardProps {
  goal: SavingsGoal;
  onUpdate: (id: string, updates: Partial<SavingsGoal>) => void;
  onDelete: (id: string) => void;
}

const iconMap: Record<string, any> = {
  Target,
  Plane,
  Shield,
  PiggyBank,
};

export function GoalCard({ goal, onUpdate, onDelete }: GoalCardProps) {
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [fundAmount, setFundAmount] = useState('');

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
    if (isNaN(amount) || amount <= 0) return;
    
    onUpdate(goal.id, { 
      currentAmount: Math.min(goal.currentAmount + amount, goal.targetAmount) 
    });
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
        <div className="flex gap-2 pt-2">
          <Input
            type="number"
            value={fundAmount}
            onChange={(e) => setFundAmount(e.target.value)}
            placeholder="Valor"
            className="rounded-xl"
          />
          <Button 
            onClick={handleAddFunds}
            size="icon"
            className="rounded-xl bg-success hover:bg-success/90"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button 
            onClick={handleRemoveFunds}
            size="icon"
            variant="outline"
            className="rounded-xl border-danger text-danger hover:bg-danger-light"
          >
            <Minus className="w-4 h-4" />
          </Button>
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
