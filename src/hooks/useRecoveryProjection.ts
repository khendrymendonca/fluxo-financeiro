import { useMemo } from 'react';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function useRecoveryProjection() {
  const { accounts, currentMonthTransactions, debts } = useFinanceStore();

  return useMemo(() => {
    // Saldo atual real (soma de todas as contas)
    const currentBalance = accounts.reduce((s, a) => s + Number(a.balance), 0);

    // Receita mensal recorrente (transações isRecurring do tipo income)
    // Filtramos apenas os registros "pai" (sem originalId) para simular a base mensal
    const monthlyIncome = currentMonthTransactions
      .filter(t => t.isRecurring && !t.originalId && t.type === 'income')
      .reduce((s, t) => s + Number(t.amount), 0);

    // Gastos fixos mensais (isFixed das categorias ou isRecurring expense)
    const monthlyFixed = currentMonthTransactions
      .filter(t => t.isRecurring && !t.originalId && t.type === 'expense' && !t.isInvoicePayment)
      .reduce((s, t) => s + Number(t.amount), 0);

    // Parcelas de dívidas ativas
    const monthlyDebt = debts
      .filter(d => d.status === 'active')
      .reduce((s, d) => s + (Number(d.installmentAmount) || Number(d.minimumPayment) || 0), 0);

    const monthlyNet = monthlyIncome - monthlyFixed - monthlyDebt;

    // Projeção mês a mês (máx 60 meses = 5 anos)
    const projection: { month: string; balance: number; isRecovery: boolean }[] = [];
    let balance = currentBalance;
    const today = new Date();
    let recoveryMonth: string | null = null;

    // Se o saldo já é positivo e a sobra mensal também, recovery é "Agora"
    if (balance >= 0 && monthlyNet >= 0) recoveryMonth = 'Hoje';

    for (let i = 1; i <= 60; i++) {
      balance += monthlyNet;
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const label = format(date, 'MMM/yy', { locale: ptBR });
      
      const isRecovery = balance >= 0 && (projection.length === 0 ? currentBalance < 0 : projection[projection.length - 1].balance < 0);
      
      if (isRecovery && !recoveryMonth) recoveryMonth = label;
      
      projection.push({ 
        month: label.charAt(0).toUpperCase() + label.slice(1), 
        balance, 
        isRecovery 
      });

      // Se achou a saída, mostra mais 12 meses para dar contexto de estabilidade e para
      if (balance > 0 && i > 12 && recoveryMonth) break;
      // Se em 5 anos não recupera, para também
      if (i === 60) break;
    }

    return { projection, monthlyNet, monthlyIncome, monthlyFixed, monthlyDebt, currentBalance, recoveryMonth };
  }, [accounts, currentMonthTransactions, debts]);
}
