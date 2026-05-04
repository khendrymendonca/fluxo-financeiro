import { useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  CreditCard,
  Info,
  ListChecks,
  PiggyBank,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { useDebtProjection } from '@/hooks/useDebtProjection';
import { useIsMobile } from '@/hooks/useIsMobile';
import { formatCurrency } from '@/utils/formatters';
import { parseLocalDate } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';
import { buildMonthPlan } from '@/utils/monthPlan';
import { evaluatePaymentDecision, type PaymentDecisionType } from '@/utils/paymentDecision';
import { buildDebtPlanning, type DebtPriority } from '@/utils/debtPlanning';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';
import { MonthSelector } from '@/components/dashboard/MonthSelector';
import { LegacyDashboardHome } from './LegacyDashboardHome';

interface MonthPlanPageProps {
  isBalanceVisible: boolean;
  onRefreshData: () => void;
  onOpenTransactionForm: () => void;
  onOpenTransferForm: () => void;
  onNavigateToBills: () => void;
  onNavigateToTransactions: () => void;
}

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</p>
      <h3 className="text-xl font-black tracking-tight">{title}</h3>
      {description && <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>}
    </div>
  );
}

function DecisionCard({
  label,
  value,
  message,
  icon,
  tone = 'default',
}: {
  label: string;
  value: string;
  message: string;
  icon: ReactNode;
  tone?: 'default' | 'safe' | 'attention' | 'risk';
}) {
  return (
    <div
      className={cn(
        'rounded-[1.75rem] border p-4 md:p-5 bg-card shadow-sm dark:shadow-none',
        tone === 'safe' && 'border-emerald-200/70 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20',
        tone === 'attention' && 'border-amber-200/70 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20',
        tone === 'risk' && 'border-rose-200/70 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20',
        tone === 'default' && 'border-border/50'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
          <p className="text-2xl md:text-3xl font-black tracking-tight">{value}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
        </div>
        <div className="w-11 h-11 rounded-2xl bg-background/70 border border-white/40 dark:border-white/5 flex items-center justify-center shrink-0">
          {icon}
        </div>
      </div>
    </div>
  );
}

function SummaryMetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-border/50 bg-background/60 p-4 md:p-5">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl md:text-3xl font-black tracking-tight">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{hint}</p>
    </div>
  );
}

function AlertRow({
  severity,
  title,
  message,
}: {
  severity: 'info' | 'warning' | 'danger';
  title: string;
  message: string;
}) {
  const icon = {
    info: <Info className="w-4 h-4 text-sky-600 dark:text-sky-400" />,
    warning: <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
    danger: <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
  }[severity];

  const tone = {
    info: 'border-sky-200/80 bg-sky-50/60 dark:border-sky-900/60 dark:bg-sky-950/20',
    warning: 'border-amber-200/80 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-950/20',
    danger: 'border-rose-200/80 bg-rose-50/60 dark:border-rose-900/60 dark:bg-rose-950/20',
  }[severity];

  return (
    <div className={cn('rounded-[1.4rem] border p-4', tone)}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{icon}</div>
        <div className="space-y-1 min-w-0">
          <p className="text-sm font-black">{title}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
        </div>
      </div>
    </div>
  );
}

function ActionRow({
  type,
  title,
  message,
  amount,
}: {
  type: 'pay' | 'avoid' | 'review' | 'negotiate' | 'save';
  title: string;
  message: string;
  amount?: number;
}) {
  const icon = {
    pay: <ArrowRight className="w-4 h-4 text-primary" />,
    avoid: <ShieldAlert className="w-4 h-4 text-rose-500" />,
    review: <ListChecks className="w-4 h-4 text-amber-500" />,
    negotiate: <ShieldCheck className="w-4 h-4 text-sky-500" />,
    save: <PiggyBank className="w-4 h-4 text-emerald-500" />,
  }[type];

  const label = {
    pay: 'Pagar',
    avoid: 'Evitar',
    review: 'Revisar',
    negotiate: 'Negociar',
    save: 'Guardar',
  }[type];

  return (
    <div className="rounded-[1.4rem] border border-border/50 bg-background/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 shrink-0">{icon}</div>
          <div className="space-y-1 min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
            <p className="text-sm font-black">{title}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
          </div>
        </div>
        {typeof amount === 'number' && <p className="text-sm font-black shrink-0">{formatCurrency(amount)}</p>}
      </div>
    </div>
  );
}

function CommitmentRow({
  description,
  amount,
  date,
  isOverdue,
  isDeferable = false,
}: {
  description: string;
  amount: number;
  date: string;
  isOverdue: boolean;
  isDeferable?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-[1.5rem] border p-4 flex items-start justify-between gap-4',
        isOverdue
          ? 'border-rose-200/70 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20'
          : isDeferable
            ? 'border-emerald-200/70 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20'
            : 'border-border/50 bg-background/60'
      )}
    >
      <div className="space-y-1 min-w-0">
        <p className="text-sm font-black truncate">{description}</p>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-black">
          {isOverdue
            ? 'Atrasado'
            : isDeferable
              ? `Pode esperar ate ${format(parseLocalDate(date), "dd 'de' MMM", { locale: ptBR })}`
              : `Vence ${format(parseLocalDate(date), "dd 'de' MMM", { locale: ptBR })}`}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-black">{formatCurrency(amount)}</p>
      </div>
    </div>
  );
}

function DebtPriorityRow({
  name,
  installmentAmount,
  priority,
  reason,
  isHighRisk,
}: {
  name: string;
  installmentAmount: number;
  priority: DebtPriority;
  reason: string;
  isHighRisk: boolean;
}) {
  const toneClass = {
    urgent: 'border-rose-200/70 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20',
    high: 'border-amber-200/70 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20',
    medium: 'border-border/50 bg-background/60',
    low: 'border-border/40 bg-background/40',
  }[priority];

  const badgeLabel = {
    urgent: 'Atencao agora',
    high: 'Prioridade alta',
    medium: 'Moderada',
    low: 'Tranquilo',
  }[priority];

  const badgeClass = {
    urgent: 'border-rose-200 text-rose-700 bg-rose-50 dark:border-rose-900/60 dark:text-rose-300 dark:bg-rose-950/20',
    high: 'border-amber-200 text-amber-700 bg-amber-50 dark:border-amber-900/60 dark:text-amber-300 dark:bg-amber-950/20',
    medium: 'border-border text-muted-foreground bg-background',
    low: 'border-border text-muted-foreground bg-background',
  }[priority];

  return (
    <div className={cn('rounded-[1.5rem] border p-4 flex items-start justify-between gap-4', toneClass)}>
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-black truncate">{name}</p>
          {isHighRisk && (
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-600 dark:text-amber-400">
              atencao
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{reason}</p>
      </div>
      <div className="text-right shrink-0 space-y-1">
        <p className="text-sm font-black">{formatCurrency(installmentAmount)}/mes</p>
        <Badge
          variant="outline"
          className={cn('rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em]', badgeClass)}
        >
          {badgeLabel}
        </Badge>
      </div>
    </div>
  );
}

export default function MonthPlanPage({
  isBalanceVisible,
  onRefreshData,
  onOpenTransactionForm,
  onOpenTransferForm,
  onNavigateToBills,
  onNavigateToTransactions,
}: MonthPlanPageProps) {
  const isMobile = useIsMobile();
  const [showDetails, setShowDetails] = useState(false);
  const [decisionType, setDecisionType] = useState<PaymentDecisionType>('purchase');
  const [decisionAmount, setDecisionAmount] = useState('');
  const [decisionInstallments, setDecisionInstallments] = useState('1');
  const { categories, currentMonthTransactions, debts, viewDate } = useFinanceStore();
  const debtProjection = useDebtProjection();
  const canUseDecisionEngine = useFeatureFlag('decision_engine');
  const canUseDebtStrategy = useFeatureFlag('debt_strategy');

  const monthPlan = useMemo(
    () =>
      buildMonthPlan({
        transactions: currentMonthTransactions,
        categories,
        debts,
        viewDate,
        debtSafeBaseline: debtProjection.diagnostico.sobraReal,
      }),
    [categories, currentMonthTransactions, debts, debtProjection.diagnostico.sobraReal, viewDate]
  );

  const nextCommitments = monthPlan.upcomingMustPay.slice(0, 3);
  const deferableItems = monthPlan.deferableItems.slice(0, isMobile ? 3 : 6);
  const primaryAlert = monthPlan.alerts[0];
  const primaryActions = monthPlan.recommendedActions.slice(0, 3);
  const primaryAction = primaryActions[0];
  const hasMonthData = monthPlan.expectedIncome > 0 || monthPlan.totalCommitted > 0;
  const hasDebts = monthPlan.debtCommitments > 0;
  const showInstallments = decisionType === 'installment' || decisionType === 'agreement';

  const paymentDecision = useMemo(
    () =>
      evaluatePaymentDecision({
        type: decisionType,
        amount: Number(decisionAmount || 0),
        installments: Number(decisionInstallments || 1),
        monthPlan,
      }),
    [decisionAmount, decisionInstallments, decisionType, monthPlan]
  );

  const debtPlanning = useMemo(
    () =>
      buildDebtPlanning({
        debts,
        monthPlan,
        viewDate,
      }),
    [debts, monthPlan, viewDate]
  );

  const monthLabel = format(viewDate, 'MMMM yyyy', { locale: ptBR });
  const debtTotal = debtPlanning.summary.totalRemaining;
  const statusToneClass = {
    safe: 'border-emerald-200/70 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/20',
    attention: 'border-amber-200/70 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20',
    critical: 'border-rose-200/70 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/20',
  }[monthPlan.monthStatus];
  const statusTitle = {
    safe: 'Seu mes esta seguro. Preserve a margem.',
    attention: 'Seu mes fecha, mas com pouca folga.',
    critical: 'Seu mes nao fecha com os compromissos atuais.',
  }[monthPlan.monthStatus];
  const statusMessage = !hasMonthData
    ? 'Ainda faltam dados do mes para orientar decisoes com seguranca. Lance receitas e compromissos principais antes de decidir.'
    : monthPlan.monthStatus === 'safe'
      ? 'O mes fecha com folga. Proteja os proximos compromissos e evite perder a margem com novos impulsos.'
      : monthPlan.monthStatus === 'attention'
        ? 'O mes fecha, mas justo. Cada nova decisao precisa respeitar o que ja esta comprometido.'
        : 'A leitura atual pede correcao imediata. Antes de assumir algo novo, reorganize compromissos e preserve o caixa minimo.';
  const monthClosureMessage = !hasMonthData
    ? 'Seu mes ainda nao pode ser lido com seguranca.'
    : monthPlan.projectedBalance >= 0
      ? `A projecao atual fecha com ${formatCurrency(monthPlan.projectedBalance)} de saldo.`
      : `A projecao atual fecha faltando ${formatCurrency(Math.abs(monthPlan.projectedBalance))}.`;
  const safeSpendMessage = monthPlan.safeToSpend > 0
    ? `Voce ainda pode gastar ${formatCurrency(monthPlan.safeToSpend)} com seguranca.`
    : 'Agora nao ha folga segura para novos gastos.';
  const debtMessage = !hasDebts
    ? 'Sem dividas ativas relevantes nesta leitura.'
    : monthPlan.debtPaymentCapacity > 0
      ? `Sua margem segura para dividas neste mes e ${formatCurrency(monthPlan.debtPaymentCapacity)}.`
      : 'Neste mes, as dividas pedem cautela e sem aceleracao extra.';
  const decisionBadgeLabel = {
    recommended: 'Recomendado',
    attention: 'Possivel com atencao',
    not_recommended: 'Nao recomendado',
  }[paymentDecision.decision];
  const decisionBadgeClass = {
    recommended: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-300',
    attention: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-300',
    not_recommended: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-300',
  }[paymentDecision.decision];

  return (
    <div className="space-y-5 md:space-y-6 max-w-7xl mx-auto p-4 md:p-6 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-2">
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-muted-foreground">Painel de Decisao do Mes</p>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">O que seu mes pede agora</h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl">
            Em poucos blocos: quanto entra, quanto ja esta comprometido, quanto sobra e o que precisa de decisao agora.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <MonthSelector />
          {!isMobile && (
            <Button variant="outline" className="rounded-xl" onClick={onRefreshData}>
              Atualizar
            </Button>
          )}
        </div>
      </div>

      <section className={cn('rounded-[2rem] border p-5 md:p-7 shadow-sm dark:shadow-none', statusToneClass)}>
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr] xl:items-start">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-muted-foreground">
                Seu mes em uma frase · {monthLabel}
              </p>
              <h2 className="text-2xl md:text-4xl font-black tracking-tight max-w-3xl">{statusTitle}</h2>
              <p className="text-sm md:text-base text-foreground/80 max-w-2xl leading-relaxed">{statusMessage}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button className="rounded-2xl h-11 font-bold" onClick={onNavigateToBills}>
                Ver compromissos
              </Button>
              <Button variant="outline" className="rounded-2xl h-11 font-bold" onClick={onOpenTransactionForm}>
                Lancar agora
              </Button>
            </div>
          </div>

          <div className="rounded-[1.8rem] border border-white/50 dark:border-white/10 bg-background/75 p-5 md:p-6">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Saldo livre / margem segura</p>
            <p className="mt-3 text-3xl md:text-5xl font-black tracking-tight">
              {isBalanceVisible ? formatCurrency(monthPlan.safeToSpend) : '......'}
            </p>
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium leading-relaxed">{monthClosureMessage}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{debtMessage}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{safeSpendMessage}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-border/50 bg-card p-5 md:p-6 shadow-sm dark:shadow-none">
        <SectionTitle
          eyebrow="Resumo simples"
          title="O basico para decidir"
          description="A primeira leitura do mes em quatro numeros: receitas, compromissos, saldo livre e dividas."
        />

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryMetricCard
            label="Receitas"
            value={isBalanceVisible ? formatCurrency(monthPlan.expectedIncome) : '......'}
            hint="Quanto entra no mes."
          />
          <SummaryMetricCard
            label="Compromissos"
            value={isBalanceVisible ? formatCurrency(monthPlan.totalCommitted) : '......'}
            hint="O que ja esta comprometido."
          />
          <SummaryMetricCard
            label="Saldo livre"
            value={isBalanceVisible ? formatCurrency(monthPlan.safeToSpend) : '......'}
            hint="Quanto ainda sobra com seguranca."
          />
          <SummaryMetricCard
            label="Dividas"
            value={isBalanceVisible ? formatCurrency(debtTotal) : '......'}
            hint="Quanto voce deve no total."
          />
        </div>
      </section>

      {canUseDebtStrategy && debtPlanning.summary.activeCount > 0 ? (
        <section className="rounded-[2rem] border border-border/50 bg-card p-5 md:p-6 shadow-sm dark:shadow-none">
          <SectionTitle
            eyebrow="Dividas"
            title="Quanto da para pagar sem apertar o mes"
            description="Veja o total em dividas, sua capacidade segura neste mes e ate 3 prioridades para acompanhar."
          />

          <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-3">
              <DecisionCard
                label="Total em dividas"
                value={isBalanceVisible ? formatCurrency(debtPlanning.summary.totalRemaining) : '......'}
                message={`${debtPlanning.summary.activeCount} divida${debtPlanning.summary.activeCount !== 1 ? 's ativas' : ' ativa'} nesta leitura.`}
                icon={<CreditCard className="w-5 h-5 text-primary" />}
                tone={debtPlanning.summary.totalRemaining > 0 ? 'attention' : 'default'}
              />
              <DecisionCard
                label="Capacidade segura no mes"
                value={isBalanceVisible ? formatCurrency(monthPlan.debtPaymentCapacity) : '......'}
                message={debtProjection.activeDebts.length > 0
                  ? 'Quanto cabe acelerar em dividas sem desmontar o restante do mes.'
                  : 'Sem dividas ativas relevantes nesta leitura.'}
                icon={<ShieldCheck className="w-5 h-5 text-primary" />}
                tone={monthPlan.debtPaymentCapacity > 0 ? 'safe' : 'default'}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                  Prioridades de divida
                </p>
                <p className="text-xs text-muted-foreground">
                  {debtPlanning.debtsToMaintain.length > 0
                    ? `+ ${debtPlanning.debtsToMaintain.length} no ritmo planejado`
                    : 'Sem fila longa nesta leitura'}
                </p>
              </div>

              {debtPlanning.priorityDebts.length > 0 ? (
                debtPlanning.priorityDebts.slice(0, 3).map((item) => (
                  <DebtPriorityRow
                    key={item.debtId}
                    name={item.name}
                    installmentAmount={item.installmentAmount}
                    priority={item.priority}
                    reason={item.reason}
                    isHighRisk={item.isHighRisk}
                  />
                ))
              ) : (
                <div className="rounded-[1.5rem] border border-dashed border-border/60 bg-background/40 p-4">
                  <p className="text-sm text-muted-foreground">
                    Nenhuma divida exige atencao imediata nesta leitura. Continue mantendo o pagamento planejado.
                  </p>
                </div>
              )}

              <div className="rounded-[1.4rem] border border-dashed border-border/60 bg-background/40 p-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Para aprofundar a leitura das dividas, use a area detalhada do planejamento fora desta home.
                </p>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-4 md:gap-5">
        <section className="rounded-[2rem] border border-border/50 bg-card p-5 md:p-6 shadow-sm dark:shadow-none">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Proximos compromissos</p>
              <h3 className="text-xl font-black tracking-tight mt-1">O que precisa de atencao agora</h3>
            </div>
            <Button variant="ghost" className="rounded-xl font-bold text-primary" onClick={onNavigateToBills}>
              Abrir gestao
            </Button>
          </div>

          {nextCommitments.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-border/60 bg-background/40 p-4">
              <p className="text-sm font-medium">
                {hasMonthData
                  ? 'Nenhum compromisso proximo pressiona os proximos dias nesta leitura.'
                  : 'Quando houver contas ou vencimentos no mes, eles aparecerao aqui.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {nextCommitments.map((commitment) => (
                <CommitmentRow
                  key={commitment.id}
                  description={commitment.description}
                  amount={commitment.amount}
                  date={commitment.date}
                  isOverdue={commitment.isOverdue}
                />
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[2rem] border border-border/50 bg-card p-5 md:p-6 shadow-sm dark:shadow-none">
          <div className="space-y-4">
            <SectionTitle
              eyebrow="O que fazer agora"
              title="O que fazer agora"
              description={primaryAction?.message || 'A pagina organiza a proxima decisao com base no status do mes.'}
            />

            <div className="space-y-3">
              {primaryActions.length > 0 ? (
                primaryActions.map((action) => (
                  <ActionRow
                    key={`${action.type}-${action.title}`}
                    type={action.type}
                    title={action.title}
                    message={action.message}
                    amount={action.amount}
                  />
                ))
              ) : (
                <div className="rounded-[1.5rem] border border-dashed border-border/60 bg-background/40 p-4">
                  <p className="text-sm text-muted-foreground">
                    Organize a base do mes antes de decidir novos gastos.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-wrap gap-3">
              <Button className="rounded-xl font-bold" onClick={onNavigateToBills}>
                Resolver compromissos
              </Button>
              <Button variant="outline" className="rounded-xl font-bold" onClick={onOpenTransferForm}>
                Organizar caixa
              </Button>
              {!isMobile && (
                <Button variant="ghost" className="rounded-xl font-bold text-primary" onClick={onNavigateToTransactions}>
                  Ver extrato completo
                </Button>
              )}
            </div>
          </div>
        </section>
      </div>

      {canUseDecisionEngine ? (
        <section className="rounded-[2rem] border border-border/50 bg-card p-5 md:p-6 shadow-sm dark:shadow-none">
          <SectionTitle
            eyebrow="Posso pagar?"
            title="Simule antes de assumir"
            description="Ferramenta de apoio para testar uma decisao sem deixar a home principal mais pesada."
          />

          <div className="mt-4 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-3">
              <div className="space-y-2">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">Tipo de simulacao</p>
                <Select value={decisionType} onValueChange={(value) => setDecisionType(value as PaymentDecisionType)}>
                  <SelectTrigger className="rounded-xl h-11">
                    <SelectValue placeholder="Escolha a simulacao" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purchase">Compra a vista</SelectItem>
                    <SelectItem value="installment">Compra parcelada</SelectItem>
                    <SelectItem value="debt_payment">Pagamento de divida</SelectItem>
                    <SelectItem value="agreement">Acordo mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className={cn('grid gap-3', showInstallments ? 'md:grid-cols-2' : 'md:grid-cols-1')}>
                <div className="space-y-2">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">Valor</p>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    className="rounded-xl h-11"
                    placeholder="0,00"
                    value={decisionAmount}
                    onChange={(event) => setDecisionAmount(event.target.value)}
                  />
                </div>

                {showInstallments && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">Parcelas</p>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      inputMode="numeric"
                      className="rounded-xl h-11"
                      placeholder="1"
                      value={decisionInstallments}
                      onChange={(event) => setDecisionInstallments(event.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="rounded-[1.5rem] border border-dashed border-border/60 bg-background/40 p-4">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  A simulacao nao salva nada automaticamente. Ela mostra o impacto provavel no mes atual antes de voce decidir agir.
                </p>
              </div>
            </div>

            <div className="rounded-[1.6rem] border border-border/50 bg-background/70 p-4 md:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">Resultado</p>
                  <p className="text-lg font-black">{paymentDecision.title}</p>
                </div>
                <Badge
                  variant="outline"
                  className={cn('rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em]', decisionBadgeClass)}
                >
                  {decisionBadgeLabel}
                </Badge>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {paymentDecision.message}
              </p>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-[1.2rem] border border-border/50 bg-card p-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">Impacto neste mes</p>
                  <p className="mt-2 text-base font-black">{formatCurrency(paymentDecision.currentMonthImpact)}</p>
                </div>
                <div className="rounded-[1.2rem] border border-border/50 bg-card p-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">Margem segura depois</p>
                  <p className="mt-2 text-base font-black">{formatCurrency(paymentDecision.safeMarginAfter)}</p>
                </div>
                <div className="rounded-[1.2rem] border border-border/50 bg-card p-3 sm:col-span-2 xl:col-span-1">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">Maximo sugerido</p>
                  <p className="mt-2 text-base font-black">{formatCurrency(paymentDecision.suggestedMaxAmount || 0)}</p>
                </div>
              </div>

              {paymentDecision.futureImpact && (
                <div className="mt-4 rounded-[1.2rem] border border-border/50 bg-card p-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">Impacto futuro</p>
                  <div className={cn('mt-2 grid gap-2 text-sm text-muted-foreground', isMobile ? 'grid-cols-1' : 'grid-cols-3')}>
                    <p>Parcela mensal: <span className="font-black text-foreground">{formatCurrency(paymentDecision.futureImpact.monthlyAmount)}</span></p>
                    <p>Numero de parcelas: <span className="font-black text-foreground">{paymentDecision.futureImpact.installments}</span></p>
                    <p>Meses afetados: <span className="font-black text-foreground">{paymentDecision.futureImpact.monthsAffected}</span></p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-4 md:gap-5">
        <section className="rounded-[2rem] border border-border/50 bg-card p-5 md:p-6 shadow-sm dark:shadow-none">
          <SectionTitle
            eyebrow="Leitura rapida"
            title="O que merece atencao no mes"
            description={hasMonthData
              ? 'Sinais secundarios que ajudam a proteger o caixa sem disputar espaco com o resumo principal.'
              : 'Sem base suficiente, os alertas ainda ficam em modo de preparacao.'}
          />

          <div className="mt-4 space-y-3">
            {monthPlan.alerts.map((alert) => (
              <AlertRow
                key={`${alert.severity}-${alert.title}`}
                severity={alert.severity}
                title={alert.title}
                message={alert.message}
              />
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-border/50 bg-card p-5 md:p-6 shadow-sm dark:shadow-none">
          <SectionTitle
            eyebrow="Indicadores"
            title="Leituras de apoio"
            description="Numeros complementares para aprofundar a conversa depois que o basico ja estiver claro."
          />

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DecisionCard
              label="Saldo projetado"
              value={isBalanceVisible ? formatCurrency(monthPlan.projectedBalance) : '......'}
              message={primaryAlert?.title || 'Sem alertas prioritarios no momento.'}
              icon={<ArrowUpRight className="w-5 h-5 text-primary" />}
              tone={monthPlan.monthStatus === 'critical' ? 'risk' : monthPlan.monthStatus}
            />
            <DecisionCard
              label="Cartao comprometido"
              value={isBalanceVisible ? formatCurrency(monthPlan.cardCommitments) : '......'}
              message="Compromissos que ja estao puxando o mes no cartao."
              icon={<Wallet className="w-5 h-5 text-primary" />}
              tone={monthPlan.cardCommitments > 0 ? 'attention' : 'default'}
            />
          </div>
        </section>
      </div>

      {deferableItems.length > 0 && (
        <section className="rounded-[2rem] border border-border/50 bg-card p-5 md:p-6 shadow-sm dark:shadow-none">
          <SectionTitle
            eyebrow="Pode esperar"
            title="Itens adiaveis nesta leitura"
            description="Esses itens nao parecem urgentes agora e podem ser reavaliados sem afetar o essencial."
          />

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {deferableItems.map((item) => (
              <CommitmentRow
                key={item.id}
                description={item.description}
                amount={item.amount}
                date={item.date}
                isOverdue={false}
                isDeferable
              />
            ))}
          </div>
        </section>
      )}

      <section className="rounded-[2rem] border border-border/50 bg-card p-4 md:p-5 shadow-sm dark:shadow-none">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Analise detalhada</p>
            <h3 className="text-lg font-black tracking-tight mt-1">A home anterior segue disponivel como apoio analitico</h3>
          </div>
          <Button variant="outline" className="rounded-xl font-bold" onClick={() => setShowDetails((current) => !current)}>
            {showDetails ? 'Ocultar detalhes' : 'Abrir detalhes'}
          </Button>
        </div>

        {showDetails && (
          <div className="mt-5 border-t border-border/50 pt-5">
            <LegacyDashboardHome
              isBalanceVisible={isBalanceVisible}
              onRefreshData={onRefreshData}
              onOpenTransactionForm={onOpenTransactionForm}
              onOpenTransferForm={onOpenTransferForm}
              onNavigateToBills={onNavigateToBills}
              onNavigateToTransactions={onNavigateToTransactions}
            />
          </div>
        )}
      </section>
    </div>
  );
}
