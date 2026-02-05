import { useState } from 'react';
import { X, Target, Plane, Shield, PiggyBank, Home, Car, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SavingsGoal } from '@/types/finance';
import { cn } from '@/lib/utils';

interface GoalFormProps {
  onSubmit: (goal: Omit<SavingsGoal, 'id'>) => void;
  onClose: () => void;
}

const icons = [
  { name: 'Target', icon: Target },
  { name: 'Plane', icon: Plane },
  { name: 'Shield', icon: Shield },
  { name: 'PiggyBank', icon: PiggyBank },
  { name: 'Home', icon: Home },
  { name: 'Car', icon: Car },
  { name: 'GraduationCap', icon: GraduationCap },
];

const colors = [
  '#10B981', // green
  '#3B82F6', // blue
  '#8B5CF6', // purple
  '#F97316', // orange
  '#EC4899', // pink
  '#14B8A6', // teal
];

export function GoalForm({ onSubmit, onClose }: GoalFormProps) {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('0');
  const [deadline, setDeadline] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Target');
  const [selectedColor, setSelectedColor] = useState(colors[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !targetAmount) return;

    onSubmit({
      name,
      targetAmount: parseFloat(targetAmount),
      currentAmount: parseFloat(currentAmount) || 0,
      deadline: deadline || undefined,
      icon: selectedIcon,
      color: selectedColor,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm">
      <div className="bg-card rounded-3xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold">Nova Meta</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Meta</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Reserva de Emergência"
              className="rounded-xl"
              required
            />
          </div>

          {/* Target Amount */}
          <div className="space-y-2">
            <Label htmlFor="targetAmount">Valor Alvo (R$)</Label>
            <Input
              id="targetAmount"
              type="number"
              step="0.01"
              min="0"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="10000.00"
              className="rounded-xl text-lg font-semibold"
              required
            />
          </div>

          {/* Current Amount */}
          <div className="space-y-2">
            <Label htmlFor="currentAmount">Valor Atual (R$)</Label>
            <Input
              id="currentAmount"
              type="number"
              step="0.01"
              min="0"
              value={currentAmount}
              onChange={(e) => setCurrentAmount(e.target.value)}
              placeholder="0.00"
              className="rounded-xl"
            />
          </div>

          {/* Deadline */}
          <div className="space-y-2">
            <Label htmlFor="deadline">Data Limite (opcional)</Label>
            <Input
              id="deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="rounded-xl"
            />
          </div>

          {/* Icon Selection */}
          <div className="space-y-2">
            <Label>Ícone</Label>
            <div className="flex gap-2 flex-wrap">
              {icons.map(({ name, icon: Icon }) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setSelectedIcon(name)}
                  className={cn(
                    "p-3 rounded-xl transition-all",
                    selectedIcon === name 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  <Icon className="w-5 h-5" />
                </button>
              ))}
            </div>
          </div>

          {/* Color Selection */}
          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex gap-2">
              {colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={cn(
                    "w-10 h-10 rounded-xl transition-all",
                    selectedColor === color && "ring-2 ring-offset-2 ring-foreground"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full rounded-xl py-6 font-semibold bg-info hover:bg-info/90"
          >
            Criar Meta
          </Button>
        </form>
      </div>
    </div>
  );
}
