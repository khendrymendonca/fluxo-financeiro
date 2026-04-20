import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebtProjection, calcularProjecaoDivida, calcularImpactoCorte } from '@/hooks/useDebtProjection';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Zap as ZapIcon,
  Snowflake as SnowflakeIcon,
  ArrowRight,
  Info,
  RefreshCw
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/formatters';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ProjectionPage() {
  const navigate = useNavigate();
  // Única fonte de verdade para dados analíticos de dívidas
  const { 
    activeDebts, 
    diagnostico, 
    estrategias, 
    despesasFixasRanqueadas, 
    acaoImediata,
    totalFixedExpenses,
    totalDebtInstallments 
  } = useDebtProjection();

  const { totalIncome } = useFinanceStore();

  // BLOCO 3 — Estado local para o simulador de cortes
  const [selectedCuts, setSelectedCuts] = useState<Set<string>>(new Set());

  const toggleCut = (id: string) => {
    setSelectedCuts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Cálculo do impacto simulado usando função pura do hook
  const simulacao = useMemo(() => {
    const valorTotalCorte = despesasFixasRanqueadas
      .filter(d => selectedCuts.has(d.id))
      .reduce((sum, d) => sum + Number(d.amount), 0);

    return calcularImpactoCorte(valorTotalCorte, activeDebts);
  }, [selectedCuts, despesasFixasRanqueadas, activeDebts]);

  // BLOCO 2 — Dados para o gráfico de amortização (Baseline)
  const chartData = useMemo(() => {
    if (activeDebts.length === 0) return [];
    
    let saldoTotal = activeDebts.reduce((sum, d) => sum + d.remainingAmount, 0);
    const result = [{ mes: 0, saldo: saldoTotal, dataLabel: 'Hoje' }];
    
    const avalanche = estrategias.avalanche.ordem;
    let mesesCorrentes = 0;
    let extraAcumulado = 0;

    avalanche.forEach(d => {
      const proj = calcularProjecaoDivida(d, extraAcumulado);
      proj.cronograma.forEach((p) => {
        mesesCorrentes++;
        saldoTotal -= (Number(d.installmentAmount) || Number(d.minimumPayment) || 0) + extraAcumulado;
        result.push({
          mes: mesesCorrentes,
          saldo: Math.max(0, saldoTotal),
          dataLabel: p.dataLabel
        });
      });
      extraAcumulado += (Number(d.installmentAmount) || Number(d.minimumPayment) || 0);
    });

    return result.slice(0, 60);
  }, [activeDebts, estrategias]);

  if (activeDebts.length === 0) {
    return (
      <div className="space-y-8 animate-fade-in max-w-6xl mx-auto pb-10 px-4 md:px-0">
        <PageHeader title="Projeção & Estratégia" icon={TrendingUp} />
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-zinc-900 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-zinc-800 shadow-sm">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4 opacity-20" />
          <h3 className="text-lg font-black tracking-tight text-gray-400">Nenhuma dívida ativa cadastrada</h3>
          <p className="text-sm text-gray-500 dark:text-zinc-500 mt-1">Sua saúde financeira está em dia.</p>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-2xl shadow-2xl">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">{payload[0].payload.dataLabel}</p>
          <p className="text-xs font-black text-white">{formatCurrency(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto pb-20 px-4 md:px-0">
      <PageHeader title="Projeção & Estratégia" icon={TrendingUp} />

      {/* BLOCO 1 — Diagnóstico do Fluxo Real */}
      <Card className="rounded-[2.5rem] border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" /> Diagnóstico do Fluxo Real
          </CardTitle>
          <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-60">Visão de caixa antes de gastos variáveis</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-[2rem] bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">Renda Líquida</p>
              <p className="text-xl font-black text-emerald-700 dark:text-emerald-300 tabular-nums">{formatCurrency(totalIncome)}</p>
            </div>
            <div className="p-5 rounded-[2rem] bg-rose-50 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-500/10">
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 mb-1">Gastos Fixos</p>
              <p className="text-xl font-black text-rose-700 dark:text-rose-300 tabular-nums">{formatCurrency(totalFixedExpenses)}</p>
            </div>
            <div className="p-5 rounded-[2rem] bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/10">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-1">Parcelas Dívidas</p>
              <p className="text-xl font-black text-amber-700 dark:text-amber-300 tabular-nums">{formatCurrency(totalDebtInstallments)}</p>
            </div>
            <div className={cn(
              "p-5 rounded-[2rem] border",
              diagnostico.sobraReal >= 0 
                ? "bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10" 
                : "bg-rose-50 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-500/10"
            )}>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Sobra Real</p>
              <p className={cn(
                "text-xl font-black tabular-nums",
                diagnostico.sobraReal >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"
              )}>{formatCurrency(diagnostico.sobraReal)}</p>
            </div>
          </div>

          <div className="pt-2">
            <Badge className={cn(
              "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border-none shadow-none h-auto",
              diagnostico.status === 'verde' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
              diagnostico.status === 'amarelo' ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
              "bg-rose-500/10 text-rose-600 dark:text-rose-400"
            )}>
              {diagnostico.status === 'verde' && `${diagnostico.indiceComprometimento.toFixed(0)}% comprometido — Saudável`}
              {diagnostico.status === 'amarelo' && `${diagnostico.indiceComprometimento.toFixed(0)}% comprometido — Atenção`}
              {diagnostico.status === 'vermelho' && (
                <span className="leading-relaxed">
                  {diagnostico.indiceComprometimento.toFixed(0)}% comprometido — Crítico — Você já comprometeu {diagnostico.indiceComprometimento.toFixed(0)}% da renda antes de qualquer gasto variável
                </span>
              )}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* BLOCO 2 — Projeção de Quitação */}
      <Card className="rounded-[2.5rem] border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-8">
          <div>
            <CardTitle className="text-lg font-black tracking-tight">Projeção de Quitação Total</CardTitle>
            <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-60 mt-1">Evolução do saldo devedor acumulado</CardDescription>
          </div>
          <Badge className="bg-primary/10 text-primary border-none rounded-xl px-3 py-1.5 font-black uppercase tracking-widest text-[10px] flex gap-2">
            <Calendar className="w-3 h-3" /> Quita tudo em {format(addMonths(new Date(), estrategias.avalanche.prazoMeses), "MMM/yyyy", { locale: ptBR })}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeDebts.map(debt => {
              const proj = calcularProjecaoDivida(debt);
              return (
                <div key={debt.id} className="p-5 rounded-[2rem] border border-gray-50 dark:border-zinc-800 bg-gray-50/30 dark:bg-zinc-900/30">
                  <p className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4">{debt.name}</p>
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Saldo Restante</span>
                      <span className="text-sm font-black tabular-nums">{formatCurrency(debt.remainingAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Data Est.</span>
                      <span className="text-[11px] font-black text-primary uppercase">{format(proj.dataQuitacao, "MMM/yyyy", { locale: ptBR })}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Juros</span>
                      <span className="text-[11px] font-black text-rose-500 tabular-nums">{formatCurrency(proj.totalJuros)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="h-[260px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.04)" />
                <XAxis 
                  dataKey="dataLabel" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 'bold', fill: '#A1A1AA' }}
                  minTickGap={30}
                />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="saldo" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3} 
                  dot={false}
                  activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
                  animationDuration={2000}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex justify-center">
            <Badge className="bg-rose-500/5 text-rose-600 dark:text-rose-400 border-2 border-rose-500/10 rounded-2xl px-6 py-3 text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-rose-500/5">
              Total de juros a pagar: {formatCurrency(activeDebts.reduce((sum, d) => sum + calcularProjecaoDivida(d).totalJuros, 0))}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* BLOCO 3 — Simulador — E se eu abrir mão de... */}
      <Card className="rounded-[2.5rem] border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden">
        <CardHeader>
          <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-primary" /> Simulador de Impacto
          </CardTitle>
          <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-60 mt-1">Selecione despesas fixas para projetar a economia</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
            {despesasFixasRanqueadas.map(despesa => (
              <div key={despesa.id} className={cn(
                "flex items-center justify-between p-5 rounded-[2rem] border transition-all duration-300",
                selectedCuts.has(despesa.id) 
                  ? "bg-primary/5 border-primary/20 shadow-inner" 
                  : "bg-white dark:bg-zinc-900 border-gray-50 dark:border-zinc-800 shadow-sm"
              )}>
                <div className="flex items-center gap-5 min-w-0">
                  <Switch 
                    checked={selectedCuts.has(despesa.id)} 
                    onCheckedChange={() => toggleCut(despesa.id)}
                    className="data-[state=checked]:bg-primary"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-black truncate text-foreground">{despesa.description}</p>
                      {despesa.isTopImpact && <Badge className="bg-amber-500 text-white border-none text-[8px] h-4 font-black uppercase px-1.5 shadow-lg shadow-amber-500/20">Maior Alavanca 🏆</Badge>}
                    </div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{formatCurrency(despesa.amount)}/mês</p>
                  </div>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Preview do Impacto</p>
                  <p className="text-xs font-black text-foreground tabular-nums">
                    Economiza {despesa.impacto.mesesEconomizados} meses / {formatCurrency(despesa.impacto.jurosEconomizados)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-8 rounded-[2.5rem] bg-zinc-900 dark:bg-zinc-950 text-white shadow-2xl">
            {selectedCuts.size > 0 ? (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1.5 text-center md:text-left">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Resultado da Simulação</p>
                  <p className="text-base font-bold text-zinc-100">
                    Com os cortes selecionados: quita <span className="text-emerald-400 font-black">{simulacao.mesesEconomizados} meses antes</span> e economiza <span className="text-emerald-400 font-black">{formatCurrency(simulacao.jurosEconomizados)} em juros</span>.
                  </p>
                </div>
                <Button className="rounded-2xl bg-white text-black hover:bg-zinc-200 font-black uppercase tracking-widest text-[11px] h-12 px-8 shadow-xl shadow-white/5 border-none shrink-0 transition-all">
                  Gerar Plano
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                  <Info className="w-6 h-6 text-zinc-500" />
                </div>
                <p className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em]">Selecione despesas acima para simular o impacto real</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* BLOCO 4 — Estratégia de Priorização */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className={cn(
          "rounded-[2.5rem] border-gray-100 dark:border-zinc-800 shadow-sm transition-all duration-500",
          estrategias.recomendacao === 'bolaDNeve' ? "border-primary/30 bg-primary/[0.03] shadow-xl shadow-primary/5" : "opacity-80"
        )}>
          <CardHeader>
            <div className="flex items-center gap-4 mb-3">
              <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-sm">
                <SnowflakeIcon className="w-6 h-6 text-blue-400" />
              </div>
              <CardTitle className="text-xl font-black tracking-tight uppercase tracking-[0.1em]">Bola de Neve</CardTitle>
            </div>
            <CardDescription className="text-[10px] font-black uppercase tracking-widest opacity-60">Foco em encerrar dívidas menores rápido</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="flex justify-between p-5 rounded-[2rem] bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800">
              <div className="text-center flex-1 border-r border-gray-50 dark:border-zinc-800">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Prazo</p>
                <p className="text-base font-black tabular-nums">{estrategias.bolaDNeve.prazoMeses} meses</p>
              </div>
              <div className="text-center flex-1">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Juros</p>
                <p className="text-base font-black text-rose-500 tabular-nums">{formatCurrency(estrategias.bolaDNeve.totalJuros)}</p>
              </div>
            </div>
            <div className="space-y-3 px-2">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-4">Ordem Sugerida:</p>
              {estrategias.bolaDNeve.ordem.map((d, idx) => (
                <div key={d.id} className="flex items-center gap-4 text-xs font-bold text-muted-foreground">
                  <span className="w-6 h-6 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-[11px] shrink-0 font-black">{idx + 1}</span>
                  <span className="truncate text-foreground/80">{d.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "rounded-[2.5rem] border-gray-100 dark:border-zinc-800 shadow-sm transition-all duration-500",
          estrategias.recomendacao === 'avalanche' ? "border-primary/30 bg-primary/[0.03] shadow-xl shadow-primary/5" : "opacity-80"
        )}>
          <CardHeader>
            <div className="flex items-center gap-4 mb-3">
              <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-sm">
                <ZapIcon className="w-6 h-6 text-amber-500" />
              </div>
              <CardTitle className="text-xl font-black tracking-tight uppercase tracking-[0.1em]">Avalanche</CardTitle>
            </div>
            <CardDescription className="text-[10px] font-black uppercase tracking-widest opacity-60">Matar os juros mais altos primeiro</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="flex justify-between p-5 rounded-[2rem] bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800">
              <div className="text-center flex-1 border-r border-gray-50 dark:border-zinc-800">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Prazo</p>
                <p className="text-base font-black tabular-nums">{estrategias.avalanche.prazoMeses} meses</p>
              </div>
              <div className="text-center flex-1">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Juros</p>
                <p className="text-base font-black text-rose-500 tabular-nums">{formatCurrency(estrategias.avalanche.totalJuros)}</p>
              </div>
            </div>
            <div className="space-y-3 px-2">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-4">Ordem Sugerida:</p>
              {estrategias.avalanche.ordem.map((d, idx) => (
                <div key={d.id} className="flex items-center gap-4 text-xs font-bold text-muted-foreground">
                  <span className="w-6 h-6 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-[11px] shrink-0 font-black">{idx + 1}</span>
                  <span className="truncate text-foreground/80">{d.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center">
        <Badge className="bg-primary/5 text-primary border-2 border-primary/10 rounded-2xl px-8 py-4 text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/5 h-auto text-center max-w-2xl leading-relaxed">
          {estrategias.motivacao}
        </Badge>
      </div>

      {/* BLOCO 5 — Ação Imediata */}
      <Card className="rounded-[3rem] border-primary/30 bg-primary/[0.04] shadow-2xl shadow-primary/10 overflow-hidden relative">
        <CardContent className="p-10">
          <div className="flex flex-col lg:flex-row items-center gap-10 text-center lg:text-left">
            <div className="w-20 h-20 rounded-[2.5rem] bg-primary flex items-center justify-center shadow-2xl shadow-primary/40 shrink-0 transform -rotate-3">
              <ZapIcon className="w-10 h-10 text-white fill-current" />
            </div>
            <div className="flex-1 space-y-3">
              <h3 className="text-2xl font-black tracking-tighter text-foreground uppercase tracking-[0.1em]">Sua maior alavanca agora</h3>
              <p className="text-sm font-bold text-muted-foreground leading-relaxed max-w-xl">{acaoImediata}</p>
            </div>
            <Button 
              onClick={() => navigate('/?view=debts')}
              className="rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-black hover:scale-105 transition-transform font-black uppercase tracking-widest text-[11px] h-14 px-10 shadow-2xl border-none"
            >
              Ver Dívidas <ArrowRight className="w-4 h-4 ml-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
