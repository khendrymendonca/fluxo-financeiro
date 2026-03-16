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
    <div className="space-y-6 animate-fade-in pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-primary font-mono lowercase">Relatórios</h1>
          <p className="text-muted-foreground mt-1">Análise profunda das suas finanças.</p>
        </div>
        <Button variant="outline" className="gap-2 w-full md:w-auto rounded-xl shadow-sm hover:bg-muted/50 transition-all">
          <Download className="w-4 h-4" /> Exportar Dados
        </Button>
      </div>

      {/* KPI Cards - Grid Responsivo 2 colunas no mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        <div className="card-elevated p-4 md:p-6 border-l-4 border-l-primary">
          <h3 className="text-[10px] md:text-sm font-black uppercase tracking-widest text-muted-foreground mb-2">Taxa Economia</h3>
          <div className="text-xl md:text-3xl font-bold text-primary truncate">
            {savingsRate.toFixed(1)}%
          </div>
          <p className="text-[10px] md:text-xs text-muted-foreground mt-1 truncate">da receita mensal</p>
        </div>

        <div className="card-elevated p-4 md:p-6 border-l-4 border-l-danger">
          <h3 className="text-[10px] md:text-sm font-black uppercase tracking-widest text-muted-foreground mb-2">Gasto Diário</h3>
          <div className="text-xl md:text-3xl font-bold text-danger truncate">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(avgDailyExpense)}
          </div>
          <p className="text-[10px] md:text-xs text-muted-foreground mt-1 truncate">neste mês</p>
        </div>

        <div className="card-elevated p-4 md:p-6 border-l-4 border-l-success col-span-2 lg:col-span-1">
          <h3 className="text-[10px] md:text-sm font-black uppercase tracking-widest text-muted-foreground mb-2">Balanço Líquido</h3>
          <div className={cn(
            "text-xl md:text-3xl font-bold truncate",
            balance >= 0 ? "text-success" : "text-danger"
          )}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(balance)}
          </div>
          <p className="text-[10px] md:text-xs text-muted-foreground mt-1 truncate">receitas - despesas</p>
        </div>
      </div>

      {/* Main Charts - Grid de Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div className="h-[280px] md:h-[320px]">
          <ExpenseChart
            data={getCategoryExpenses().reduce(
              (acc, curr) => ({ ...acc, [curr.name]: curr.value }),
              {} as Record<string, number>
            )}
          />
        </div>

        <div className="h-[280px] md:h-[320px]">
          <BalanceEvolutionChart
            transactions={transactions}
            viewDate={viewDate}
            initialBalance={initialBalance}
          />
        </div>
      </div>

      {/* Footer Chart / Placeholder */}
      <div className="card-elevated p-5 md:p-6">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
          <div className="w-1.5 h-4 bg-primary rounded-full" />
          Fluxo de Caixa Mensal
        </h3>
        <div className="h-[200px] md:h-[250px] w-full flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-2xl bg-muted/10 p-4 text-center">
          <div className="bg-muted p-3 rounded-full mb-3">
            <Download className="w-6 h-6 opacity-20" />
          </div>
          <p className="text-sm font-medium">Gráfico de Barras em breve...</p>
          <p className="text-xs opacity-60 max-w-[200px] mt-1">Estamos processando seus dados para gerar novos insights.</p>
        </div>
      </div>
    </div>
  );
}
