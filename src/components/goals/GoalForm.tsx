import { useState } from 'react';
import { X, Target, Plane, Shield, PiggyBank, Home, Car, GraduationCap, RotateCw, Plus, Trash2, Rocket, Map, CreditCard, Banknote, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SavingsGoal, GoalItem } from '@/types/finance';
import { cn } from '@/lib/utils';
import { ColorSelector, APP_COLORS } from '@/components/ui/ColorSelector';
import { format } from 'date-fns';
import { toast } from '@/components/ui/use-toast';

interface GoalFormProps {
  initialData?: SavingsGoal;
  onSubmit: (goal: Omit<SavingsGoal, 'id' | 'userId'>) => void;
  onClose: () => void;
}

const icons = [
  { name: 'Rocket', icon: Rocket },
  { name: 'Map', icon: Map },
  { name: 'Target', icon: Target },
  { name: 'Plane', icon: Plane },
  { name: 'Shield', icon: Shield },
  { name: 'PiggyBank', icon: PiggyBank },
  { name: 'Home', icon: Home },
  { name: 'Car', icon: Car },
  { name: 'GraduationCap', icon: GraduationCap },
];

export function GoalForm({ initialData, onSubmit, onClose }: GoalFormProps) {
  const {
    isAddingGoal,
    isUpdatingGoal
  } = useFinanceStore();

  const isPending = isAddingGoal || isUpdatingGoal;

  const [name, setName] = useState(initialData?.name || '');
  const [items, setItems] = useState<GoalItem[]>(initialData?.items || []);
  const [currentAmount, setCurrentAmount] = useState(initialData?.currentAmount.toString() || '0');
  const [deadline, setDeadline] = useState(initialData?.deadline || '');
  const [selectedIcon, setSelectedIcon] = useState(initialData?.icon || 'Rocket');
  const [selectedColor, setSelectedColor] = useState(initialData?.color || APP_COLORS[0]);

  const targetAmount = items.reduce((acc, item) => acc + item.value, 0);
  const creditLimitNeeded = items
    .filter(item => item.paymentMethod === 'credit')
    .reduce((acc, item) => acc + item.value, 0);

  const addItem = () => {
    setItems([...items, {
      id: crypto.randomUUID(),
      description: '',
      value: 0,
      paymentMethod: 'cash'
    }]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, updates: Partial<GoalItem>) => {
    setItems(items.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedCurrent = parseFloat(currentAmount) || 0;

    const errors: string[] = [];
    if (!name) errors.push('Título do Projeto');
    if (targetAmount <= 0) errors.push('Adicione pelo menos um item com valor');

    if (errors.length > 0) {
      toast({
        title: 'Dados incompletos',
        description: `Corrija: ${errors.join(', ')}`,
        variant: 'destructive'
      });
      return;
    }

    onSubmit({
      name,
      targetAmount,
      currentAmount: parsedCurrent,
      deadline: deadline || undefined,
      icon: selectedIcon,
      color: selectedColor,
      items
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm">
      <div className="bg-card rounded-3xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold italic">{initialData ? 'Editar Projeto' : 'Novo Projeto'}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-muted transition-colors text-zinc-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest text-zinc-500">Título do Projeto</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Viagem para o Japão"
              className="rounded-2xl h-12 font-bold bg-muted/30"
              required
            />
          </div>

          {/* Checklist de Itens */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-black uppercase tracking-widest text-zinc-500">Checklist do Projeto</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
                className="rounded-xl h-8 text-[10px] uppercase font-black"
              >
                <Plus className="w-3 h-3 mr-1" /> Add Item
              </Button>
            </div>

            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="p-4 rounded-2xl bg-muted/20 border border-muted/30 space-y-3 relative group">
                  <div className="flex gap-2">
                    <Input
                      placeholder="O que reservar? (ex: Passagens)"
                      value={item.description}
                      onChange={(e) => updateItem(item.id, { description: e.target.value })}
                      className="rounded-xl h-11 bg-white dark:bg-zinc-950 font-bold flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.id)}
                      className="h-11 w-11 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[9px] uppercase font-black text-zinc-500 ml-1">Valor Estimado</Label>
                      <Input
                        type="number"
                        placeholder="R$ 0,00"
                        value={item.value || ''}
                        onChange={(e) => updateItem(item.id, { value: parseFloat(e.target.value) || 0 })}
                        className="rounded-xl h-10 bg-white dark:bg-zinc-950 font-black text-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] uppercase font-black text-zinc-500 ml-1">Prazo Reserva</Label>
                      <Input
                        type="date"
                        value={item.deadline || ''}
                        onChange={(e) => updateItem(item.id, { deadline: e.target.value })}
                        className="rounded-xl h-10 bg-white dark:bg-zinc-950 font-bold"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => updateItem(item.id, { paymentMethod: 'cash' })}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 h-9 rounded-xl text-[10px] font-black uppercase transition-all border-2",
                        item.paymentMethod === 'cash'
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-white dark:bg-zinc-950 border-transparent text-zinc-400"
                      )}
                    >
                      <Banknote className="w-3 h-3" /> Dinheiro/Débito
                    </button>
                    <button
                      type="button"
                      onClick={() => updateItem(item.id, { paymentMethod: 'credit' })}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 h-9 rounded-xl text-[10px] font-black uppercase transition-all border-2",
                        item.paymentMethod === 'credit'
                          ? "bg-amber-500/10 border-amber-500 text-amber-500"
                          : "bg-white dark:bg-zinc-950 border-transparent text-zinc-400"
                      )}
                    >
                      <CreditCard className="w-3 h-3" /> Cartão Crédito
                    </button>
                  </div>
                </div>
              ))}

              {items.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-muted rounded-[2rem]">
                  <Rocket className="w-8 h-8 text-muted mx-auto mb-2 opacity-20" />
                  <p className="text-xs text-muted-foreground font-bold">Liste os passos para realizar este sonho.</p>
                </div>
              )}
            </div>
          </div>

          {/* Resumo Financeiro do Projeto */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 space-y-1">
              <Label className="text-[10px] font-black uppercase text-primary">Custo Total</Label>
              <p className="text-xl font-black text-primary truncate">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(targetAmount)}
              </p>
            </div>
            <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10 space-y-1">
              <Label className="text-[10px] font-black uppercase text-amber-600">Limite Cartão</Label>
              <p className="text-xl font-black text-amber-600 truncate">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(creditLimitNeeded)}
              </p>
            </div>
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
          <Button type="submit" disabled={isPending} className="w-full h-12 rounded-2xl font-black text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
            {isPending ? (
              <div className="flex items-center gap-2">
                <RotateCw className="w-5 h-5 animate-spin" />
                <span>Salvando...</span>
              </div>
            ) : (
              initialData ? 'Salvar Projeto' : 'Lançar Projeto'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
