import { useMemo } from 'react';
import { useFinanceStore } from './useFinanceStore';
import { useEmergencyFund } from './useEmergencyFund';
import { Debt, Transaction } from '@/types/finance';
import { addMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * 1. Calcula a projeção individual de uma dívida.
 * Usa a Tabela Price para amortização se houver juros (interestRateMonthly > 0).
 * Fórmula do Prazo (n): n = -log(1 - (PV * i) / PMT) / log(1 + i)
 */
export function calcularProjecaoDivida(debt: Partial<Debt>, extraMonthly = 0) {
  const PV = Number(debt.remainingAmount) || 0;
  const i = Number(debt.interestRateMonthly) || 0;
  const PMT = (Number(debt.installmentAmount) || Number(debt.minimumPayment) || 0) + extraMonthly;

  if (PV <= 0 || PMT <= 0) {
    return { mesesRestantes: 0, dataQuitacao: new Date(), totalJuros: 0, cronograma: [] };
  }

  let mesesRestantes = 0;
  let totalJuros = 0;
  const cronograma = [];
  let saldoDevedor = PV;
  const dataReferencia = new Date();

  // Cálculo matemático do prazo de quitação (Amortização Price)
  if (i > 0) {
    const logBase = 1 + i;
    const logVal = 1 - (PV * i) / PMT;
    
    if (logVal > 0) {
      mesesRestantes = Math.ceil(-Math.log(logVal) / Math.log(logBase));
    } else {
      // Se PMT <= PV * i, a dívida nunca será paga apenas com esse valor (os juros superam a parcela)
      mesesRestantes = 360; 
    }
  } else {
    // Sem juros: Prazo = Saldo Devedor / Parcela
    mesesRestantes = Math.ceil(PV / PMT);
  }

  // Simulação mês a mês para gerar o cronograma de saldo decrescente
  for (let t = 1; t <= 360; t++) {
    const jurosDoMes = saldoDevedor * i;
    totalJuros += jurosDoMes;
    
    // Atualização do saldo: saldo(t+1) = saldo(t) * (1 + i) - PMT
    // Saldo atual + juros incidindo no período - valor pago (parcela)
    saldoDevedor = saldoDevedor + jurosDoMes - PMT;

    cronograma.push({
      mes: t,
      saldoDevedor: Math.max(0, saldoDevedor),
      dataLabel: format(addMonths(dataReferencia, t), 'MMM/yy', { locale: ptBR })
    });

    if (saldoDevedor <= 0) break;
  }

  return {
    mesesRestantes: cronograma.length,
    dataQuitacao: addMonths(dataReferencia, cronograma.length),
    totalJuros,
    cronograma
  };
}

/**
 * 2. Calcula e compara estratégias de quitação de dívidas.
 * Bola de Neve (Snowball): Foco em liquidar o menor saldo primeiro (motivação psicológica).
 * Avalanche: Foco em liquidar a dívida com maior taxa de juros primeiro (economia financeira).
 */
export function calcularEstrategias(debts: Debt[]) {
  // Ordenação Bola de Neve: Saldo devedor crescente
  const ordemBolaDNeve = [...debts].sort((a, b) => a.remainingAmount - b.remainingAmount);
  // Ordenação Avalanche: Taxa de juros mensal decrescente
  const ordemAvalanche = [...debts].sort((a, b) => b.interestRateMonthly - a.interestRateMonthly);

  const calcularPrazoETotal = (ordem: Debt[]) => {
    let mesesTotais = 0;
    let jurosTotais = 0;
    let parcelaExtraAcumulada = 0;

    ordem.forEach(d => {
      const proj = calcularProjecaoDivida(d, parcelaExtraAcumulada);
      // Sequencial: a próxima dívida começa quando a anterior termina, herdando sua parcela
      mesesTotais += proj.mesesRestantes;
      jurosTotais += proj.totalJuros;
      parcelaExtraAcumulada += (Number(d.installmentAmount) || Number(d.minimumPayment) || 0);
    });

    return { mesesTotais, jurosTotais };
  };

  const bolaDNeve = calcularPrazoETotal(ordemBolaDNeve);
  const avalanche = calcularPrazoETotal(ordemAvalanche);

  // Heurística de Recomendação: se Avalanche economiza mais de 15% em juros, ela vence.
  // Caso contrário, Bola de Neve é preferível pelo impacto positivo na autoeficácia.
  const recomendacao = (avalanche.jurosTotais < bolaDNeve.jurosTotais * 0.85) ? 'avalanche' : 'bolaDNeve';
  const motivacao = recomendacao === 'avalanche' 
    ? "A estratégia Avalanche é recomendada para economizar o máximo possível em juros reais."
    : "A estratégia Bola de Neve é recomendada para ganhar tração emocional eliminando contas rápido.";

  return {
    bolaDNeve: { ordem: ordemBolaDNeve, prazoMeses: bolaDNeve.mesesTotais, totalJuros: bolaDNeve.jurosTotais },
    avalanche: { ordem: ordemAvalanche, prazoMeses: avalanche.mesesTotais, totalJuros: avalanche.jurosTotais },
    recomendacao,
    motivacao
  };
}

/**
 * 3. Calcula o impacto real de um corte de gastos (ou aporte extra) na dívida prioritária.
 */
export function calcularImpactoCorte(valorMensal: number, debts: Debt[]) {
  if (debts.length === 0) return { mesesEconomizados: 0, jurosEconomizados: 0 };

  // Baseline usando a estratégia mais eficiente (Avalanche)
  const baseline = calcularEstrategias(debts).avalanche;
  
  let mesesComCorte = 0;
  let jurosComCorte = 0;
  let extraAcumulado = valorMensal;

  const debtsOrdenados = [...debts].sort((a, b) => b.interestRateMonthly - a.interestRateMonthly);

  debtsOrdenados.forEach(d => {
    const proj = calcularProjecaoDivida(d, extraAcumulado);
    mesesComCorte += proj.mesesRestantes;
    jurosComCorte += proj.totalJuros;
    extraAcumulado += (Number(d.installmentAmount) || Number(d.minimumPayment) || 0);
  });

  return {
    mesesEconomizados: Math.max(0, baseline.prazoMeses - mesesComCorte),
    jurosEconomizados: Math.max(0, baseline.totalJuros - jurosComCorte)
  };
}

/**
 * 4. Diagnóstico de Comprometimento de Renda.
 * Índice = (Custos Fixos + Parcelas de Dívida) / Renda Total.
 */
export function calcularDiagnostico(totalIncome: number, totalFixedExpenses: number, totalDebtInstallments: number) {
  const sobraReal = totalIncome - totalFixedExpenses - totalDebtInstallments;
  const comprometimento = totalIncome > 0 ? ((totalFixedExpenses + totalDebtInstallments) / totalIncome) * 100 : 0;
  
  let status: 'verde' | 'amarelo' | 'vermelho' = 'verde';
  if (comprometimento > 70) status = 'vermelho';
  else if (comprometimento > 50) status = 'amarelo';

  return {
    sobraReal,
    indiceComprometimento: Math.min(100, comprometimento),
    status
  };
}

/**
 * 5. Hook principal: useDebtProjection
 * Centraliza toda a inteligência de projeção e análise de dívidas do usuário.
 */
export function useDebtProjection() {
  const { transactions, debts, totalIncome, creditCards, currentMonthTransactions, getCardUsedLimit } = useFinanceStore();
  const { monthlyFixed } = useEmergencyFund(currentMonthTransactions);

  return useMemo(() => {
    // Filtragem de dívidas ativas
    const activeDebts = debts.filter(d => d.status === 'active' && d.remainingAmount > 0);

    // Soma de despesas fixas recorrentes (Transactions)
    const recurringExpenses = transactions
      .filter(t => t.isRecurring && t.type === 'expense' && !t.deleted_at)
      .reduce((s, t) => s + Number(t.amount), 0);

    // Soma das faturas atuais (Credit Cards) - compromisso de caixa imediato
    const cardsTotal = creditCards.reduce((s, c) => s + getCardUsedLimit(c.id), 0);
    
    // Despesa fixa total = Recorrentes + Cartões
    const totalFixedExpenses = recurringExpenses + cardsTotal;

    // Soma das parcelas mensais de todas as dívidas ativas
    const totalDebtInstallments = activeDebts.reduce((s, d) => 
      s + (Number(d.installmentAmount) || Number(d.minimumPayment) || 0), 0
    );

    // Diagnóstico de saúde financeira
    const diagnostico = calcularDiagnostico(totalIncome, totalFixedExpenses, totalDebtInstallments);
    
    // Projeções individuais
    const projecoes = activeDebts.map(d => ({
      debtId: d.id,
      ...calcularProjecaoDivida(d)
    }));

    // Estratégias comparativas
    const estrategias = calcularEstrategias(activeDebts);

    // Ranking de despesas recorrentes pelo impacto que o seu corte causaria na dívida prioritária
    const despesasFixasRanqueadas = transactions
      .filter(t => t.isRecurring && t.type === 'expense' && !t.deleted_at && !t.isTransfer)
      .map(t => {
        const impacto = calcularImpactoCorte(Number(t.amount), activeDebts);
        return {
          ...t,
          impacto,
          impactoFinanceiroTotal: impacto.jurosEconomizados
        };
      })
      .sort((a, b) => b.impactoFinanceiroTotal - a.impactoFinanceiroTotal)
      .map((t, idx) => ({
        ...t,
        isTopImpact: idx === 0
      }));

    // Geração de recomendação de ação imediata
    const topDespesa = despesasFixasRanqueadas[0];
    const topDivida = estrategias.avalanche.ordem[0];
    
    let acaoImediata = "Seu plano de quitação está em andamento.";
    if (activeDebts.length > 0) {
      acaoImediata = `Foque em quitar ${topDivida.name} primeiro. `;
      if (topDespesa && topDespesa.impacto.jurosEconomizados > 0) {
        acaoImediata += `Eliminar "${topDespesa.description}" economizaria ${topDespesa.impacto.jurosEconomizados.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} em juros futuros.`;
      }
    }

    return {
      activeDebts,
      totalFixedExpenses,
      totalDebtInstallments,
      diagnostico,
      projecoes,
      estrategias,
      despesasFixasRanqueadas,
      acaoImediata
    };
  }, [transactions, debts, totalIncome, creditCards, getCardUsedLimit, monthlyFixed]);
}
