import { useFinanceStore } from '@/hooks/useFinanceStore';
import { ExpenseChart } from '@/components/dashboard/ExpenseChart';
import { BalanceEvolutionChart } from '@/components/dashboard/BalanceEvolutionChart';
import { format, subMonths, isSameMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export default function ReportsDashboard() {
    const {
        transactions,
        totalIncome,
        totalExpenses,
        getCategoryExpenses,
        currentMonthTransactions
    } = useFinanceStore();

    const [dateRange, setDateRange] = useState('current'); // 'current', '3months', 'year'

    // Calculations for specific insights could go here
    const balance = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Relatórios Detalhados</h1>
                    <p className="text-muted-foreground mt-1">Análise profunda das suas finanças.</p>
                </div>
                <Button variant="outline" className="gap-2">
                    <Download className="w-4 h-4" /> Exportar Dados
                </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card-elevated p-6">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Taxa de Economia</h3>
                    <div className="text-3xl font-bold text-primary">
                        {savingsRate.toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">da sua receita mensal</p>
                </div>
                <div className="card-elevated p-6">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Média de Gastos Diários</h3>
                    <div className="text-3xl font-bold text-danger">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalExpenses / 30)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">neste mês</p>
                </div>
                <div className="card-elevated p-6">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Balanço Líquido</h3>
                    <div className={`text-3xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(balance)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">receitas - despesas</p>
                </div>
            </div>

            {/* Main Charts area */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Distribuição de Despesas</h2>
                    <ExpenseChart data={getCategoryExpenses()} />
                </div>

                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Evolução Patrimonial</h2>
                    <BalanceEvolutionChart transactions={transactions} />
                </div>
            </div>

            {/* Transaction History Summary (Optional, simple list or breakdown) */}
            <div className="card-elevated p-6">
                <h2 className="text-xl font-semibold mb-4">Fluxo de Caixa Mensal</h2>
                <div className="h-[300px] w-full flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl bg-muted/20">
                    <p>Gráfico de Barras (Receita vs Despesa) em breve...</p>
                </div>
            </div>
        </div>
    );
}
