import { useFinanceStore } from '@/hooks/useFinanceStore';
import { Trophy, Flame, CheckCircle2, Circle, Target, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';

export function HabitTracker() {
    const { habits, habitLogs, fetchInitialData } = useFinanceStore();

    const today = new Date().toISOString().split('T')[0];

    const logHabit = async (habitId: string) => {
        try {
            const { error } = await supabase.from('habit_logs').insert({
                habit_id: habitId,
                logged_date: today,
                status: 'completed'
            });

            if (error) throw error;

            await fetchInitialData();
            toast({ title: 'Hábito concluído! Continue assim! 🚀' });
        } catch (err) {
            console.error(err);
            toast({ title: 'Erro ao registrar hábito', variant: 'destructive' });
        }
    };

    const getHabitStatus = (habitId: string) => {
        return habitLogs.some(log => log.habitId === habitId && log.loggedDate === today);
    };

    // Cálculo de Streak (simplificado para demonstração)
    const calculateStreak = (habitId: string) => {
        // Aqui viria uma lógica real de contagem de dias seguidos no habitLogs
        const count = habitLogs.filter(l => l.habitId === habitId && l.status === 'completed').length;
        return count;
    };

    const levels = [
        { threshold: 0, name: 'Iniciante Financeiro', color: 'text-slate-500' },
        { threshold: 10, name: 'Evoluindo', color: 'text-blue-500' },
        { threshold: 30, name: 'Consistente', color: 'text-amber-500' },
        { threshold: 50, name: 'Sólido', color: 'text-success' },
        { threshold: 100, name: 'Mestre da Economia', color: 'text-primary' },
    ];

    const totalPoints = habitLogs.filter(l => l.status === 'completed').length;
    const currentLevel = [...levels].reverse().find(l => totalPoints >= l.threshold) || levels[0];

    return (
        <div className="card-elevated p-6 space-y-6 bg-gradient-to-br from-card to-primary/5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-warning" />
                    <div>
                        <h3 className="text-xl font-bold">Gamificação & Hábitos</h3>
                        <p className={cn("text-xs font-bold uppercase tracking-wider", currentLevel.color)}>
                            Nível: {currentLevel.name}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-black text-primary">{totalPoints}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Pontos Totais</p>
                </div>
            </div>

            <div className="space-y-4">
                <p className="text-sm font-semibold flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    Missões de Hoje
                </p>

                {habits.length === 0 ? (
                    <div className="text-center py-4 bg-muted/20 rounded-2xl border border-dashed">
                        <p className="text-xs text-muted-foreground">Nenhum hábito configurado.</p>
                    </div>
                ) : (
                    habits.filter(h => h.isActive).map(habit => {
                        const isDone = getHabitStatus(habit.id);
                        const streak = calculateStreak(habit.id);

                        return (
                            <div
                                key={habit.id}
                                className={cn(
                                    "flex items-center justify-between p-4 rounded-2xl border transition-all",
                                    isDone ? "bg-success/10 border-success/20" : "bg-card border-border hover:border-primary/30"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "p-2 rounded-xl",
                                        isDone ? "bg-success text-white" : "bg-muted text-muted-foreground"
                                    )}>
                                        {isDone ? <CheckCircle2 className="w-5 h-5" /> : <Star className="w-5 h-5 opacity-50" />}
                                    </div>
                                    <div>
                                        <p className={cn("text-sm font-bold", isDone && "line-through opacity-50")}>
                                            {habit.habitType === 'daily_log' ? 'Registrar Gastos do Dia' :
                                                habit.habitType === 'weekly_review' ? 'Revisão Semanal de Saldo' :
                                                    habit.description || habit.habitType}
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <Flame className={cn("w-3 h-3", streak > 0 ? "text-orange-500" : "text-muted-foreground")} />
                                            <span className="text-[10px] font-bold text-muted-foreground">{streak} dias seguidos</span>
                                        </div>
                                    </div>
                                </div>

                                {!isDone && (
                                    <Button
                                        size="sm"
                                        onClick={() => logHabit(habit.id)}
                                        className="rounded-xl h-8 text-xs bg-primary hover:bg-primary/90"
                                    >
                                        Concluir
                                    </Button>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            <div className="bg-card p-4 rounded-2xl border border-border space-y-3">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Próxima Recompensa</p>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border-4 border-primary/20">
                            <Star className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="text-sm font-bold">Selo de Consistência</p>
                            <p className="text-[10px] text-muted-foreground">Faltam {Math.max(0, 10 - totalPoints)} pontos</p>
                        </div>
                    </div>
                    <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${(totalPoints % 10) * 10}%` }} />
                    </div>
                </div>
            </div>
        </div>
    );
}
