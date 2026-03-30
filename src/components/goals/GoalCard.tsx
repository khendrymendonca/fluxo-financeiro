import { useState } from 'react';
import { Target, Plane, Shield, PiggyBank, Plus, X, Trash2, Wallet, Minus, Rocket, Map, Calendar } from 'lucide-react';
import { SavingsGoal, Account } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/formatters';
import { parseLocalDate } from '@/utils/dateUtils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GoalCardProps {
  goal: SavingsGoal;
  accounts: Account[];
  onUpdate: (id: string, updates: Partial<SavingsGoal>) => void;
  onDelete: (id: string) => void;
  onDeposit: (goalId: string, amount: number, accountId: string) => void;
  onEdit?: (goal: SavingsGoal) => void;
}

const iconMap: Record<string, any> = {
  Rocket,
  Map,
  Target,
  Plane,
  Shield,
  PiggyBank,
};

export function GoalCard({ goal, accounts, onUpdate, onDelete, onDeposit, onEdit }: GoalCardProps) {
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [fundAmount, setFundAmount] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');

  const progress = goal.targetAmount > 0
    ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
    : 0;

  const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);
  const isCompleted = goal.currentAmount >= goal.targetAmount;
  const Icon = iconMap[goal.icon || 'Rocket'] || Rocket;

  // Cálculo de Planejamento Mensal
  const getMonthlyPace = () => {
    if (!goal.deadline || isCompleted) return null;

    const now = new Date();
    const target = parseLocalDate(goal.deadline);

    const diffMonths = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
    const monthsRemaining = diffMonths > 0 ? diffMonths : 0;

    if (monthsRemaining === 0) return { months: 0, amount: remaining };

    return {
      months: monthsRemaining,
      amount: remaining / monthsRemaining
    };
  };

  const planning = getMonthlyPace();

  const handleAddFunds = () => {
    const amount = parseFloat(fundAmount);
    if (isNaN(amount) || amount <= 0 || !selectedAccountId) return;

    onDeposit(goal.id, amount, selectedAccountId);

    setFundAmount('');
    setShowAddFunds(false);
  };

  const handleRemoveFunds = () => {
    const amount = parseFloat(fundAmount);
    if (isNaN(amount) || amount <= 0 || !selectedAccountId) return;

    // Remove fundos da meta e DEVOLVE para a conta bancária (onDeposit com sinal negativo)
    onDeposit(goal.id, -amount, selectedAccountId);

    setFundAmount('');
    setShowAddFunds(false);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm dark:shadow-none border border-gray-100 dark:border-zinc-800 space-y-4 animate-fade-in group">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="p-3 rounded-2xl"
            style={{ backgroundColor: `${goal.color}20` }}
          >
            <Icon className="w-6 h-6" style={{ color: goal.color }} />
          </div>
          <div>
            <h3 className="font-black text-xl text-gray-900 dark:text-zinc-50 tracking-tight">{goal.name}</h3>
            {goal.deadline && (
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Prazo: {format(parseLocalDate(goal.deadline), "MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
          {onEdit && (
            <button
              onClick={() => onEdit(goal)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400 transition-all"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onDelete(goal.id)}
            className="p-2 rounded-lg hover:bg-danger-light text-danger transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
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
        <div className="h-3 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${goal.color} 0%, ${goal.color}aa 100%)`,
            }}
          />
        </div>
        {!isCompleted ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground font-medium">
              Faltam <span className="font-bold text-gray-900 dark:text-zinc-200">{formatCurrency(remaining)}</span> para realizar este sonho
            </p>

            {planning && (
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-950/50 border border-gray-100 dark:border-zinc-800 animate-in fade-in slide-in-from-right-2 duration-500">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Planejamento Rápido</p>
                <p className="text-sm font-bold text-gray-700 dark:text-zinc-300">
                  {planning.months > 0 ? (
                    <>Faltam <span className="text-primary">{planning.months} meses</span>. Guarde <span className="text-primary">{formatCurrency(planning.amount)}/mês</span>.</>
                  ) : (
                    <>Falta <span className="text-primary">menos de 1 mês</span>. Guarde <span className="text-primary">{formatCurrency(planning.amount)}</span> agora.</>
                  )}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="py-4 px-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl animate-bounce">
            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-black text-center flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> Sonho Realizado! Parabéns! 🎉
            </p>
          </div>
        )}
      </div>

      {/* Add/Remove Funds */}
      {showAddFunds ? (
        <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase text-muted-foreground ml-1">Retirar de qual conta?</p>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full h-11 rounded-xl border-2 border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1 text-sm font-bold text-gray-900 dark:text-zinc-50 focus:border-primary/50 outline-none"
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
              className="rounded-xl h-11 border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-50 font-bold"
            />
            <Button
              onClick={handleAddFunds}
              size="icon"
              title="Adicionar Fundos"
              className="rounded-xl h-11 w-12 bg-success hover:bg-success/90 shrink-0"
              disabled={!selectedAccountId || !fundAmount}
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              onClick={handleRemoveFunds}
              size="icon"
              variant="outline"
              title="Retirar Fundos"
              className="rounded-xl h-11 w-12 border-danger text-danger hover:bg-danger/5 shrink-0"
              disabled={!selectedAccountId || !fundAmount}
            >
              <Minus className="w-4 h-4" />
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


