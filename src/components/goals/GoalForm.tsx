import { useState } from 'react';
import {
  X,
  Target,
  Plane,
  Shield,
  PiggyBank,
  Home,
  Car,
  GraduationCap,
  RotateCw,
  Plus,
  Trash2,
  Rocket,
  Map,
  CreditCard,
  Banknote,
  Calendar,
  Cloud,
  Briefcase,
  ChevronLeft
} from 'lucide-react';
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
  const { isAddingGoal, isUpdatingGoal } = useFinanceStore();
  const isPending = isAddingGoal || isUpdatingGoal;

  const [step, setStep] = useState(initialData ? 2 : 1);
  const [projectType, setProjectType] = useState<'sonho' | 'projeto'>(initialData?.projectType || 'projeto');

  const [name, setName] = useState(initialData?.name || '');
  const [purpose, setPurpose] = useState(initialData?.purpose || '');
  const [dreamStartDate, setDreamStartDate] = useState(initialData?.dreamStartDate || '');
  const [items, setItems] = useState<GoalItem[]>(initialData?.items || []);
  const [currentAmount] = useState(initialData?.currentAmount?.toString() || '0');
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
      paymentMethod: 'cash',
      completed: false
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

    const errors: string[] = [];
    if (!name) errors.push('Título');
    if (projectType === 'projeto' && !deadline) errors.push('Data Prevista (Obrigatória para Projetos)');
    if (items.length === 0) errors.push('Adicione pelo menos um item ao checklist');

    if (errors.length > 0) {
      toast({
        title: 'Atenção',
        description: errors.join(', '),
        variant: 'destructive'
      });
      return;
    }

    onSubmit({
      name,
      projectType,
      purpose,
      dreamStartDate: dreamStartDate || undefined,
      targetAmount,
      currentAmount: parseFloat(currentAmount) || 0,
      deadline: deadline || undefined,
      icon: selectedIcon,
      color: selectedColor,
      items
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm">
      <div className="bg-card rounded-[2.5rem] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-scale-in border border-border">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-muted/20">
          <div className="flex items-center gap-3">
            {step === 2 && !initialData && (
              <button
                onClick={() => setStep(1)}
                className="p-2 hover:bg-muted rounded-xl transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-xl font-black italic tracking-tight">
              {initialData ? 'Ajustar Detalhes' : step === 1 ? 'Lançar Novo Registro' : `Novo ${projectType === 'sonho' ? 'Sonho' : 'Projeto'}`}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors text-zinc-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
          {step === 1 ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <p className="text-center text-zinc-500 font-bold text-sm mb-4">O que você está planejando agora?</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => { setProjectType('sonho'); setStep(2); }}
                  className="flex flex-col items-center gap-4 p-8 rounded-[2rem] border-2 border-muted hover:border-primary hover:bg-primary/5 transition-all group text-center"
                >
                  <div className="w-16 h-16 rounded-3xl bg-sky-500/10 text-sky-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                    <Cloud className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg">É um Sonho</h3>
                    <p className="text-[10px] uppercase font-black text-zinc-400 tracking-widest mt-1">Aspiracional • Sem data fixa</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => { setProjectType('projeto'); setStep(2); }}
                  className="flex flex-col items-center gap-4 p-8 rounded-[2rem] border-2 border-muted hover:border-primary hover:bg-primary/5 transition-all group text-center"
                >
                  <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                    <Briefcase className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg">É um Projeto</h3>
                    <p className="text-[10px] uppercase font-black text-zinc-400 tracking-widest mt-1">Execução • Com prazo e foco</p>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              {/* Common Fields */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Título do {projectType === 'sonho' ? 'Sonho' : 'Projeto'}</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={projectType === 'sonho' ? "Ex: Viagem dos Sonhos" : "Ex: Reforma da Cozinha"}
                    className="h-14 rounded-2xl border-2 border-muted focus:border-primary transition-all font-black text-lg bg-muted/10 outline-none px-6"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">
                    {projectType === 'sonho' ? 'Qual é o seu sonho?' : 'Qual a finalidade deste projeto?'}
                  </Label>
                  <textarea
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full min-h-[100px] p-4 rounded-2xl border-2 border-muted focus:border-primary transition-all bg-muted/10 font-bold text-sm outline-none resize-none"
                    placeholder="Descreva brevemente..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projectType === 'sonho' ? (
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Desde quando sonha?</Label>
                      <Input
                        type="date"
                        value={dreamStartDate}
                        onChange={(e) => setDreamStartDate(e.target.value)}
                        className="h-12 rounded-2xl border-2 border-muted font-bold px-4"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Previsão de Finalização</Label>
                      <Input
                        type="date"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        className="h-12 rounded-2xl border-2 border-muted font-black text-primary px-4"
                        required
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Ícone Representativo</Label>
                    <div className="flex gap-1 bg-muted/20 p-1 rounded-2xl overflow-x-auto no-scrollbar">
                      {icons.map(({ name: n, icon: Icon }) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setSelectedIcon(n)}
                          className={cn(
                            "p-2 rounded-xl transition-all shrink-0",
                            selectedIcon === n ? "bg-primary text-white shadow-lg" : "hover:bg-muted"
                          )}
                        >
                          <Icon className="w-4 h-4" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Checklist Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Custo e Execução</h3>
                  <Button type="button" onClick={addItem} variant="secondary" className="h-8 rounded-xl text-[9px] font-black px-4 uppercase">
                    <Plus className="w-3 h-3 mr-1" /> Adicionar Item
                  </Button>
                </div>

                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.id} className="p-5 rounded-[2rem] bg-muted/20 border border-muted/30 space-y-4 animate-in slide-in-from-top-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Descrição do item"
                          value={item.description}
                          onChange={(e) => updateItem(item.id, { description: e.target.value })}
                          className="h-12 rounded-xl font-bold bg-white dark:bg-zinc-950 flex-1"
                        />
                        <button type="button" onClick={() => removeItem(item.id)} className="text-red-500 hover:bg-red-50 p-3 rounded-xl transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[9px] font-black text-zinc-400 ml-1">VALOR (R$)</Label>
                          <Input
                            type="number"
                            value={item.value || ''}
                            onChange={(e) => updateItem(item.id, { value: parseFloat(e.target.value) || 0 })}
                            className="h-10 rounded-xl font-black text-primary bg-white dark:bg-zinc-950 px-4"
                          />
                        </div>
                        <div className="flex gap-1 pt-4">
                          <button
                            type="button"
                            onClick={() => updateItem(item.id, { paymentMethod: 'cash' })}
                            className={cn(
                              "flex-1 h-10 rounded-xl text-[9px] font-black uppercase border-2 transition-all",
                              item.paymentMethod === 'cash' ? "bg-primary/10 border-primary text-primary" : "border-transparent text-zinc-400"
                            )}
                          >
                            <Banknote className="w-3 h-3 mx-auto" title="Dinheiro" />
                          </button>
                          <button
                            type="button"
                            onClick={() => updateItem(item.id, { paymentMethod: 'credit' })}
                            className={cn(
                              "flex-1 h-10 rounded-xl text-[9px] font-black uppercase border-2 transition-all",
                              item.paymentMethod === 'credit' ? "bg-amber-500/10 border-amber-500 text-amber-500" : "border-transparent text-zinc-400"
                            )}
                          >
                            <CreditCard className="w-3 h-3 mx-auto" title="Cartão" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Visuals */}
              <div className="p-6 bg-zinc-950/5 dark:bg-zinc-50/5 rounded-[2rem] space-y-6">
                <ColorSelector label="Paleta de Cores" selectedColor={selectedColor} onSelect={setSelectedColor} />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 text-center">
                    <p className="text-[9px] font-black uppercase text-zinc-400 mb-1">Custo Projetado</p>
                    <p className="text-xl font-black text-primary">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(targetAmount)}</p>
                  </div>
                  <div className="space-y-1 text-center">
                    <p className="text-[9px] font-black uppercase text-zinc-400 mb-1">Limite Cartão</p>
                    <p className="text-xl font-black text-amber-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(creditLimitNeeded)}</p>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <Button type="submit" disabled={isPending} className="w-full h-16 rounded-[2rem] font-black text-lg shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all">
                {isPending ? <RotateCw className="w-6 h-6 animate-spin mr-2" /> : (initialData ? 'Confirmar Ajustes' : `Lançar ${projectType === 'sonho' ? 'Sonho' : 'Projeto'}`)}
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
