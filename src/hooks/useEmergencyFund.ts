import { useState, useMemo, useCallback } from 'react';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { Transaction } from '@/types/finance';
import { parseLocalDate } from '@/utils/dateUtils';
import { buildCardInvoiceObligations } from '@/utils/invoiceObligations';
import { addMonths } from 'date-fns';

export function useEmergencyFund(currentMonthTransactions?: Transaction[]) {
  // Puxamos os dados centralizados diretamente da store de finanças
  const {
    accounts,
    creditCards,
    categories,
    transactions,
    viewDate
  } = useFinanceStore();

  // Estado local para os meses da reserva (lido do localStorage com segurança)
  const [emergencyMonths, setEmergencyMonthsState] = useState(() => {
    try {
      const saved = localStorage.getItem('emergencyMonths');
      return saved ? Number(saved) : 12;
    } catch {
      return 12;
    }
  });

  // Estado local para o aporte mensal planejado (lido do localStorage com segurança)
  const [monthlyDeposit, setMonthlyDepositState] = useState(() => {
    try {
      const saved = localStorage.getItem('emergencyMonthlyDeposit');
      return saved ? Number(saved) : 0;
    } catch {
      return 0;
    }
  });

  const setEmergencyMonths = useCallback((months: number) => {
    try {
      localStorage.setItem('emergencyMonths', String(months));
    } catch {
      // Ignora erro de cota ou bloqueio de private mode
    }
    setEmergencyMonthsState(months);
  }, []);

  const setMonthlyDeposit = useCallback((amount: number) => {
    try {
      localStorage.setItem('emergencyMonthlyDeposit', String(amount));
    } catch {
      // Ignora erro de cota ou bloqueio de private mode
    }
    setMonthlyDepositState(amount);
  }, []);

  // useMemo garante que a matemática só rode se os dados relevantes mudarem
  const emergencyData = useMemo(() => {
    // 1. Calcular as faturas virtuais para o mês selecionado (contas do cartão)
    const virtualInvoices = buildCardInvoiceObligations({
      creditCards,
      transactions,
      viewDate,
    });

    // 2. Unir as transações normais/projetadas com as faturas virtuais do cartão
    const allTransactions = [...transactions, ...virtualInvoices];

    // 3. Filtrar as despesas da Gestão de Contas que vencem no mês corrente (nominal)
    const targetMonth = viewDate.getMonth();
    const targetYear = viewDate.getFullYear();

    const monthlyBills = allTransactions.filter(t => {
      if (t.type !== 'expense' || t.deleted_at) return false;

      // Os acordos não entram na conta do custo fixo da reserva de emergência
      if (t.debtId) return false;

      if (categories && t.categoryId) {
        const category = categories.find(c => c.id === t.categoryId);
        if (category) {
          const normalizedName = category.name
            .normalize('NFD')
            .replace(/\p{Diacritic}/gu, '')
            .toLowerCase();
          if (normalizedName === 'acordo' || normalizedName.includes('acordo')) {
            return false;
          }
        }
      }

      // Regra do Gerenciador de Contas (despesas da gestão de contas):
      // Apenas recorrentes, parceladas, pagamentos de fatura ou filhas de recorrentes
      const isRecurringType = t.isRecurring || 
                              t.transactionType === 'recurring' || 
                              t.transactionType === 'installment' || 
                              t.isInvoicePayment || 
                              !!t.originalId || 
                              t.isVirtual;

      if (!isRecurringType) return false;

      // Esconder compras individuais feitas no cartão de crédito (estas são liquidadas via fatura)
      if (t.cardId && !t.isInvoicePayment && !t.isRecurring && t.transactionType !== 'recurring' && !t.originalId) {
        return false;
      }

      // Verifica se a data nominal da transação pertence ao mês/ano ativo
      const txDate = parseLocalDate(t.date.slice(0, 10));
      const isCurrentMonth = txDate.getMonth() === targetMonth && txDate.getFullYear() === targetYear;
      if (!isCurrentMonth) return false;

      return true;
    });

    // O custo fixo mensal é a soma do valor de todas as despesas listadas na Gestão de Contas
    const monthlyFixed = monthlyBills.reduce((acc, curr) => acc + Number(curr.amount), 0);

    // 4. Meta de Reserva (Gastos da Gestão de Contas x Meses Desejados)
    const targetAmount = monthlyFixed * emergencyMonths;

    // 5. Soma o que já está guardado nas contas de reserva
    const reserveAccounts = accounts.filter(acc =>
      ['metas', 'caixinha', 'investment'].includes(acc.accountType) ||
      acc.name.toLowerCase().includes('reserva')
    );
    const currentAmount = reserveAccounts.reduce((sum, acc) => sum + Number(acc.balance), 0);

    // 6. Valor que ainda falta guardar (debitando o que já foi guardado)
    const remainingAmount = Math.max(0, targetAmount - currentAmount);

    // 7. Calcula o progresso (limitado a 100% para não quebrar a UI)
    const rawProgress = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
    const progress = Math.min(rawProgress, 100);

    // 8. Projeção de Prazo
    let estimatedMonths: number | null = null;
    let estimatedTargetDate: Date | null = null;

    if (remainingAmount <= 0 && targetAmount > 0) {
      estimatedMonths = 0;
      estimatedTargetDate = new Date();
    } else if (monthlyDeposit > 0 && remainingAmount > 0) {
      estimatedMonths = Math.ceil(remainingAmount / monthlyDeposit);
      estimatedTargetDate = addMonths(new Date(), estimatedMonths);
    }

    return {
      monthlyFixed,
      targetAmount,
      currentAmount,
      remainingAmount,
      progress,
      months: emergencyMonths,
      monthlyDeposit,
      estimatedMonths,
      estimatedTargetDate,
      reserveAccounts
    };
  }, [transactions, accounts, creditCards, viewDate, emergencyMonths, monthlyDeposit]);

  return {
    ...emergencyData,
    setEmergencyMonths,
    setMonthlyDeposit
  };
}
