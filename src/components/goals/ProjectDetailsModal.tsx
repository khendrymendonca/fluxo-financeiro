import {
    X,
    Calendar,
    Clock,
    CheckCircle2,
    Circle,
    CreditCard,
    Banknote,
    PiggyBank,
    Pencil,
    Trash2,
    TrendingUp,
    MapPin,
    Rocket
} from 'lucide-react';
import { SavingsGoal, Account, GoalItem } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/formatters';
import { parseLocalDate } from '@/utils/dateUtils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GoalAportModal } from './GoalAportModal';
import { useState } from 'react';

interface ProjectDetailsModalProps {
    goal: SavingsGoal;
    accounts: Account[];
    onClose: () => void;
    onUpdate: (id: string, updates: Partial<SavingsGoal>) => void;
    onDelete: (id: string) => void;
    onDeposit: (goalId: string, amount: number, accountId: string) => void;
    onEdit?: (goal: SavingsGoal) => void;
}

export function ProjectDetailsModal({
    goal,
    accounts,
    onClose,
    onUpdate,
    onDelete,
    onDeposit,
    onEdit
}: ProjectDetailsModalProps) {
    const [showAportModal, setShowAportModal] = useState(false);

    const isSonho = goal.projectType === 'sonho';
    const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;

    const handleToggleItem = (itemId: string) => {
        const updatedItems = (goal.items || []).map(item =>
            item.id === itemId ? { ...item, completed: !item.completed } : item
        );
        onUpdate(goal.id, { items: updatedItems });
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-foreground/30 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-card rounded-[3rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-border animate-scale-in">

                {/* Header - Dashboard Style */}
                <div className="p-8 border-b border-border bg-muted/20 relative">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-6">
                            <div
                                className="w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-lg transform -rotate-3"
                                style={{ backgroundColor: goal.color }}
                            >
                                <Rocket className="w-10 h-10 text-white" />
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className={cn(
                                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                        isSonho ? "bg-sky-500 text-white" : "bg-amber-500 text-white"
                                    )}>
                                        {isSonho ? 'Sonho' : 'Projeto Executivo'}
                                    </span>
                                    {goal.created_at && (
                                        <span className="text-[10px] font-bold text-zinc-400">Desde {format(new Date(goal.created_at), 'MM/yyyy')}</span>
                                    )}
                                </div>
                                <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-zinc-50">{goal.name}</h2>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-3 bg-white dark:bg-zinc-950 rounded-full shadow-md border border-border hover:scale-110 active:scale-95 transition-all">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar p-8 space-y-10">

                    {/* Propósito / Finalidade */}
                    {goal.purpose && (
                        <div className="p-6 bg-primary/5 rounded-[2.5rem] border border-primary/10 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <TrendingUp className="w-20 h-20" />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Finalidade do {isSonho ? 'Sonho' : 'Projeto'}</p>
                            <p className="text-lg font-bold text-zinc-700 dark:text-zinc-300 leading-relaxed italic">
                                "{goal.purpose}"
                            </p>
                        </div>
                    )}

                    {/* Radar de Saúde do Projeto */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Progresso Financeiro</p>
                                <span className="text-lg font-black text-primary" style={{ color: goal.color }}>{progress.toFixed(0)}%</span>
                            </div>
                            <div className="h-4 rounded-full bg-muted overflow-hidden p-1 border border-border">
                                <div
                                    className="h-full rounded-full transition-all duration-1000"
                                    style={{ width: `${progress}%`, backgroundColor: goal.color }}
                                />
                            </div>
                            <p className="text-xs font-black text-gray-500 uppercase tracking-wider text-center">
                                {formatCurrency(goal.currentAmount)} acumulados <span className="text-zinc-300 mx-2">|</span> meta {formatCurrency(goal.targetAmount)}
                            </p>
                        </div>

                        <div className="p-6 rounded-[2rem] bg-zinc-50 dark:bg-zinc-950/50 border border-border flex flex-col justify-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-950 flex items-center justify-center shadow-sm">
                                    <Clock className="w-5 h-5 text-amber-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 leading-none mb-1">Previsão para realização</p>
                                    <p className="text-sm font-black">
                                        {goal.deadline ? format(parseLocalDate(goal.deadline), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : 'A definir'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Checklist de Itens com Checkbox */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-primary" />
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Lista de Execução</h3>
                            </div>
                            <span className="text-[10px] font-black bg-muted px-3 py-1 rounded-full">
                                {(goal.items || []).filter(i => i.completed).length} de {(goal.items || []).length} Concluídos
                            </span>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {(goal.items || []).map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => handleToggleItem(item.id)}
                                    className={cn(
                                        "flex items-center justify-between p-5 rounded-[2rem] border-2 transition-all cursor-pointer group",
                                        item.completed
                                            ? "bg-emerald-500/10 border-emerald-500/20 opacity-70"
                                            : "bg-white dark:bg-zinc-950 border-muted hover:border-primary"
                                    )}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="shrink-0 transition-transform group-hover:scale-110">
                                            {item.completed ? (
                                                <CheckCircle2 className="w-6 h-6 text-emerald-500 fill-emerald-500/10" />
                                            ) : (
                                                <Circle className="w-6 h-6 text-muted-foreground" />
                                            )}
                                        </div>
                                        <div>
                                            <p className={cn("font-bold text-sm", item.completed && "line-through text-emerald-600/50")}>
                                                {item.description}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[9px] font-black uppercase text-zinc-400 flex items-center gap-1">
                                                    {item.paymentMethod === 'credit' ? <CreditCard className="w-3 h-3" /> : <Banknote className="w-3 h-3" />}
                                                    {item.paymentMethod === 'credit' ? 'Cartão' : 'À Vista'}
                                                </span>
                                                {item.deadline && (
                                                    <span className="text-[9px] font-black uppercase text-zinc-400 flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" /> {format(parseLocalDate(item.deadline), 'dd/MM/yy')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <p className={cn("font-black text-sm", item.completed ? "text-emerald-600" : "text-primary")}>
                                        {formatCurrency(item.value)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex flex-col md:flex-row gap-2 pt-6">
                        <Button
                            onClick={() => setShowAportModal(true)}
                            className="flex-1 h-14 rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl shadow-primary/20"
                        >
                            <PiggyBank className="w-5 h-5 mr-3" /> Guardar Dinheiro (Caixinha)
                        </Button>

                        <div className="flex gap-2">
                            {onEdit && (
                                <Button onClick={() => onEdit(goal)} variant="outline" className="h-14 w-14 rounded-[1.5rem] border-2">
                                    <Pencil className="w-5 h-5" />
                                </Button>
                            )}
                            <Button onClick={() => onDelete(goal.id)} variant="outline" className="h-14 w-14 rounded-[1.5rem] border-2 border-red-100 text-red-500 hover:bg-red-50">
                                <Trash2 className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {showAportModal && (
                <GoalAportModal
                    goal={goal}
                    accounts={accounts}
                    onClose={() => setShowAportModal(false)}
                />
            )}
        </div>
    );
}
