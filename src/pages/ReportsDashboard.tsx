import { useState } from 'react';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { ExpenseChart } from '@/components/dashboard/ExpenseChart';
import { BalanceEvolutionChart } from '@/components/dashboard/BalanceEvolutionChart';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ReportsDashboard() {
  const {
    transactions,
    totalIncome,
    totalExpenses,
    getCategoryExpenses,
    accounts,
    viewDate,
    // ✅ FIX: usa getPeriodStartBalance para o saldo inicial real do período
    getPeriodStartBalance,
  } = useFinanceStore();

  // ✅ FIX: dateRange removido — era estado morto sem efeito
  // Quando a funcionalidade for implementada, adicionar de volta

  const balance = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

  // ✅ FIX: saldo inicial do período em vez do saldo atual
  const initialBalance = getPeriodStartBalance();

  // ✅ FIX: número real de dias do mês visualizado
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const avgDailyExpense = totalExpenses / daysInMonth;

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Relatórios Detalhados</h1>
          <p className="text-muted-foreground mt-1">Análise profunda das suas finanças.</p>
        </div>
        <Button variant="outline" className="gap-2 w-full md:w-auto">
          <Download className="w-4 h-4" /> Exportar Dados
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="card-elevated p-4 md:p-6">
          <h3 className="text-xs md:text-sm font-medium text-muted-foreground mb-2">Taxa de Economia</h3>
          <div className="text-2xl md:text-3xl font-bold text-primary">
            {savingsRate.toFixed(1)}%
          </div>
          <p className="text-[10px] md:text-xs text-muted-foreground mt-1">da sua receita mensal</p>
        </div>

        <div className="card-elevated p-4 md:p-6">
          <h3 className="text-xs md:text-sm font-medium text-muted-foreground mb-2">Média de Gastos Diários</h3>
          <div className="text-2xl md:text-3xl font-bold text-danger">
            {/* ✅ FIX: divide pelo número real de dias do mês */}
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(avgDailyExpense)}
          </div>
          <p className="text-[10px] md:text-xs text-muted-foreground mt-1">neste mês ({daysInMonth} dias)</p>
        </div>

        <div className="card-elevated p-4 md:p-6 sm:col-span-2 lg:col-span-1">
          <h3 className="text-xs md:text-sm font-medium text-muted-foreground mb-2">Balanço Líquido</h3>
          {/* ✅ FIX: usa variáveis do sistema de design (text-success / text-danger) */}
          <div className={cn(
            "text-2xl md:text-3xl font-bold",
            balance >= 0 ? "text-success" : "text-danger"
          )}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(balance)}
          </div>
          <p className="text-[10px] md:text-xs text-muted-foreground mt-1">receitas - despesas</p>
        </div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <div className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">Distribuição de Despesas</h2>
          <div className="min-h-[300px] h-full">
            <ExpenseChart
              data={getCategoryExpenses().reduce(
                (acc, curr) => ({ ...acc, [curr.name]: curr.value }),
                {} as Record<string, number>
              )}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">Evolução Patrimonial</h2>
          <div className="min-h-[300px] h-full">
            {/* ✅ FIX: initialBalance agora é o saldo real do início do período */}
            <BalanceEvolutionChart
              transactions={transactions}
              viewDate={viewDate}
              initialBalance={initialBalance}
            />
          </div>
        </div>
      </div>

      {/* Placeholder para gráfico futuro */}
      <div className="card-elevated p-6">
        <h2 className="text-xl font-semibold mb-4">Fluxo de Caixa Mensal</h2>
        <div className="h-[300px] w-full flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl bg-muted/20">
          <p>Gráfico de Barras (Receita vs Despesa) em breve...</p>
        </div>
      </div>
    </div>
  );
}
