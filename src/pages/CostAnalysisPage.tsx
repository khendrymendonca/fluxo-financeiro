import React, { useState, useMemo } from 'react';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  PieChart as PieIcon,
  TrendingDown,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  Receipt,
  CreditCard as CardIcon,
  Wallet,
  Activity,
  ArrowUpRight,
  TrendingUp,
  Percent,
  Clock,
  ChevronDown
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  ReferenceLine,
} from 'recharts';
import {
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subMonths,
  addMonths,
  format,
  eachMonthOfInterval,
  getDaysInMonth,
  differenceInCalendarMonths,
  differenceInCalendarDays,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import { useIsMobile } from '@/hooks/useIsMobile';
import { accentColors, useThemeColor } from '@/hooks/useThemeColor';
import { formatCurrency } from '@/utils/formatters';
import { parseLocalDate } from '@/utils/dateUtils';
import { Transaction } from '@/types/finance';

const PIE_COLORS = [
  '#0d9488', // teal
  '#0284c7', // sky
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#64748b', // slate
];

type PeriodType = 'month' | 'semester' | 'year';

export default function CostAnalysisPage() {
  const { theme } = useTheme();
  const { accentColor } = useThemeColor();
  const isMobile = useIsMobile();
  const {
    transactions,
    categories,
    subcategories = [],
    viewDate,
    setViewDate,
  } = useFinanceStore();

  const isDarkTheme = useMemo(() => {
    if (theme === 'dark' || theme === 'amoled') return true;
    if (theme === 'system') {
      return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  }, [theme]);

  const activeAccent = useMemo(() => {
    return accentColors.find((c) => c.id === accentColor) ?? accentColors[0];
  }, [accentColor]);

  const primaryGraphColor = isDarkTheme ? '#38bdf8' : `hsl(${activeAccent.hsl})`;

  // Categorias de despesa disponíveis
  const expenseCategories = useMemo(() => {
    return categories
      .filter((c) => c.type === 'expense' && c.isActive !== false && !c.isSystem)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [categories]);

  const [period, setPeriod] = useState<PeriodType>('month');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(() => {
    return categories.find((c) => c.type === 'expense' && c.isActive !== false && !c.isSystem)?.id || '';
  });
  const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState<string[]>([]);
  const [chartMode, setChartMode] = useState<'bar' | 'area' | 'line'>('bar');

  // Se nenhuma categoria estiver selecionada e existirem categorias, seleciona a primeira
  React.useEffect(() => {
    if (!selectedCategoryId && expenseCategories.length > 0) {
      setSelectedCategoryId(expenseCategories[0].id);
    }
  }, [expenseCategories, selectedCategoryId]);

  // Reset de subcategoria caso mude a categoria
  const handleCategoryChange = (val: string) => {
    setSelectedCategoryId(val);
    setSelectedSubcategoryIds([]);
  };

  const toggleSubcategory = (id: string) => {
    setSelectedSubcategoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Subcategorias da categoria ativa
  const availableSubcategories = useMemo(() => {
    if (!selectedCategoryId) return [];
    return subcategories
      .filter((s) => s.categoryId === selectedCategoryId && s.isActive !== false)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [selectedCategoryId, subcategories]);

  // Intervalo selecionado (Mês, Semestre ou Ano)
  const currentInterval = useMemo(() => {
    if (period === 'month') {
      return {
        start: startOfMonth(viewDate),
        end: endOfMonth(viewDate),
      };
    }
    if (period === 'semester') {
      const isFirstHalf = viewDate.getMonth() < 6;
      const start = new Date(viewDate.getFullYear(), isFirstHalf ? 0 : 6, 1);
      const end = endOfMonth(new Date(viewDate.getFullYear(), isFirstHalf ? 5 : 11, 1));
      return { start, end };
    }
    return {
      start: startOfYear(viewDate),
      end: endOfYear(viewDate),
    };
  }, [viewDate, period]);

  // Navegação de período
  const shiftPeriod = (dir: -1 | 1) => {
    if (period === 'month') {
      setViewDate(addMonths(viewDate, dir));
    } else if (period === 'semester') {
      setViewDate(addMonths(viewDate, dir * 6));
    } else {
      setViewDate(new Date(viewDate.getFullYear() + dir, 0, 1));
    }
  };

  // Label do período atual
  const periodLabel = useMemo(() => {
    if (period === 'month') {
      return format(viewDate, 'MMMM yyyy', { locale: ptBR });
    }
    if (period === 'semester') {
      const sem = viewDate.getMonth() < 6 ? '1º Semestre' : '2º Semestre';
      return `${sem} ${viewDate.getFullYear()}`;
    }
    return `${viewDate.getFullYear()}`;
  }, [period, viewDate]);

  // Função para verificar se uma transação é um gasto válido na tela de Análise de Custos:
  // Independente de dinheiro ou cartão de crédito, capturamos o custo real
  const isCostExpense = (t: Transaction): boolean => {
    if (t.type !== 'expense') return false;
    if (t.isTransfer) return false;
    if (t.isInvoicePayment) return false; // Evita dupla contagem da fatura consolidada
    if (t.deleted_at) return false;
    return true;
  };

  // Transações no intervalo selecionado
  const periodTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (!isCostExpense(t)) return false;
      const tDate = parseLocalDate(t.date.slice(0, 10));
      return tDate >= currentInterval.start && tDate <= currentInterval.end;
    });
  }, [transactions, currentInterval]);

  // Transações do ano inteiro para calcular o impacto anual
  const yearInterval = useMemo(() => {
    return {
      start: startOfYear(viewDate),
      end: endOfYear(viewDate),
    };
  }, [viewDate]);

  const yearTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (!isCostExpense(t)) return false;
      const tDate = parseLocalDate(t.date.slice(0, 10));
      return tDate >= yearInterval.start && tDate <= yearInterval.end;
    });
  }, [transactions, yearInterval]);

  // Filtrar pelos parâmetros de Categoria / Subcategoria
  const filterMatched = (t: Transaction): boolean => {
    if (selectedCategoryId !== 'all' && t.categoryId !== selectedCategoryId) {
      return false;
    }
    if (selectedSubcategoryIds.length > 0) {
      const subId = t.subcategoryId || (t as any).subcategory_id;
      if (!subId || !selectedSubcategoryIds.includes(subId)) return false;
    }
    return true;
  };

  // Itens correspondentes no período
  const targetPeriodTransactions = useMemo(() => {
    return periodTransactions.filter(filterMatched).sort((a, b) => {
      return parseLocalDate(b.date.slice(0, 10)).getTime() - parseLocalDate(a.date.slice(0, 10)).getTime();
    });
  }, [periodTransactions, selectedCategoryId, selectedSubcategoryIds]);

  // Itens correspondentes no ano
  const targetYearTransactions = useMemo(() => {
    return yearTransactions.filter(filterMatched);
  }, [yearTransactions, selectedCategoryId, selectedSubcategoryIds]);

  // Cálculos de totais
  const targetPeriodTotal = useMemo(() => {
    return targetPeriodTransactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [targetPeriodTransactions]);

  const totalPeriodExpenses = useMemo(() => {
    return periodTransactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [periodTransactions]);

  const targetYearTotal = useMemo(() => {
    return targetYearTransactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [targetYearTransactions]);

  const totalYearExpenses = useMemo(() => {
    return yearTransactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [yearTransactions]);

  // Quantidade de dias no período para calcular a média diária
  // Regra Estatística: se o primeiro registro da categoria/subcategoria no período começou após o início do período,
  // contamos apenas a partir do dia do primeiro registro (ou início do período, o que for mais recente).
  const firstRecordInPeriodDate = useMemo(() => {
    if (targetPeriodTransactions.length === 0) return null;
    let earliest = parseLocalDate(targetPeriodTransactions[0].date.slice(0, 10));
    for (const t of targetPeriodTransactions) {
      const d = parseLocalDate(t.date.slice(0, 10));
      if (d < earliest) earliest = d;
    }
    return earliest;
  }, [targetPeriodTransactions]);

  const periodDaysCount = useMemo(() => {
    if (period === 'month') {
      if (!firstRecordInPeriodDate) return getDaysInMonth(viewDate);
      const effectiveStart = firstRecordInPeriodDate > currentInterval.start
        ? firstRecordInPeriodDate
        : currentInterval.start;
      const days = differenceInCalendarDays(currentInterval.end, effectiveStart) + 1;
      return Math.max(1, days);
    }
    const effectiveStart = firstRecordInPeriodDate && firstRecordInPeriodDate > currentInterval.start
      ? firstRecordInPeriodDate
      : currentInterval.start;
    const diffDays = differenceInCalendarDays(currentInterval.end, effectiveStart) + 1;
    return Math.max(1, diffDays);
  }, [period, viewDate, currentInterval, firstRecordInPeriodDate]);

  // Quantidade de meses no período para calcular a média mensal
  // Regra Estatística: a média deve considerar a partir do primeiro mês com registro.
  // Exemplo: se o ano é avaliado e o primeiro gasto foi em Julho, calcula-se apenas de Julho até o mês de visualização (ex: Agosto = 2 meses).
  const periodMonthsCount = useMemo(() => {
    if (period === 'month') return 1;

    if (!firstRecordInPeriodDate) {
      return period === 'semester' ? 6 : 12;
    }

    // Primeiro mês com registro dentro do período (truncado para início do mês)
    const firstMonthStart = startOfMonth(firstRecordInPeriodDate);
    const effectiveMonthStart = firstMonthStart > currentInterval.start
      ? firstMonthStart
      : currentInterval.start;

    // Até onde vai a contagem de meses: até o mês atual de visualização (ou fim do período)
    const effectiveMonthEnd = startOfMonth(currentInterval.end < viewDate ? currentInterval.end : viewDate);

    if (effectiveMonthEnd < effectiveMonthStart) {
      return 1;
    }

    const months = differenceInCalendarMonths(effectiveMonthEnd, effectiveMonthStart) + 1;
    return Math.max(1, months);
  }, [period, firstRecordInPeriodDate, currentInterval, viewDate]);

  // Métricas Principais
  const dailyAverage = useMemo(() => {
    return targetPeriodTotal / periodDaysCount;
  }, [targetPeriodTotal, periodDaysCount]);

  const monthlyAverage = useMemo(() => {
    return targetPeriodTotal / periodMonthsCount;
  }, [targetPeriodTotal, periodMonthsCount]);

  // Representatividade / Impacto
  const monthShare = useMemo(() => {
    if (totalPeriodExpenses === 0) return 0;
    return (targetPeriodTotal / totalPeriodExpenses) * 100;
  }, [targetPeriodTotal, totalPeriodExpenses]);

  const yearShare = useMemo(() => {
    if (totalYearExpenses === 0) return 0;
    return (targetYearTotal / totalYearExpenses) * 100;
  }, [targetYearTotal, totalYearExpenses]);

  // Histórico Mensal (Últimos 12 meses até o mês de visualização)
  const historyData = useMemo(() => {
    const months = eachMonthOfInterval({
      start: subMonths(startOfMonth(viewDate), 11),
      end: endOfMonth(viewDate),
    });

    return months.map((m) => {
      const mStart = startOfMonth(m);
      const mEnd = endOfMonth(m);
      const monthTxs = transactions.filter((t) => {
        if (!isCostExpense(t)) return false;
        if (!filterMatched(t)) return false;
        const d = parseLocalDate(t.date.slice(0, 10));
        return d >= mStart && d <= mEnd;
      });
      const val = monthTxs.reduce((sum, t) => sum + Number(t.amount || 0), 0);

      return {
        label: format(m, 'MMM/yy', { locale: ptBR }),
        rawDate: m,
        total: val,
        isCurrent: m.getMonth() === viewDate.getMonth() && m.getFullYear() === viewDate.getFullYear(),
      };
    });
  }, [transactions, viewDate, selectedCategoryId, selectedSubcategoryIds]);

  const displayedHistoryData = useMemo(() => {
    return isMobile ? historyData.slice(-3) : historyData;
  }, [historyData, isMobile]);

  // Composição por Subcategorias
  const subcategoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    let uncategorizedSum = 0;

    targetPeriodTransactions.forEach((t) => {
      const subId = t.subcategoryId || (t as any).subcategory_id;
      if (subId) {
        map.set(subId, (map.get(subId) || 0) + Number(t.amount || 0));
      } else {
        uncategorizedSum += Number(t.amount || 0);
      }
    });

    const items = Array.from(map.entries()).map(([subId, value]) => {
      const foundSub = availableSubcategories.find((s) => s.id === subId);
      return {
        id: subId,
        name: foundSub ? foundSub.name : 'Outras',
        value,
      };
    });

    if (uncategorizedSum > 0) {
      items.push({
        id: 'no-sub',
        name: 'Geral / Sem Subcategoria',
        value: uncategorizedSum,
      });
    }

    return items.sort((a, b) => b.value - a.value);
  }, [targetPeriodTransactions, availableSubcategories]);

  // Nome do foco de análise
  const activeCategoryObj = useMemo(() => {
    return categories.find((c) => c.id === selectedCategoryId);
  }, [categories, selectedCategoryId]);

  const currentFocusName = useMemo(() => {
    if (selectedSubcategoryIds.length === 1) {
      const activeSubcategoryObj = subcategories.find((s) => s.id === selectedSubcategoryIds[0]);
      return `${activeCategoryObj?.name || 'Categoria'} › ${activeSubcategoryObj?.name || 'Subcategoria'}`;
    }
    if (selectedSubcategoryIds.length > 1) {
      return `${activeCategoryObj?.name || 'Categoria'} › Várias Subcategorias`;
    }
    return activeCategoryObj?.name || 'Categoria';
  }, [activeCategoryObj, selectedSubcategoryIds, subcategories]);

  const monthlyBudgetLimit = useMemo(() => {
    if (selectedSubcategoryIds.length === 1) {
       const sub = subcategories.find((s) => s.id === selectedSubcategoryIds[0]);
       return sub?.budgetLimit || null;
    }
    if (selectedSubcategoryIds.length === 0 && activeCategoryObj) {
       return activeCategoryObj.budgetLimit || null;
    }
    return null;
  }, [selectedSubcategoryIds, subcategories, activeCategoryObj]);

  const activeBudgetLimit = useMemo(() => {
    if (!monthlyBudgetLimit) return null;
    if (period === 'semester') return monthlyBudgetLimit * 6;
    if (period === 'year') return monthlyBudgetLimit * 12;
    return monthlyBudgetLimit;
  }, [monthlyBudgetLimit, period]);

  return (
    <div className="space-y-6 pb-24 md:pb-12 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Cabeçalho */}
      <PageHeader title="Análise de Custos" icon={PieIcon}>
        {/* Seletor de Período */}
        <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-zinc-800/60 p-1 rounded-2xl border border-gray-200/50 dark:border-zinc-800">
          {(['month', 'semester', 'year'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                period === p
                  ? 'bg-white dark:bg-zinc-900 text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {p === 'month' ? 'Mês' : p === 'semester' ? 'Semestre' : 'Ano'}
            </button>
          ))}
        </div>

        {/* Navegador de Data */}
        <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-1 shadow-sm">
          <button
            onClick={() => shiftPeriod(-1)}
            className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Período anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold px-2 capitalize min-w-[110px] text-center">
            {periodLabel}
          </span>
          <button
            onClick={() => shiftPeriod(1)}
            className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Próximo período"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </PageHeader>

      {/* Barra de Filtros: Categoria e Subcategoria */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 rounded-3xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-6">
          {/* Categoria */}
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-primary" />
              Categoria
            </label>

            {/* Versão Mobile: Select / Dropdown */}
            <div className="block md:hidden">
              <Select
                value={selectedCategoryId}
                onValueChange={(val) => handleCategoryChange(val)}
              >
                <SelectTrigger className="w-full bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 rounded-xl h-11 text-sm font-bold shadow-sm">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent className="max-h-72 rounded-xl">
                  {expenseCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="font-medium text-sm">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Versão Desktop: Grade Flex */}
            <div className="hidden md:flex flex-wrap gap-2">
              {expenseCategories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleCategoryChange(c.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-bold transition-all border',
                    selectedCategoryId === c.id
                      ? 'bg-primary text-primary-foreground border-primary shadow-md'
                      : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-muted-foreground hover:border-primary/50'
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Subcategoria */}
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-sky-500" />
              Subcategorias
            </label>
            {availableSubcategories.length === 0 ? (
              <div className="text-xs text-muted-foreground font-medium p-1">
                Nenhuma subcategoria vinculada
              </div>
            ) : (
              <>
                {/* Versão Mobile (Menu Suspenso Múltiplo - Popover) */}
                <div className="block md:hidden">
                  <Popover>
                    <PopoverTrigger className="flex w-full items-center justify-between bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl h-11 px-3 text-sm font-bold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20">
                      <span className={selectedSubcategoryIds.length === 0 ? 'text-muted-foreground font-normal' : 'text-foreground'}>
                        {selectedSubcategoryIds.length === 0 
                          ? 'Todas as Subcategorias' 
                          : `${selectedSubcategoryIds.length} subcategoria(s) selecionada(s)`}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </PopoverTrigger>
                    <PopoverContent className="w-[calc(100vw-32px)] max-h-72 overflow-y-auto rounded-xl p-3 border-gray-200 dark:border-zinc-800 shadow-xl" align="start">
                      <div className="flex flex-col gap-1.5">
                        <button
                          onClick={() => setSelectedSubcategoryIds([])}
                          className={cn(
                            'w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold transition-all',
                            selectedSubcategoryIds.length === 0
                              ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400'
                              : 'text-muted-foreground hover:bg-gray-100 dark:hover:bg-zinc-800'
                          )}
                        >
                          Todas as Subcategorias
                        </button>
                        <div className="h-px bg-border/50 my-1 w-full" />
                        {availableSubcategories.map((s) => {
                          const isSelected = selectedSubcategoryIds.includes(s.id);
                          return (
                            <button
                              key={s.id}
                              onClick={() => toggleSubcategory(s.id)}
                              className={cn(
                                'flex items-center justify-between w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold transition-all',
                                isSelected
                                  ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400'
                                  : 'text-muted-foreground hover:bg-gray-100 dark:hover:bg-zinc-800'
                              )}
                            >
                              <span>{s.name}</span>
                              {isSelected && <div className="w-2 h-2 rounded-full bg-sky-500" />}
                            </button>
                          );
                        })}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Versão Desktop (Grade Flex) */}
                <div className="hidden md:flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedSubcategoryIds([])}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0',
                      selectedSubcategoryIds.length === 0
                        ? 'bg-sky-500 text-white border-sky-500 shadow-md'
                        : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-muted-foreground hover:border-sky-500/50'
                    )}
                  >
                    Todas
                  </button>
                  {availableSubcategories.map((s) => {
                    const isSelected = selectedSubcategoryIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        onClick={() => toggleSubcategory(s.id)}
                        className={cn(
                          'px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0',
                          isSelected
                            ? 'bg-sky-500 text-white border-sky-500 shadow-md'
                            : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-muted-foreground hover:border-sky-500/50'
                        )}
                      >
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Indicador do Escopo Ativo */}
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
            <span className="font-bold text-foreground truncate">{currentFocusName}</span>
          </div>
          <span className="font-medium shrink-0">
            {targetPeriodTransactions.length}{' '}
            {targetPeriodTransactions.length === 1 ? 'lançamento' : 'lançamentos'}
          </span>
        </div>
      </div>

      {/* Grid de Métricas Principais (Executivo) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Gasto no Período */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Total no Período
            </span>
            <div className="w-7 h-7 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-black tabular-nums tracking-tight text-foreground">
              {formatCurrency(targetPeriodTotal)}
            </p>
            {activeBudgetLimit ? (
              <div className="mt-2.5 space-y-1.5">
                <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-muted-foreground">Teto: {formatCurrency(activeBudgetLimit)}</span>
                    <span className={cn(
                        "tabular-nums",
                        targetPeriodTotal > activeBudgetLimit ? "text-rose-500" : "text-emerald-500"
                    )}>
                        {((targetPeriodTotal / activeBudgetLimit) * 100).toFixed(1)}%
                    </span>
                </div>
                <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
                    <div 
                        className={cn(
                            "h-full rounded-full transition-all",
                            targetPeriodTotal > activeBudgetLimit ? "bg-rose-500" : "bg-emerald-500"
                        )}
                        style={{ width: `${Math.min((targetPeriodTotal / activeBudgetLimit) * 100, 100)}%` }}
                    />
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground mt-1 font-medium truncate">
                {periodLabel}
              </p>
            )}
          </div>
        </div>

        {/* Média Diária */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Média Diária
            </span>
            <div className="w-7 h-7 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black tabular-nums tracking-tight text-foreground">
            {formatCurrency(dailyAverage)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1 font-medium truncate">
            {firstRecordInPeriodDate && period !== 'month'
              ? `${periodDaysCount} dias (a partir do 1º registro)`
              : `${periodDaysCount} dias no período`}
          </p>
        </div>

        {/* Média Mensal */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Média Mensal
            </span>
            <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black tabular-nums tracking-tight text-foreground">
            {formatCurrency(monthlyAverage)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1 font-medium truncate">
            {firstRecordInPeriodDate && period !== 'month'
              ? `${periodMonthsCount} ${periodMonthsCount === 1 ? 'mês' : 'meses'} (desde o 1º gasto)`
              : `${periodMonthsCount} ${periodMonthsCount === 1 ? 'mês base' : 'meses avaliados'}`}
          </p>
        </div>

        {/* Impacto / Representatividade */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Impacto
            </span>
            <div className="w-7 h-7 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black tabular-nums tracking-tight text-foreground">
            {monthShare.toFixed(1)}%
          </p>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1 font-medium">
            <span>No Ano:</span>
            <span className="font-bold text-foreground">{yearShare.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Gráfico Principal: Evolução Histórica dos Últimos 12 Meses */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Evolução Histórica (12 Meses)
            </h2>
            <p className="text-xs text-muted-foreground font-medium">
              Comparativo mês a mês do item selecionado
            </p>
          </div>

          {/* Alternador de Tipo de Gráfico */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-zinc-800/60 p-1 rounded-xl border border-gray-200/50 dark:border-zinc-800 self-start sm:self-auto">
            {(['bar', 'area', 'line'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setChartMode(mode)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold capitalize transition-all',
                  chartMode === mode
                    ? 'bg-white dark:bg-zinc-900 text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {mode === 'bar' ? 'Barras' : mode === 'area' ? 'Área' : 'Linha'}
              </button>
            ))}
          </div>
        </div>

        <div className="h-64 sm:h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            {chartMode === 'bar' ? (
              <BarChart data={displayedHistoryData} margin={{ top: 30, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  className="text-muted-foreground"
                />
                <YAxis
                  width={40}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: 'currentColor' }}
                  tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k` : val.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  className="text-muted-foreground"
                />
                <Tooltip
                  cursor={{ fill: 'rgba(128,128,128,0.1)' }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-card text-card-foreground shadow-lg rounded-xl p-3 border border-border/40 text-xs">
                          <p className="font-bold mb-1">{label}</p>
                          <p className="font-black text-primary">
                            {formatCurrency(Number(payload[0].value))}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {monthlyBudgetLimit && (
                  <ReferenceLine
                    y={monthlyBudgetLimit}
                    stroke="#f43f5e"
                    strokeDasharray="3 3"
                    label={{
                      position: 'insideTopLeft',
                      value: 'Orçamento',
                      fill: '#f43f5e',
                      fontSize: 10,
                      fontWeight: 'bold'
                    }}
                  />
                )}
                <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                  <LabelList
                    dataKey="total"
                    position="top"
                    formatter={(val: number) => val > 0 ? formatCurrency(val) : ''}
                    style={{ fill: 'currentColor', fontSize: 10, fontWeight: 'bold' }}
                    className="text-muted-foreground"
                  />
                  {historyData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isCurrent ? '#f43f5e' : primaryGraphColor}
                      opacity={entry.isCurrent ? 1 : 0.75}
                    />
                  ))}
                </Bar>
              </BarChart>
            ) : chartMode === 'area' ? (
              <AreaChart data={displayedHistoryData} margin={{ top: 30, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={primaryGraphColor} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={primaryGraphColor} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  className="text-muted-foreground"
                />
                <YAxis
                  width={40}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: 'currentColor' }}
                  tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k` : val.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  className="text-muted-foreground"
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-card text-card-foreground shadow-lg rounded-xl p-3 border border-border/40 text-xs">
                          <p className="font-bold mb-1">{label}</p>
                          <p className="font-black text-primary">
                            {formatCurrency(Number(payload[0].value))}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {monthlyBudgetLimit && (
                  <ReferenceLine
                    y={monthlyBudgetLimit}
                    stroke="#f43f5e"
                    strokeDasharray="3 3"
                    label={{
                      position: 'insideTopLeft',
                      value: 'Orçamento',
                      fill: '#f43f5e',
                      fontSize: 10,
                      fontWeight: 'bold'
                    }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke={primaryGraphColor}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#costGrad)"
                />
              </AreaChart>
            ) : (
              <LineChart data={displayedHistoryData} margin={{ top: 30, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  className="text-muted-foreground"
                />
                <YAxis
                  width={40}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: 'currentColor' }}
                  tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k` : val.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  className="text-muted-foreground"
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-card text-card-foreground shadow-lg rounded-xl p-3 border border-border/40 text-xs">
                          <p className="font-bold mb-1">{label}</p>
                          <p className="font-black text-primary">
                            {formatCurrency(Number(payload[0].value))}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {monthlyBudgetLimit && (
                  <ReferenceLine
                    y={monthlyBudgetLimit}
                    stroke="#f43f5e"
                    strokeDasharray="3 3"
                    label={{
                      position: 'insideTopLeft',
                      value: 'Orçamento',
                      fill: '#f43f5e',
                      fontSize: 10,
                      fontWeight: 'bold'
                    }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke={primaryGraphColor}
                  strokeWidth={3}
                  dot={{ r: 4, fill: primaryGraphColor }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bloco Dinâmico: Distribuição das Subcategorias */}
      {subcategoryBreakdown.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-sky-500" />
              Detalhamento por Subcategorias
            </h2>
            <p className="text-xs text-muted-foreground font-medium">
              Participação de cada subcategoria no custo total do período
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Gráfico Donut */}
            <div className="h-56 sm:h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={subcategoryBreakdown}
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {subcategoryBreakdown.map((entry, index) => (
                      <Cell
                        key={`cell-pie-${entry.id}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(Number(val)), 'Valor']}
                    contentStyle={{
                      backgroundColor: isDarkTheme ? '#18181b' : '#ffffff',
                      borderRadius: '1rem',
                      border: isDarkTheme ? '1px solid #27272a' : '1px solid #f4f4f5',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Lista Executiva de Subcategorias com % */}
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-2">
              {subcategoryBreakdown.map((item, index) => {
                const pct = targetPeriodTotal > 0 ? (item.value / targetPeriodTotal) * 100 : 0;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id !== 'no-sub') {
                        toggleSubcategory(item.id);
                      }
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-gray-50/50 dark:bg-zinc-950/40 border border-gray-100/80 dark:border-zinc-800 hover:border-primary/40 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                      />
                      <span className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                        {item.name}
                      </span>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-xs font-black tabular-nums text-foreground">
                        {formatCurrency(item.value)}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-bold">{pct.toFixed(1)}%</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Extrato Detalhado das Transações que Formam o Custo */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-500" />
              Lançamentos do Período
            </h2>
          </div>
        </div>

        {targetPeriodTransactions.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm font-medium">
            Nenhum lançamento encontrado para os filtros e período selecionados.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-zinc-800/80 max-h-96 overflow-y-auto">
            {targetPeriodTransactions.map((tx) => {
              const txDate = parseLocalDate(tx.date.slice(0, 10));
              const isCard = !!tx.cardId;
              const subObj = subcategories.find((s) => s.id === tx.subcategoryId);

              return (
                <div
                  key={tx.id}
                  className="py-3 px-1 flex items-center justify-between gap-3 hover:bg-gray-50/50 dark:hover:bg-zinc-950/40 rounded-2xl transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        'w-9 h-9 rounded-2xl flex items-center justify-center shrink-0',
                        isCard
                          ? 'bg-purple-500/10 text-purple-500'
                          : 'bg-emerald-500/10 text-emerald-500'
                      )}
                    >
                      {isCard ? <CardIcon className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                        {tx.description || 'Sem descrição'}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium mt-0.5">
                        <span>{format(txDate, 'dd/MM/yyyy')}</span>
                        {subObj && (
                          <>
                            <span>•</span>
                            <span className="font-bold text-sky-600 dark:text-sky-400">
                              {subObj.name}
                            </span>
                          </>
                        )}
                        <span>•</span>
                        <span>{isCard ? 'Cartão' : 'Conta/Dinheiro'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs sm:text-sm font-black tabular-nums text-rose-500">
                      - {formatCurrency(Number(tx.amount || 0))}
                    </p>
                    <span
                      className={cn(
                        'text-[9px] font-bold uppercase tracking-wider',
                        tx.isPaid ? 'text-emerald-500' : 'text-amber-500'
                      )}
                    >
                      {tx.isPaid ? 'Pago' : 'Pendente'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
