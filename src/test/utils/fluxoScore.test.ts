import { describe, expect, it } from 'vitest';
import { calculateFluxoScore } from '@/utils/fluxoScore';
import { Debt, Transaction } from '@/types/finance';

function buildExpenseTx(partial: Partial<Transaction>): Transaction {
  return {
    id: partial.id ?? 'tx-1',
    userId: 'u-1',
    type: 'expense',
    transactionType: 'punctual',
    description: 'Conta',
    amount: 100,
    date: '2026-05-10',
    isPaid: true,
    paymentDate: '2026-05-10',
    ...partial,
  };
}

function buildDebt(partial: Partial<Debt>): Debt {
  return {
    id: partial.id ?? 'd-1',
    userId: 'u-1',
    name: 'Acordo',
    totalAmount: 1000,
    remainingAmount: 1000,
    installmentAmount: 100,
    interestRateMonthly: 0,
    startDate: '2026-05-01',
    ...partial,
  };
}

describe('calculateFluxoScore', () => {
  it('aplica regras de pontualidade e atraso com baseline neutro', () => {
    const score = calculateFluxoScore([
      buildExpenseTx({ id: 'early', date: '2026-05-10', paymentDate: '2026-05-08' }),
      buildExpenseTx({ id: 'ontime', date: '2026-05-11', paymentDate: '2026-05-11' }),
      buildExpenseTx({ id: 'late', date: '2026-05-01', paymentDate: '2026-05-14' }),
    ], [], new Date('2026-05-20'));

    // Baseline 1000 - 56 (deltas) + 0 (bônus em maio) = 944.
    expect(Math.round(score.score)).toBe(944);
  });

  it('aplica penalidade de acordo ativo e recuperação proporcional por parcelas pagas', () => {
    const debt = buildDebt({ id: 'd-1', totalInstallments: 4, status: 'active' });
    const transactions = [
      buildExpenseTx({ id: 'i-1', debtId: 'd-1', installmentNumber: 1, installmentTotal: 4, isPaid: true }),
      buildExpenseTx({ id: 'i-2', debtId: 'd-1', installmentNumber: 2, installmentTotal: 4, isPaid: true }),
      buildExpenseTx({ id: 'i-3', debtId: 'd-1', installmentNumber: 3, installmentTotal: 4, isPaid: false, paymentDate: undefined }),
      buildExpenseTx({ id: 'i-4', debtId: 'd-1', installmentNumber: 4, installmentTotal: 4, isPaid: false, paymentDate: undefined }),
    ];

    const score = calculateFluxoScore(transactions, [debt], new Date('2026-05-20'));
    // acordo: -100 + 50 recuperado
    expect(Math.round(score.agreementsDelta)).toBe(-50);
  });

  it('respeita teto inferior e superior do score', () => {
    const veryLate = buildExpenseTx({ id: 'late-max', date: '2026-01-01', paymentDate: '2026-06-01' });
    const low = calculateFluxoScore(Array.from({ length: 30 }).map((_, i) => ({ ...veryLate, id: `l-${i}` })), [], new Date('2026-06-15'));
    expect(Math.round(low.score)).toBe(0);

    const early = buildExpenseTx({ id: 'e', date: '2026-05-10', paymentDate: '2026-05-01' });
    const high = calculateFluxoScore(Array.from({ length: 80 }).map((_, i) => ({ ...early, id: `e-${i}` })), [], new Date('2026-05-20'));
    expect(Math.round(high.score)).toBe(1000);
  });

  describe('regra de bonificação mensal no primeiro dia útil', () => {
    it('concede bonificação de +10 se não houver atrasos no primeiro dia útil do mês (dia 1º é dia útil)', () => {
      // 1º de junho de 2026 é segunda-feira (primeiro dia útil é 1º de junho)
      // Nenhuma conta vencida antes de 1º de junho
      const score = calculateFluxoScore([
        buildExpenseTx({ id: 'tx-1', date: '2026-06-10', isPaid: false, paymentDate: undefined })
      ], [], new Date('2026-06-15'));

      expect(score.monthlyBonus).toBe(10);
    });

    it('concede bonificação se o atraso ocorreu em conta vencida depois do primeiro dia útil', () => {
      // Conta vence dia 10 de junho de 2026 (após primeiro dia útil que é dia 1)
      // Em 15 de junho ela está atrasada, mas o bônus mensal é mantido pois no dia 1 ela não estava em atraso.
      const score = calculateFluxoScore([
        buildExpenseTx({ id: 'tx-1', date: '2026-06-10', isPaid: false, paymentDate: undefined })
      ], [], new Date('2026-06-15'));

      expect(score.monthlyBonus).toBe(10);
    });

    it('não concede bonificação de +10 se houver conta vencida antes do primeiro dia útil e não paga', () => {
      // Conta vence em 28 de maio de 2026, não paga
      // Em 15 de junho de 2026, o bônus de junho deve ser 0
      const score = calculateFluxoScore([
        buildExpenseTx({ id: 'tx-1', date: '2026-05-28', isPaid: false, paymentDate: undefined })
      ], [], new Date('2026-06-15'));

      expect(score.monthlyBonus).toBe(0);
    });

    it('não concede bonificação se a conta vencida antes do primeiro dia útil foi paga depois do primeiro dia útil', () => {
      // Conta vence em 28 de maio de 2026, e foi paga em 5 de junho de 2026 (após o primeiro dia útil, 1 de junho)
      // Em 15 de junho de 2026, o bônus deve ser 0 pois no primeiro dia útil estava atrasada
      const score = calculateFluxoScore([
        buildExpenseTx({ id: 'tx-1', date: '2026-05-28', isPaid: true, paymentDate: '2026-06-05' })
      ], [], new Date('2026-06-15'));

      expect(score.monthlyBonus).toBe(0);
    });

    it('concede bonificação se a conta vencida antes do primeiro dia útil foi paga antes do primeiro dia útil', () => {
      // Conta vence em 28 de maio de 2026, e foi paga em 29 de maio de 2026 (antes de 1 de junho)
      const score = calculateFluxoScore([
        buildExpenseTx({ id: 'tx-1', date: '2026-05-28', isPaid: true, paymentDate: '2026-05-29' })
      ], [], new Date('2026-06-15'));

      expect(score.monthlyBonus).toBe(10);
    });

    it('calcula corretamente o primeiro dia útil quando o dia 1º cai no final de semana', () => {
      // 1º de agosto de 2026 é sábado. Primeiro dia útil é 3 de agosto.
      // Uma conta que vence no dia 2 de agosto e está pendente impede o bônus, pois no primeiro dia útil (dia 3) ela já tinha vencido (venceu dia 2, e em relação a 3 de agosto ela está no passado).
      const scoreWithOverdueBeforeMonday = calculateFluxoScore([
        buildExpenseTx({ id: 'tx-1', date: '2026-08-02', isPaid: false, paymentDate: undefined })
      ], [], new Date('2026-08-15'));
      expect(scoreWithOverdueBeforeMonday.monthlyBonus).toBe(0);

      // Uma conta que vence no dia 3 de agosto (segunda-feira) e está pendente NÃO impede o bônus, pois no dia 3 ela não estava em atraso (vencimento no próprio dia).
      const scoreWithDueOnMonday = calculateFluxoScore([
        buildExpenseTx({ id: 'tx-2', date: '2026-08-03', isPaid: false, paymentDate: undefined })
      ], [], new Date('2026-08-15'));
      expect(scoreWithDueOnMonday.monthlyBonus).toBe(10);
    });
  });
});
