import { useState } from 'react';
import {
  Target,
  Plane,
  Shield,
  PiggyBank,
  Plus,
  X,
  Trash2,
  Wallet,
  Minus,
  Rocket,
  Map,
  Calendar,
  CreditCard,
  Banknote
} from 'lucide-react';
import { SavingsGoal, Account } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/formatters';
import { parseLocalDate } from '@/utils/dateUtils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GoalAportModal } from './GoalAportModal';

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
  const [showAportModal, setShowAportModal] = useState(false);
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

  const sortedItems = [...(goal.items || [])].sort((a, b) => {
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

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
    onDeposit(goal.id, -amount, selectedAccountId);
    setFundAmount('');
    setShowAddFunds(false);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-6 shadow-sm dark:shadow-none border border-gray-100 dark:border-zinc-800 space-y-6 animate-fade-in group">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner"
            style={{ backgroundColor: `${goal.color}15` }}
          >
            <Icon className="w-7 h-7" style={{ color: goal.color }} />
          </div>
          <div>
            <h3 className="font-black text-xl text-gray-900 dark:text-zinc-50 tracking-tight leading-tight">{goal.name}</h3>
            {goal.deadline && (
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1 mt-1">
                <Calendar className="w-3 h-3" />
                Prazo: {format(parseLocalDate(goal.deadline), "MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
          {onEdit && (
            <button onClick={() => onEdit(goal)} className="p-2 rounded-xl hover:bg-muted text-zinc-400 transition-all">
              <Plus className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => onDelete(goal.id)} className="p-2 rounded-xl hover:bg-danger-light text-danger transition-all">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm items-end">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Saldo do Projeto</span>
            <span className="font-black text-lg text-gray-900 dark:text-zinc-100">{formatCurrency(goal.currentAmount)}</span>
          </div>
          <span className="font-black text-primary text-xl" style={{ color: goal.color }}>
            {progress.toFixed(0)}%
          </span>
        </div>
        <div className="h-4 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden border-2 border-white dark:border-zinc-900 shadow-sm">
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${goal.color} 0%, ${goal.color}aa 100%)`,
            }}
          />
        </div>
      </div>

      {/* Planejamento Rápido */}
      {!isCompleted && planning && (
        <div className="p-4 rounded-[1.5rem] bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800 animate-in fade-in slide-in-from-right-2 duration-500">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">Passo a Passo Financeiro</p>
          <p className="text-sm font-bold text-gray-700 dark:text-zinc-300 leading-snug">
            {planning.months > 0 ? (
              <>Você precisa guardar <span className="text-primary font-black">{formatCurrency(planning.amount)}/mês</span> para realizar este sonho.</>
            ) : (
              <>A data está próxima! Guarde <span className="text-primary font-black">{formatCurrency(planning.amount)}</span> agora.</>
            )}
          </p>
        </div>
      )}

      {/* Cronograma de Reservas */}
      {sortedItems.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Cronograma de Itens</p>
          <div className="grid grid-cols-1 gap-2">
            {sortedItems.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-2xl bg-muted/20 border border-muted/10">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    item.paymentMethod === 'credit' ? "bg-amber-500/10 text-amber-500" : "bg-primary/10 text-primary"
                  )}>
                    {item.paymentMethod === 'credit' ? <CreditCard className="w-4 h-4" /> : <Banknote className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold truncate leading-none mb-1">{item.description}</p>
                    <p className="text-[9px] uppercase font-black text-zinc-400">
                      {item.deadline ? format(parseLocalDate(item.deadline), "dd/MM/yy") : 'Sem prazo'} • {item.paymentMethod === 'credit' ? 'Cartão' : 'À Vista'}
                    </p>
                  </div>
                </div>
                <p className="text-xs font-black text-right shrink-0">{formatCurrency(item.value)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {isCompleted ? (
        <div className="py-4 px-6 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl animate-bounce">
          <p className="text-sm text-emerald-600 dark:text-emerald-400 font-black text-center flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Projeto Realizado! Parabéns! 🎉
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 pt-2">
          <Button
            onClick={() => setShowAportModal(true)}
            className="w-full rounded-[1.5rem] h-14 font-black text-xs uppercase tracking-[0.15em] shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <PiggyBank className="w-5 h-5 mr-3" />
            Guardar Dinheiro (Caixinha)
          </Button>

          <button
            onClick={() => setShowAddFunds(!showAddFunds)}
            className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-primary transition-colors text-center"
          >
            Ajustar saldo manualmente
          </button>
        </div>
      )}

      {showAportModal && (
        <GoalAportModal
          goal={goal}
          accounts={accounts}
          onClose={() => setShowAportModal(false)}
        />
      )}

      {/* Modal de Ajuste Manual (Original Refatorado) */}
      {showAddFunds && (
        <div className="pt-4 border-t border-border space-y-3 animate-in slide-in-from-top-2 duration-300">
          <div className="space-y-2">
            <p className="text-[9px] font-black uppercase text-zinc-500 ml-1 tracking-widest">Origem do Ajuste</p>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full h-11 rounded-xl border-2 border-muted bg-white dark:bg-zinc-950 px-3 text-sm font-bold text-gray-900 dark:text-zinc-50 focus:border-primary outline-none transition-all"
            >
              <option value="">Selecione a conta...</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name} - R$ {acc.balance.toLocaleString()}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <Input
              type="number"
              value={fundAmount}
              onChange={(e) => setFundAmount(e.target.value)}
              placeholder="Valor"
              className="rounded-xl h-11 border-2 border-muted bg-white dark:bg-zinc-950 text-gray-900 dark:text-zinc-50 font-black"
            />
            <Button
              onClick={handleAddFunds}
              size="icon"
              className="rounded-xl h-11 w-12 bg-emerald-500 hover:bg-emerald-600 shrink-0"
              disabled={!selectedAccountId || !fundAmount}
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              onClick={handleRemoveFunds}
              size="icon"
              variant="outline"
              className="rounded-xl h-11 w-12 border-red-500 text-red-500 hover:bg-red-50 shrink-0"
              disabled={!selectedAccountId || !fundAmount}
            >
              <Minus className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => setShowAddFunds(false)}
              size="icon"
              variant="ghost"
              className="rounded-xl h-11 w-12 text-zinc-400 shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
