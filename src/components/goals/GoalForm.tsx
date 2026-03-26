import { useState } from 'react';
import { X, Target, Plane, Shield, PiggyBank, Home, Car, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SavingsGoal } from '@/types/finance';
import { cn } from '@/lib/utils';
import { ColorSelector, APP_COLORS } from '@/components/ui/ColorSelector';
import { format } from 'date-fns';

interface GoalFormProps {
  onSubmit: (goal: Omit<SavingsGoal, 'id' | 'userId'>) => void;
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

export function GoalForm({ onSubmit, onClose }: GoalFormProps) {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('0');
  const [deadline, setDeadline] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Target');
  const [selectedColor, setSelectedColor] = useState(APP_COLORS[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedTarget = parseFloat(targetAmount);
    const parsedCurrent = parseFloat(currentAmount) || 0;

    if (!name || isNaN(parsedTarget) || parsedTarget <= 0) return;

    // Garantir que o valor atual não supere o alvo na criação (opcional, mas evita bugs visuais)
    if (parsedCurrent > parsedTarget) {
      // Opcional: mostrar erro ou clamp. Vamos apenas garantir que não quebre.
    }

    onSubmit({
      name,
      targetAmount: parsedTarget,
      currentAmount: parsedCurrent,
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
              min={format(new Date(), 'yyyy-MM-dd')}
              value={deadline?.split('T')[0] || ''}
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
          <ColorSelector
            label="Cor"
            selectedColor={selectedColor}
            onSelect={setSelectedColor}
          />

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


