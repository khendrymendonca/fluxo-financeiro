import {
    Shield, TrendingUp, AlertCircle, Edit2, ArrowRightLeft,
    ArrowUpCircle, ArrowDownCircle, Calculator, CalendarClock,
    Sparkles, CheckCircle2, Wallet, Coins
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Portal } from '@/components/ui/Portal';
import { formatCurrency } from '@/utils/formatters';
import { addMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EmergencyReserveProps {
    data: {
        monthlyFixed: number;
        targetAmount: number;
        currentAmount: number;
        remainingAmount?: number;
        progress: number;
        months: number;
        monthlyDeposit?: number;
        estimatedMonths?: number | null;
        estimatedTargetDate?: Date | null;
        reserveAccounts?: any[];
    };
    onMonthsChange: (months: number) => void;
    onMonthlyDepositChange?: (amount: number) => void;
    accounts?: any[];
    onTransfer?: (fromId: string, toId: string, amount: number, description: string) => Promise<void>;
}

function formatEstimatedDuration(monthsCount: number): string {
    if (monthsCount <= 0) return 'Meta atingida!';
    if (monthsCount === 1) return '1 mês';
    if (monthsCount < 12) return `${monthsCount} meses`;
    const years = Math.floor(monthsCount / 12);
    const remMonths = monthsCount % 12;
    if (remMonths === 0) {
        return `${years} ${years === 1 ? 'ano' : 'anos'}`;
    }
    return `${years} ${years === 1 ? 'ano' : 'anos'} e ${remMonths} ${remMonths === 1 ? 'mês' : 'meses'}`;
}

export function EmergencyReserve({
    data,
    onMonthsChange,
    onMonthlyDepositChange,
    accounts = [],
    onTransfer
}: EmergencyReserveProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [tempMonths, setTempMonths] = useState((data.months || 12).toString());

    // Estado do Aporte Mensal no Simulador
    const [monthlyDepositInput, setMonthlyDepositInput] = useState(() => {
        return data.monthlyDeposit && data.monthlyDeposit > 0 ? String(data.monthlyDeposit) : '';
    });

    useEffect(() => {
        if (data.monthlyDeposit !== undefined && data.monthlyDeposit > 0) {
            setMonthlyDepositInput(String(data.monthlyDeposit));
        }
    }, [data.monthlyDeposit]);

    // Transfer Modal State
    const [transferMode, setTransferMode] = useState<'deposit' | 'withdraw' | null>(null);
    const [transferAmount, setTransferAmount] = useState('');
    const [sourceAccount, setSourceAccount] = useState('');
    const [destinationAccount, setDestinationAccount] = useState('');

    const handleSaveMonths = () => {
        const val = parseInt(tempMonths, 10);
        if (!isNaN(val) && val > 0) {
            onMonthsChange(val);
        }
        setIsEditing(false);
    };

    const handleDepositChange = (valStr: string) => {
        setMonthlyDepositInput(valStr);
        const parsed = parseFloat(valStr.replace(',', '.'));
        if (onMonthlyDepositChange) {
            onMonthlyDepositChange(isNaN(parsed) || parsed < 0 ? 0 : parsed);
        }
    };

    const handleQuickAddDeposit = (amount: number) => {
        const current = parseFloat(monthlyDepositInput.replace(',', '.')) || 0;
        const next = current + amount;
        handleDepositChange(String(next));
    };

    const handleExecuteTransfer = async () => {
        if (!sourceAccount || !destinationAccount || !transferAmount || !onTransfer) return;
        const amount = parseFloat(transferAmount);
        if (amount <= 0) return;

        await onTransfer(
            sourceAccount,
            destinationAccount,
            amount,
            transferMode === 'deposit' ? 'Aporte na Reserva de Emergência' : 'Resgate da Reserva de Emergência'
        );

        setTransferMode(null);
        setTransferAmount('');
        setSourceAccount('');
        setDestinationAccount('');
    };

    const remaining = data.remainingAmount !== undefined
        ? data.remainingAmount
        : Math.max(0, data.targetAmount - data.currentAmount);

    const progressValue = data.targetAmount > 0 ? (data.currentAmount / data.targetAmount) * 100 : 0;

    const parsedDeposit = parseFloat(monthlyDepositInput.replace(',', '.')) || 0;
    const estimatedMonths = remaining <= 0 ? 0 : (parsedDeposit > 0 ? Math.ceil(remaining / parsedDeposit) : null);
    const estimatedTargetDate = estimatedMonths !== null && estimatedMonths > 0 ? addMonths(new Date(), estimatedMonths) : null;

    return (
        <div className="space-y-6">
            {/* Card Principal de Resumo e Progresso */}
            <div className="card-elevated p-6 space-y-6 relative overflow-hidden group">
                {/* Background Glow */}
                <div className="absolute -right-4 -top-4 w-28 h-28 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all duration-500" />

                {/* Header com Edição de Meses e Progresso */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between relative gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-primary/10 text-primary shrink-0">
                            <Shield className="w-6 h-6" />
                        </div>
                        <div>
                            {/* Sem título aqui: a página já mostra "Reserva de Emergência" no
                                PageHeader logo acima — repetir de novo neste card duplicava o
                                texto na tela. */}
                            <div className="flex items-center gap-2">
                                {isEditing ? (
                                    <div className="flex items-center gap-1.5">
                                        <Input
                                            type="number"
                                            value={tempMonths}
                                            onChange={e => setTempMonths(e.target.value)}
                                            className="h-7 w-16 p-1 text-xs font-bold"
                                            min={1}
                                            max={60}
                                        />
                                        <Button type="button" size="sm" className="h-7 px-2.5 text-xs font-bold" onClick={handleSaveMonths}>
                                            Salvar
                                        </Button>
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                                        Meta de <span className="font-bold text-foreground">{data.months} meses</span> de custos fixos
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            aria-label="Editar meses da reserva"
                                            className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 sm:justify-end">
                        <div className="text-left sm:text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Progresso</p>
                            <span className="text-2xl font-black text-primary">
                                {progressValue.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                </div>

                {/* Grid 4 Cards Executivos de Resumo */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 hover:border-primary/20 transition-all">
                        <p className="text-[10px] uppercase font-black text-muted-foreground tracking-wider mb-1">Custo Fixo Mensal</p>
                        <p className="text-base sm:text-lg font-black text-foreground">{formatCurrency(data.monthlyFixed)}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Contas fixas cadastradas</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 hover:border-primary/20 transition-all">
                        <p className="text-[10px] uppercase font-black text-muted-foreground tracking-wider mb-1">Meta ({data.months} Meses)</p>
                        <p className="text-base sm:text-lg font-black text-primary">{formatCurrency(data.targetAmount)}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{data.months}x custo mensal</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 hover:border-primary/20 transition-all">
                        <p className="text-[10px] uppercase font-black text-muted-foreground tracking-wider mb-1">Saldo Já Guardado</p>
                        <p className="text-base sm:text-lg font-black text-success">{formatCurrency(data.currentAmount)}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Em reservas / caixinhas</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 hover:border-primary/20 transition-all">
                        <p className="text-[10px] uppercase font-black text-muted-foreground tracking-wider mb-1">Faltam Guardar</p>
                        <p className={cn("text-base sm:text-lg font-black", remaining <= 0 ? "text-success" : "text-amber-500")}>
                            {remaining <= 0 ? 'R$ 0,00' : formatCurrency(remaining)}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                            {remaining <= 0 ? 'Meta 100% atingida 🎉' : 'Para cobrir o alvo'}
                        </p>
                    </div>
                </div>

                {/* Barra de Progresso com Indicador */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                        <span className="flex items-center gap-1.5 text-foreground">
                            <TrendingUp className="w-3.5 h-3.5 text-success" />
                            {formatCurrency(data.currentAmount)} acumulados
                        </span>
                        <span>Alvo: {formatCurrency(data.targetAmount)}</span>
                    </div>

                    <div className="h-3.5 w-full bg-muted/70 rounded-full overflow-hidden p-0.5 border border-border/60">
                        <div
                            className={cn(
                                "h-full rounded-full transition-all duration-1000 ease-out shadow-sm",
                                remaining <= 0
                                    ? "bg-success shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                                    : "bg-primary shadow-[0_0_12px_rgba(var(--primary),0.4)]"
                            )}
                            style={{ width: `${Math.min(data.progress, 100)}%` }}
                        />
                    </div>
                </div>

                {/* Botões de Aporte e Resgate */}
                <div className="flex items-center gap-2 pt-1">
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-10 rounded-xl text-xs font-bold border-success/30 text-success hover:bg-success/10 hover:border-success/50"
                        onClick={() => setTransferMode('deposit')}
                    >
                        <ArrowDownCircle className="w-4 h-4 mr-1.5" /> Aportar na Reserva
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-10 rounded-xl text-xs font-bold border-danger/30 text-danger hover:bg-danger/10 hover:border-danger/50"
                        onClick={() => setTransferMode('withdraw')}
                    >
                        <ArrowUpCircle className="w-4 h-4 mr-1.5" /> Resgatar da Reserva
                    </Button>
                </div>
            </div>

            {/* Módulo Executivo: Simulador de Aportes & Projeção de Prazo */}
            <div className="card-elevated p-6 space-y-5 relative overflow-hidden border border-border/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-info/10 text-info">
                            <CalendarClock className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-base font-black tracking-tight text-foreground flex items-center gap-2">
                                Simulador de Aportes & Projeção de Tempo
                            </h4>
                            <p className="text-xs text-muted-foreground">
                                Simule em quanto tempo você atingirá sua meta depositando uma quantia por mês
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 self-start sm:self-auto px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[11px] font-bold">
                        <Sparkles className="w-3.5 h-3.5" />
                        Projeção Automática
                    </div>
                </div>

                {/* Input de Aporte Mensal Planejado */}
                <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                            Quanto você pretende depositar por mês?
                        </Label>
                        {/* Atalhos Rápidos de Valor */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {[200, 500, 1000, 2000].map(val => (
                                <button
                                    key={val}
                                    type="button"
                                    onClick={() => handleQuickAddDeposit(val)}
                                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-muted/60 hover:bg-muted text-foreground border border-border/50 hover:border-primary/30 transition-all"
                                >
                                    +{formatCurrency(val)}
                                </button>
                            ))}
                            {parsedDeposit > 0 && (
                                <button
                                    type="button"
                                    onClick={() => handleDepositChange('')}
                                    className="px-2 py-1 rounded-lg text-xs font-bold text-muted-foreground hover:text-danger transition-colors"
                                >
                                    Limpar
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="relative max-w-sm">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-muted-foreground">
                            R$
                        </span>
                        <Input
                            type="number"
                            min="0"
                            step="50"
                            placeholder="Ex: 500,00"
                            value={monthlyDepositInput}
                            onChange={(e) => handleDepositChange(e.target.value)}
                            className="h-12 pl-10 text-base font-bold rounded-xl border-2 focus:border-primary"
                        />
                    </div>
                </div>

                {/* Painel de Resultados da Projeção */}
                {remaining <= 0 ? (
                    <div className="p-4 rounded-2xl bg-success/10 border border-success/30 flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-bold text-success">Meta de Reserva 100% Concluída!</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Você já possui <strong className="text-foreground">{formatCurrency(data.currentAmount)}</strong> guardados, garantindo a sua tranquilidade para os <strong className="text-foreground">{data.months} meses</strong> de custos fixos.
                            </p>
                        </div>
                    </div>
                ) : parsedDeposit > 0 && estimatedMonths !== null ? (
                    <div className="space-y-3 pt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-1">
                                <p className="text-[10px] uppercase font-black tracking-widest text-primary">Prazo Estimado</p>
                                <p className="text-xl font-black text-foreground">{formatEstimatedDuration(estimatedMonths)}</p>
                                <p className="text-[11px] text-muted-foreground font-medium">
                                    {estimatedMonths} depósitos mensais de {formatCurrency(parsedDeposit)}
                                </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-info/5 border border-info/20 space-y-1">
                                <p className="text-[10px] uppercase font-black tracking-widest text-info">Data de Conclusão Prevista</p>
                                <p className="text-xl font-black text-foreground capitalize">
                                    {estimatedTargetDate ? format(estimatedTargetDate, "MMMM 'de' yyyy", { locale: ptBR }) : '—'}
                                </p>
                                <p className="text-[11px] text-muted-foreground font-medium">
                                    Total de {formatCurrency(data.targetAmount)} assegurado
                                </p>
                            </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground">
                            Depositando <strong className="text-foreground">{formatCurrency(parsedDeposit)}/mês</strong>, você cobrirá os <strong className="text-amber-500 font-bold">{formatCurrency(remaining)}</strong> restantes para atingir sua meta total de <strong className="text-foreground">{formatCurrency(data.targetAmount)}</strong>. Se suas contas fixas aumentarem ou se você fizer novos depósitos, este prazo será ajustado em tempo real.
                        </div>
                    </div>
                ) : (
                    <div className="p-4 rounded-2xl bg-muted/30 border border-dashed border-border/80 flex items-center gap-3 text-muted-foreground">
                        <Calculator className="w-5 h-5 shrink-0 text-primary/70" />
                        <p className="text-xs">
                            Digite quanto pretende depositar por mês no campo acima para calcular o prazo estimado e a data prevista para atingir sua reserva.
                        </p>
                    </div>
                )}
            </div>

            {/* Saldos Detalhados das Contas de Reserva */}
            {data.reserveAccounts && data.reserveAccounts.length > 0 && (
                <div className="card-elevated p-6 space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                            Contas que compõem sua Reserva
                        </p>
                        <span className="text-xs font-black text-primary">
                            {data.reserveAccounts.length} {data.reserveAccounts.length === 1 ? 'conta' : 'contas'}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                        {data.reserveAccounts.map((acc: any) => (
                            <div
                                key={acc.id}
                                className="flex items-center justify-between p-3 rounded-xl bg-background border border-border/60 hover:border-primary/20 transition-all shadow-xs"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: acc.color || '#3B82F6' }} />
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold truncate">{acc.name}</p>
                                        <p className="text-[10px] text-muted-foreground capitalize">{acc.accountType || 'Reserva'}</p>
                                    </div>
                                </div>
                                <span className="text-xs font-black text-foreground shrink-0 ml-2">
                                    {formatCurrency(acc.balance)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Transfer Modal */}
            {transferMode && (
                <Portal>
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setTransferMode(null)}
                    >
                        <div
                            className="bg-card rounded-2xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-200 border border-border"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-card rounded-t-2xl">
                                <div>
                                    <h2 className="text-lg font-black tracking-tight">
                                        {transferMode === 'deposit' ? 'Aportar na Reserva' : 'Resgatar da Reserva'}
                                    </h2>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {transferMode === 'deposit' ? 'Mova dinheiro de uma conta corrente para a reserva' : 'Mova dinheiro da reserva para uma conta corrente'}
                                    </p>
                                </div>
                                <div className={cn(
                                    "p-2 rounded-xl",
                                    transferMode === 'deposit' ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                                )}>
                                    {transferMode === 'deposit' ? <ArrowDownCircle className="w-5 h-5 text-success" /> : <ArrowUpCircle className="w-5 h-5 text-danger" />}
                                </div>
                            </div>

                            <div className="p-5 space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase font-bold text-muted-foreground">Valor da Transferência</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">R$</span>
                                        <Input
                                            type="number"
                                            placeholder="0.00"
                                            value={transferAmount}
                                            onChange={(e) => setTransferAmount(e.target.value)}
                                            className="h-12 pl-10 text-lg font-bold"
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs uppercase font-bold text-muted-foreground">
                                            {transferMode === 'deposit' ? 'Conta de Origem (Sairá daqui)' : 'Conta de Origem (Reserva)'}
                                        </Label>
                                        <select
                                            className="w-full h-11 rounded-xl border border-input bg-background px-3 py-2 text-sm font-bold truncate focus:ring-2 focus:ring-primary outline-none transition-all"
                                            value={sourceAccount}
                                            onChange={(e) => setSourceAccount(e.target.value)}
                                        >
                                            <option value="">Selecione a conta...</option>
                                            {accounts.map(acc => (
                                                <option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.balance)})</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex items-center justify-center -my-2">
                                        <div className="bg-muted p-1.5 rounded-full">
                                            <ArrowRightLeft className="w-4 h-4 text-primary rotate-90" />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs uppercase font-bold text-muted-foreground">
                                            {transferMode === 'deposit' ? 'Conta de Destino (Reserva)' : 'Conta de Destino (Receberá)'}
                                        </Label>
                                        <select
                                            className="w-full h-11 rounded-xl border border-input bg-background px-3 py-2 text-sm font-bold truncate focus:ring-2 focus:ring-primary outline-none transition-all"
                                            value={destinationAccount}
                                            onChange={(e) => setDestinationAccount(e.target.value)}
                                        >
                                            <option value="">Selecione a conta...</option>
                                            {accounts.map(acc => (
                                                <option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.balance)})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="px-5 py-4 border-t border-border flex gap-2">
                                <Button
                                    variant="ghost"
                                    onClick={() => setTransferMode(null)}
                                    className="flex-1 rounded-xl text-sm font-bold"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleExecuteTransfer}
                                    className={cn(
                                        "flex-1 rounded-xl text-sm font-bold text-white shadow hover:scale-[1.02] transition-all",
                                        transferMode === 'deposit' ? "bg-success hover:bg-success/90" : "bg-danger hover:bg-danger/90"
                                    )}
                                >
                                    Confirmar
                                </Button>
                            </div>
                        </div>
                    </div>
                </Portal>
            )}
        </div>
    );
}
