import {
  Calendar,
  Cloud,
  Briefcase,
  TrendingUp,
  CreditCard,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import { SavingsGoal, Account } from '@/types/finance';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/formatters';
import { parseLocalDate } from '@/utils/dateUtils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { ProjectDetailsModal } from './ProjectDetailsModal';

interface GoalCardProps {
  goal: SavingsGoal;
  accounts: Account[];
  onUpdate: (id: string, updates: Partial<SavingsGoal>) => void;
  onDelete: (id: string) => void;
  onDeposit: (goalId: string, amount: number, accountId: string) => void;
  onEdit?: (goal: SavingsGoal) => void;
}

export function GoalCard({ goal, accounts, onUpdate, onDelete, onDeposit, onEdit }: GoalCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Lógica de Progresso Híbrido (v6.1)
  const calculateProgress = () => {
    if (goal.targetAmount > 0) {
      return Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
    }

    // Se não tem custo financeiro, baseia-se nas tarefas concluídas
    const totalItems = goal.items?.length || 0;
    if (totalItems === 0) return 0;

    const completedItems = goal.items?.filter(item => item.completed).length || 0;
    return (completedItems / totalItems) * 100;
  };

  const progress = calculateProgress();
  const isCompleted = progress >= 100;
  const isSonho = goal.projectType === 'sonho';
  const hasFinance = goal.targetAmount > 0;

  const creditLimitNeeded = (goal.items || [])
    .filter(item => item.paymentMethod === 'credit' && !item.completed)
    .reduce((acc, item) => acc + item.value, 0);

  return (
    <>
      <div
        onClick={() => setShowDetails(true)}
        className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-6 shadow-sm dark:shadow-none border border-gray-100 dark:border-zinc-800 space-y-6 animate-fade-in group cursor-pointer hover:shadow-xl hover:shadow-primary/5 transition-all active:scale-[0.99]"
      >
        {/* Header - Visão Gerencial */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner relative"
              style={{ backgroundColor: `${goal.color}15` }}
            >
              {isSonho ? (
                <Cloud className="w-7 h-7" style={{ color: goal.color }} />
              ) : (
                <Briefcase className="w-7 h-7" style={{ color: goal.color }} />
              )}

              <div className={cn(
                "absolute -top-2 -right-2 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest shadow-sm",
                isSonho ? "bg-sky-500 text-white" : "bg-primary text-white"
              )}>
                {isSonho ? 'Sonho' : 'Projeto'}
              </div>
            </div>
            <div>
              <h3 className="font-black text-xl text-gray-900 dark:text-zinc-50 tracking-tight leading-tight group-hover:text-primary transition-colors">
                {goal.name}
              </h3>
              {(goal.deadline || goal.dreamStartDate) && (
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1 mt-1">
                  <Calendar className="w-3 h-3" />
                  {isSonho && goal.dreamStartDate
                    ? `Cultiva desde ${format(parseLocalDate(goal.dreamStartDate), "MMM/yy", { locale: ptBR })}`
                    : goal.deadline
                      ? `Conclusão em ${format(parseLocalDate(goal.deadline), "dd MMM yyyy", { locale: ptBR })}`
                      : 'Sem prazo físico'
                  }
                </p>
              )}
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
            <ChevronRight className="w-5 h-5" />
          </div>
        </div>

        {/* Progress Display */}
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase text-zinc-400 tracking-[0.2em] block">
                {hasFinance ? 'Status Financeiro' : 'Marcos de Execução'}
              </span>
              <span className="font-black text-2xl text-gray-900 dark:text-zinc-100 flex items-baseline gap-1">
                {hasFinance ? (
                  <>
                    {formatCurrency(goal.currentAmount)}
                    <span className="text-[10px] text-zinc-400 font-bold lowercase tracking-normal">de {formatCurrency(goal.targetAmount)}</span>
                  </>
                ) : (
                  <>
                    {goal.items?.filter(i => i.completed).length || 0}
                    <span className="text-[10px] text-zinc-400 font-bold lowercase tracking-normal">de {goal.items?.length || 0} tarefas</span>
                  </>
                )}
              </span>
            </div>
            <div className="text-right">
              <span className={cn(
                "font-black text-2xl",
                isCompleted && !hasFinance ? "text-emerald-500" : ""
              )} style={{ color: !isCompleted || hasFinance ? goal.color : undefined }}>
                {progress.toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="h-3 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden border-2 border-white dark:border-zinc-900 shadow-sm p-0.5">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-1000 ease-out",
                isCompleted && "animate-pulse"
              )}
              style={{
                width: `${progress}%`,
                background: isCompleted && !hasFinance
                  ? 'linear-gradient(90deg, #10b981 0%, #34d399 100%)'
                  : `linear-gradient(90deg, ${goal.color} 0%, ${goal.color}aa 100%)`,
              }}
            />
          </div>
        </div>

        {/* Indicadores de Apoio */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="p-3 rounded-2xl bg-muted/20 border border-muted/10 space-y-1">
            <div className="flex items-center gap-1.5 mb-1">
              {hasFinance ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : <CheckCircle2 className="w-3 h-3 text-sky-500" />}
              <span className="text-[9px] font-black uppercase text-zinc-400">Objetivo</span>
            </div>
            <p className="text-xs font-black text-gray-700 dark:text-zinc-300">
              {isCompleted ? 'Alcançado! 🎉' : hasFinance ? `Faltam ${formatCurrency(goal.targetAmount - goal.currentAmount)}` : 'Em execução'}
            </p>
          </div>

          {creditLimitNeeded > 0 && (
            <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10 space-y-1">
              <div className="flex items-center gap-1.5 mb-1">
                <CreditCard className="w-3 h-3 text-amber-500" />
                <span className="text-[9px] font-black uppercase text-amber-600/60">Limite Necessário</span>
              </div>
              <p className="text-xs font-black text-amber-600">
                {formatCurrency(creditLimitNeeded)}
              </p>
            </div>
          )}
        </div>
      </div>

      {showDetails && (
        <ProjectDetailsModal
          goal={goal}
          accounts={accounts}
          onClose={() => setShowDetails(false)}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onDeposit={onDeposit}
          onEdit={onEdit}
        />
      )}
    </>
  );
}
