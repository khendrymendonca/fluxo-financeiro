import { useState, useMemo } from 'react';
import { Calculator, TrendingUp, Minus, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EXPENSE_CATEGORIES, ExpenseCategory } from '@/types/finance';
import { cn } from '@/lib/utils';

interface WhatIfSimulatorProps {
  totalIncome: number;
  totalExpenses: number;
  categoryExpenses: Record<string, number>;
}

export function WhatIfSimulator({ totalIncome, totalExpenses, categoryExpenses }: WhatIfSimulatorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'remove' | 'reduce'>('remove');
  const [reductionPercentage, setReductionPercentage] = useState(50);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const currentBalance = totalIncome - totalExpenses;

  const simulation = useMemo(() => {
    if (!selectedCategory || !categoryExpenses[selectedCategory]) {
      return null;
    }

    const categoryAmount = categoryExpenses[selectedCategory];
    const savings = adjustmentType === 'remove' 
      ? categoryAmount 
      : (categoryAmount * reductionPercentage) / 100;
    
    const newExpenses = totalExpenses - savings;
    const newBalance = totalIncome - newExpenses;

    return {
      savings,
      newExpenses,
      newBalance,
      improvement: newBalance - currentBalance,
    };
  }, [selectedCategory, adjustmentType, reductionPercentage, categoryExpenses, totalIncome, totalExpenses, currentBalance]);

  const availableCategories = Object.entries(categoryExpenses)
    .filter(([_, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="card-elevated p-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-info-light">
          <Calculator className="w-5 h-5 text-info" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Simulador "E se?"</h2>
          <p className="text-sm text-muted-foreground">
            Veja quanto você poderia economizar
          </p>
        </div>
      </div>

      {/* Current Status */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 rounded-2xl bg-muted/50">
          <p className="text-sm text-muted-foreground">Saldo Atual</p>
          <p className={cn(
            "text-xl font-bold",
            currentBalance >= 0 ? "text-success" : "text-danger"
          )}>
            {formatCurrency(currentBalance)}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-muted/50">
          <p className="text-sm text-muted-foreground">Total Despesas</p>
          <p className="text-xl font-bold text-danger">
            {formatCurrency(totalExpenses)}
          </p>
        </div>
      </div>

      {/* Category Selection */}
      <div className="space-y-3 mb-6">
        <Label>Selecione uma categoria de gasto</Label>
        <div className="flex flex-wrap gap-2">
          {availableCategories.map(([category, amount]) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={cn(
                "py-2 px-4 rounded-xl text-sm font-medium transition-all border",
                selectedCategory === category 
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 border-transparent hover:bg-muted"
              )}
            >
              {EXPENSE_CATEGORIES[category as ExpenseCategory]?.label || category}
              <span className="ml-2 opacity-70">
                {formatCurrency(amount)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {selectedCategory && (
        <>
          {/* Adjustment Type */}
          <div className="space-y-3 mb-6">
            <Label>Tipo de ajuste</Label>
            <div className="flex gap-2">
              <button
                onClick={() => setAdjustmentType('remove')}
                className={cn(
                  "flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all border flex items-center justify-center gap-2",
                  adjustmentType === 'remove' 
                    ? "bg-danger text-danger-foreground border-danger"
                    : "bg-muted/50 border-transparent"
                )}
              >
                <Minus className="w-4 h-4" />
                Eliminar
              </button>
              <button
                onClick={() => setAdjustmentType('reduce')}
                className={cn(
                  "flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all border flex items-center justify-center gap-2",
                  adjustmentType === 'reduce' 
                    ? "bg-warning text-warning-foreground border-warning"
                    : "bg-muted/50 border-transparent"
                )}
              >
                <TrendingUp className="w-4 h-4" />
                Reduzir
              </button>
            </div>
          </div>

          {adjustmentType === 'reduce' && (
            <div className="space-y-3 mb-6">
              <Label>Porcentagem de redução: {reductionPercentage}%</Label>
              <input
                type="range"
                min="10"
                max="90"
                step="10"
                value={reductionPercentage}
                onChange={(e) => setReductionPercentage(parseInt(e.target.value))}
                className="w-full h-2 rounded-full appearance-none bg-muted cursor-pointer"
                style={{
                  background: `linear-gradient(to right, hsl(var(--primary)) ${reductionPercentage}%, hsl(var(--muted)) ${reductionPercentage}%)`,
                }}
              />
            </div>
          )}

          {/* Results */}
          {simulation && (
            <div className="p-5 rounded-2xl bg-success-light border border-success/20 space-y-4">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-success" />
                <h3 className="font-semibold text-success">Resultado da Simulação</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Economia</p>
                  <p className="text-2xl font-bold text-success">
                    +{formatCurrency(simulation.savings)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Novo Saldo</p>
                  <p className="text-2xl font-bold text-success">
                    {formatCurrency(simulation.newBalance)}
                  </p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                {adjustmentType === 'remove' 
                  ? `Eliminando completamente os gastos com ${EXPENSE_CATEGORIES[selectedCategory as ExpenseCategory]?.label}, você teria ${formatCurrency(simulation.savings)} a mais por mês.`
                  : `Reduzindo ${reductionPercentage}% dos gastos com ${EXPENSE_CATEGORIES[selectedCategory as ExpenseCategory]?.label}, você economizaria ${formatCurrency(simulation.savings)} por mês.`
                }
              </p>
            </div>
          )}
        </>
      )}

      {availableCategories.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Registre algumas despesas para usar o simulador
        </div>
      )}
    </div>
  );
}
