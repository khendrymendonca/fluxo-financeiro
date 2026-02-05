import { useState } from 'react';
import { TrendingDown, Plus, Trash2, X, AlertTriangle } from 'lucide-react';
import { Debt } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface DebtsManagerProps {
  debts: Debt[];
  onAddDebt: (debt: Omit<Debt, 'id'>) => void;
  onUpdateDebt: (id: string, updates: Partial<Debt>) => void;
  onDeleteDebt: (id: string) => void;
}

export function DebtsManager({
  debts,
  onAddDebt,
  onUpdateDebt,
  onDeleteDebt,
}: DebtsManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [remainingAmount, setRemainingAmount] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [interestRate, setInterestRate] = useState('');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !totalAmount || !remainingAmount || !monthlyPayment) return;

    onAddDebt({
      name,
      totalAmount: parseFloat(totalAmount),
      remainingAmount: parseFloat(remainingAmount),
      monthlyPayment: parseFloat(monthlyPayment),
      interestRate: parseFloat(interestRate) || 0,
      startDate: new Date().toISOString(),
    });

    setName('');
    setTotalAmount('');
    setRemainingAmount('');
    setMonthlyPayment('');
    setInterestRate('');
    setShowForm(false);
  };

  const handlePayment = (debt: Debt) => {
    const newRemaining = Math.max(0, debt.remainingAmount - debt.monthlyPayment);
    onUpdateDebt(debt.id, { remainingAmount: newRemaining });
  };

  const totalDebt = debts.reduce((sum, d) => sum + d.remainingAmount, 0);
  const totalMonthly = debts.reduce((sum, d) => sum + d.monthlyPayment, 0);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="card-elevated p-6 animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-danger-light">
            <TrendingDown className="w-5 h-5 text-danger" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Controle de Dívidas</h2>
            <p className="text-sm text-muted-foreground">
              Acompanhe e quite suas dívidas
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-danger-light">
            <p className="text-sm text-muted-foreground">Total em Dívidas</p>
            <p className="text-2xl font-bold text-danger">
              {formatCurrency(totalDebt)}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-warning-light">
            <p className="text-sm text-muted-foreground">Parcelas Mensais</p>
            <p className="text-2xl font-bold text-warning">
              {formatCurrency(totalMonthly)}
            </p>
          </div>
        </div>
      </div>

      {/* Add Button */}
      <Button 
        onClick={() => setShowForm(true)}
        className="w-full rounded-xl py-6"
        variant="outline"
      >
        <Plus className="w-5 h-5 mr-2" />
        Adicionar Dívida
      </Button>

      {/* Debts List */}
      <div className="space-y-4">
        {debts.length === 0 ? (
          <div className="card-elevated p-12 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhuma dívida cadastrada</p>
            <p className="text-sm text-muted-foreground mt-1">
              Que bom! Continue assim 🎉
            </p>
          </div>
        ) : (
          debts.map((debt) => {
            const progress = ((debt.totalAmount - debt.remainingAmount) / debt.totalAmount) * 100;
            const monthsRemaining = Math.ceil(debt.remainingAmount / debt.monthlyPayment);
            
            return (
              <div 
                key={debt.id}
                className="card-elevated p-5 space-y-4 group animate-fade-in"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{debt.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {debt.interestRate > 0 && `${debt.interestRate}% a.m. • `}
                      ~{monthsRemaining} meses restantes
                    </p>
                  </div>
                  <button
                    onClick={() => onDeleteDebt(debt.id)}
                    className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-danger-light text-danger transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Pago: {formatCurrency(debt.totalAmount - debt.remainingAmount)}
                    </span>
                    <span className="font-medium text-danger">
                      Falta: {formatCurrency(debt.remainingAmount)}
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-success transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-right">
                    {progress.toFixed(1)}% quitado
                  </p>
                </div>

                {/* Payment Button */}
                <Button
                  onClick={() => handlePayment(debt)}
                  variant="outline"
                  className="w-full rounded-xl border-success text-success hover:bg-success-light"
                  disabled={debt.remainingAmount === 0}
                >
                  Registrar Pagamento de {formatCurrency(debt.monthlyPayment)}
                </Button>
              </div>
            );
          })
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm">
          <div className="bg-card rounded-3xl shadow-xl w-full max-w-md animate-scale-in">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-semibold">Nova Dívida</h2>
              <button 
                onClick={() => setShowForm(false)}
                className="p-2 rounded-xl hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Nome/Descrição</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Financiamento Carro"
                  className="rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Valor Total (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="50000.00"
                  className="rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Valor Restante (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={remainingAmount}
                  onChange={(e) => setRemainingAmount(e.target.value)}
                  placeholder="35000.00"
                  className="rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Parcela Mensal (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={monthlyPayment}
                  onChange={(e) => setMonthlyPayment(e.target.value)}
                  placeholder="1200.00"
                  className="rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Taxa de Juros Mensal (%) - opcional</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  placeholder="1.5"
                  className="rounded-xl"
                />
              </div>
              <Button type="submit" className="w-full rounded-xl bg-danger hover:bg-danger/90">
                Adicionar Dívida
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
