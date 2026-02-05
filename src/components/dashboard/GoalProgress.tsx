import { Target, Plane, Shield, PiggyBank } from 'lucide-react';
import { SavingsGoal } from '@/types/finance';
import { cn } from '@/lib/utils';

interface GoalProgressProps {
  goals: SavingsGoal[];
}

const iconMap: Record<string, any> = {
  Target,
  Plane,
  Shield,
  PiggyBank,
};

export function GoalProgress({ goals }: GoalProgressProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (goals.length === 0) {
    return (
      <div className="card-elevated p-6 animate-fade-in">
        <h3 className="text-lg font-semibold mb-4">Metas de Economia</h3>
        <p className="text-muted-foreground text-center py-8">
          Nenhuma meta definida ainda
        </p>
      </div>
    );
  }

  return (
    <div className="card-elevated p-6 animate-fade-in">
      <h3 className="text-lg font-semibold mb-4">Metas de Economia</h3>
      <div className="space-y-4">
        {goals.map((goal) => {
          const progress = (goal.currentAmount / goal.targetAmount) * 100;
          const Icon = iconMap[goal.icon || 'Target'] || Target;
          
          return (
            <div key={goal.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="p-2 rounded-xl"
                    style={{ backgroundColor: `${goal.color}20` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: goal.color }} />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{goal.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(goal.currentAmount)} de {formatCurrency(goal.targetAmount)}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold" style={{ color: goal.color }}>
                  {progress.toFixed(0)}%
                </span>
              </div>
              <div className="progress-gradient">
                <div 
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{ 
                    width: `${Math.min(progress, 100)}%`,
                    background: `linear-gradient(90deg, ${goal.color} 0%, ${goal.color}88 100%)`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
