import { Debt, Transaction } from '@/types/finance';
import { isAgreementEntryTransaction } from '@/utils/debtAgreement';
import { parseLocalDate } from '@/utils/dateUtils';

const SCORE_BASELINE = 1000;
const SCORE_MIN = 0;
const SCORE_MAX = 1000;

function dayDiff(lateDate: Date, earlyDate: Date) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((lateDate.getTime() - earlyDate.getTime()) / msPerDay);
}

function getPaymentDeltaPoints(daysLate: number) {
  if (daysLate <= 0) return 0;
  if (daysLate <= 3) return -10;
  if (daysLate <= 10) return -25;
  return Math.max(-100, -50 - ((daysLate - 10) * 2));
}

function isDebtActive(debt: Debt) {
  if (debt.status === 'paid') return false;
  if (typeof debt.remainingAmount === 'number' && debt.remainingAmount <= 0) return false;
  return true;
}

function getDebtInstallments(debtId: string, transactions: Transaction[]) {
  return transactions.filter((tx) => (
    !tx.deleted_at &&
    tx.type === 'expense' &&
    tx.debtId === debtId &&
    !isAgreementEntryTransaction(tx, debtId)
  ));
}

export function getFirstWorkingDayOfMonth(date: Date): Date {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const dayOfWeek = firstDay.getDay(); // 0 = Sunday, 6 = Saturday
  if (dayOfWeek === 0) return new Date(year, month, 2); // Monday
  if (dayOfWeek === 6) return new Date(year, month, 3); // Monday
  return firstDay;
}

function hasNoOverdueExpensesOnFirstWorkingDay(transactions: Transaction[], referenceDate: Date) {
  const firstWorkingDay = getFirstWorkingDayOfMonth(referenceDate);
  const checkDate = referenceDate.getTime() < firstWorkingDay.getTime() ? referenceDate : firstWorkingDay;
  const checkDateTime = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate()).getTime();

  return !transactions.some((tx) => {
    if (tx.deleted_at) return false;
    if (tx.type !== 'expense') return false;

    const dueDate = parseLocalDate(tx.date);
    const dueDateTime = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()).getTime();

    // Apenas contas que venceram ANTES da data de checagem
    if (dueDateTime >= checkDateTime) return false;

    if (!tx.isPaid) return true;

    if (tx.paymentDate) {
      const paymentDate = parseLocalDate(tx.paymentDate);
      const paymentDateTime = new Date(paymentDate.getFullYear(), paymentDate.getMonth(), paymentDate.getDate()).getTime();
      return paymentDateTime > checkDateTime;
    }

    return false;
  });
}

export type FluxoScoreBreakdown = {
  score: number;
  accountsDelta: number;
  agreementsDelta: number;
  monthlyBonus: number;
};

export function calculateFluxoScore(
  transactions: Transaction[] = [],
  debts: Debt[] = [],
  referenceDate = new Date()
): FluxoScoreBreakdown {
  console.log('=== [DEBUG SCORE] INÍCIO DO RECALCULO ===');
  console.log('[DEBUG SCORE] Analisando todos os acordos recebidos:', debts.map(d => ({
    nome: d.name,
    status: d.status,
    remainingAmount: d.remainingAmount,
    typeofRemaining: typeof d.remainingAmount,
    isDebtActive: isDebtActive(d)
  })));
  
  const accountsPenalties: any[] = [];
  const accountsDelta = transactions.reduce((sum, tx) => {
    if (tx.deleted_at || tx.type !== 'expense') return sum;
    if (tx.cardId && !tx.isInvoicePayment) return sum;
    const dueDate = parseLocalDate(tx.date);

    // Caso 1: Conta pendente (não paga) e vencida
    if (!tx.isPaid) {
      const diff = dayDiff(referenceDate, dueDate);
      if (diff > 0) {
        const points = getPaymentDeltaPoints(diff);
        if (points < 0) {
          accountsPenalties.push({
            desc: tx.description,
            vencimento: tx.date,
            status: 'Pendente Atrasada',
            diasAtraso: diff,
            pontos: points
          });
        }
        return sum + points;
      }
      return sum;
    }

    // Caso 2: Conta paga
    if (tx.paymentDate) {
      const paymentDate = parseLocalDate(tx.paymentDate);
      const diff = dayDiff(paymentDate, dueDate);
      const points = getPaymentDeltaPoints(diff);

      if (points < 0) {
        // Penalidade por pagamento com atraso expira após 30 dias do pagamento
        const daysSincePayment = dayDiff(referenceDate, paymentDate);
        if (daysSincePayment <= 30) {
          accountsPenalties.push({
            desc: tx.description,
            vencimento: tx.date,
            pagamento: tx.paymentDate,
            status: 'Paga com Atraso (Recente)',
            diasAtraso: diff,
            pontos: points
          });
          return sum + points;
        }
      } else {
        // Bonificações de pontualidade/antecipação não adicionam pontos acima de 1000
        return sum;
      }
    }
    return sum;
  }, 0);

  const activeDebts: any[] = [];
  const agreementsDelta = debts.reduce((sum, debt) => {
    if (!isDebtActive(debt)) return sum;

    const installments = getDebtInstallments(debt.id, transactions);
    const totalInstallments = installments.length > 0
      ? installments.length
      : Math.max(0, Number(debt.totalInstallments) || 0);

    const paidInstallments = installments.filter((tx) => tx.isPaid).length;
    const recovered = totalInstallments > 0 ? (paidInstallments / totalInstallments) * 100 : 0;
    const points = -100 + recovered;
    activeDebts.push({
      nome: debt.name,
      total: totalInstallments,
      pagas: paidInstallments,
      rec: recovered.toFixed(1) + '%',
      pontos: points
    });
    return sum - 100 + recovered;
  }, 0);

  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth();
  const isAfterOrEqualJune2026 = refYear > 2026 || (refYear === 2026 && refMonth >= 5);

  const monthlyBonus = isAfterOrEqualJune2026
    ? (hasNoOverdueExpensesOnFirstWorkingDay(transactions, referenceDate) ? 10 : 0)
    : 0;

  // Como o baseline inicial é 1000 (pontuação máxima), os pagamentos pontuais/adiantados do passado
  // servem apenas para abater penalidades sofridas (retornando o score para perto ou exatamente 1000).
  // Eles não podem elevar o delta de contas acima de 0 (o que camuflaria contas atualmente atrasadas).
  const clampedAccountsDelta = Math.min(0, accountsDelta);

  const rawScore = SCORE_BASELINE + clampedAccountsDelta + agreementsDelta + monthlyBonus;
  const score = Math.max(
    SCORE_MIN,
    Math.min(SCORE_MAX, rawScore)
  );

  console.log('[DEBUG SCORE] Contas com Penalidade:', accountsPenalties);
  console.log('[DEBUG SCORE] Acordos Ativos Computados:', activeDebts);
  console.log('[DEBUG SCORE] Resumo do Cálculo:', {
    baseline: SCORE_BASELINE,
    totalAcordosRecebidos: debts.length,
    deltaContasOriginal: accountsDelta,
    deltaContasClamped: clampedAccountsDelta,
    deltaAcordos: agreementsDelta,
    bonusMensal: monthlyBonus,
    scoreBruto: rawScore,
    scoreFinalLimitado: score
  });
  console.log('=== [DEBUG SCORE] FIM DO RECALCULO ===');

  return {
    score,
    accountsDelta: clampedAccountsDelta,
    agreementsDelta,
    monthlyBonus,
  };
}
