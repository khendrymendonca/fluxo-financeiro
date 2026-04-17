import { useMemo } from 'react';
import { formatCurrency } from '@/utils/formatters';
import { cn } from '@/lib/utils';

interface HealthScoreProps {
  totalIncome: number;
  totalExpenses: number;
  totalPendingOutflows: number;
}

export function HealthScore({ totalIncome, totalExpenses, totalPendingOutflows }: HealthScoreProps) {
  const { score, label, color, phrase } = useMemo(() => {
    if (!totalIncome) return { score: 0, label: 'Sem dados', color: 'text-muted-foreground', phrase: 'Registre uma receita para calcular.' };

    // Taxa de poupança: 60% do score
    const savingsRate = Math.max(0, (totalIncome - totalExpenses) / totalIncome);
    // Comprometimento pendente: 40% do score (quanto menor o pendente, melhor)
    const pendingRate = Math.max(0, 1 - totalPendingOutflows / totalIncome);

    const raw = Math.round(savingsRate * 60 + pendingRate * 40);
    const score = Math.min(100, Math.max(0, raw));

    const saved = totalIncome - totalExpenses;
    const savedPct = Math.round(savingsRate * 100);

    if (score >= 80) return { score, label: 'Excelente', color: 'text-success',          phrase: `Você poupou ${savedPct}% da renda (${formatCurrency(saved)}).` };
    if (score >= 60) return { score, label: 'Bom',       color: 'text-primary',           phrase: `${savedPct}% da renda poupada. Continue assim!` };
    if (score >= 40) return { score, label: 'Atenção',   color: 'text-warning',           phrase: `Gastos altos. Você poupou apenas ${savedPct}% da renda.` };
    return             { score, label: 'Crítico',  color: 'text-danger',            phrase: `Despesas superam a renda em ${formatCurrency(Math.abs(saved))}.` };
  }, [totalIncome, totalExpenses, totalPendingOutflows]);

  // Arco SVG
  const radius = 40;
  const circumference = Math.PI * radius; // semicírculo
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-4 py-1">
      <div className="w-full">
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Saúde Financeira
        </p>
      </div>

      {/* Arco de progresso */}
      <div className="relative flex items-end justify-center pt-2">
        <svg width="140" height="78" viewBox="0 0 100 56">
          {/* Trilha */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="10"
            strokeLinecap="round"
            opacity={0.2}
          />
          {/* Progresso */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={cn("transition-all duration-1000", color)}
          />
        </svg>
        {/* Número no centro */}
        <div className="absolute bottom-0 flex flex-col items-center">
          <span className={cn("text-3xl font-black leading-none tracking-tighter", color)}>{score}</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Score</span>
        </div>
      </div>

      <div className="text-center space-y-1">
        <p className={cn("text-xs font-black uppercase tracking-[0.2em]", color)}>{label}</p>
        <p className="text-[10px] text-muted-foreground font-medium leading-relaxed px-4">{phrase}</p>
      </div>
    </div>
  );
}
