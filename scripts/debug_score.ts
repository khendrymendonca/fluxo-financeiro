import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kzlhfdnhcmbctffkhmzg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6bGhmZG5oY21iY3RmZmtobXpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMTcwMzUsImV4cCI6MjA4NTg5MzAzNX0.Pr54-cLbB2TkDnEShv4SXjZCcnK_SruE1dJUPT0GnOI';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const userId = '5ab1df69-b67f-493c-b4dd-8f7b950049ac';

function dayDiff(lateDate: Date, earlyDate: Date) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((lateDate.getTime() - earlyDate.getTime()) / msPerDay);
}

function getPaymentDeltaPoints(daysLate: number) {
  if (daysLate < 0) return 10;
  if (daysLate === 0) return 5;
  if (daysLate <= 3) return -10;
  if (daysLate <= 10) return -25;
  return Math.max(-100, -50 - ((daysLate - 10) * 2));
}

function parseLocalDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

async function debug() {
  console.log('--- Buscando dados do usuário:', userId);

  // 1. Transações
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId);

  if (txError) {
    console.error('Erro transações:', txError);
    return;
  }

  // 2. Acordos
  const { data: debts, error: debtsError } = await supabase
    .from('debts')
    .select('*')
    .eq('user_id', userId);

  if (debtsError) {
    console.error('Erro acordos:', debtsError);
    return;
  }

  console.log(`Encontradas ${transactions?.length} transações e ${debts?.length} acordos.`);

  // Calcular contas delta
  let accountsDelta = 0;
  const lateAccounts: any[] = [];
  const earlyAccounts: any[] = [];

  transactions?.forEach((tx) => {
    if (tx.deleted_at || tx.type !== 'expense' || !tx.is_paid || !tx.payment_date) return;
    const dueDate = parseLocalDate(tx.date);
    const paymentDate = parseLocalDate(tx.payment_date);
    const diff = dayDiff(paymentDate, dueDate);
    const points = getPaymentDeltaPoints(diff);
    accountsDelta += points;

    if (diff > 0) {
      lateAccounts.push({ desc: tx.description, date: tx.date, pay: tx.payment_date, diff, points });
    } else {
      earlyAccounts.push({ desc: tx.description, date: tx.date, pay: tx.payment_date, diff, points });
    }
  });

  // Calcular acordos delta
  let agreementsDelta = 0;
  const activeDebtsDetails: any[] = [];

  debts?.forEach((debt) => {
    if (debt.status === 'paid') return;

    // Buscar parcelas pagas
    const installments = transactions?.filter((tx) => (
      !tx.deleted_at &&
      tx.type === 'expense' &&
      tx.debt_id === debt.id &&
      !(tx.description && tx.description.toLowerCase().includes('entrada'))
    )) || [];

    const totalInstallments = installments.length > 0
      ? installments.length
      : Math.max(0, Number(debt.total_installments) || 0);

    const paidInstallments = installments.filter((tx) => tx.is_paid).length;
    const recovered = totalInstallments > 0 ? (paidInstallments / totalInstallments) * 100 : 0;
    const delta = -100 + recovered;
    agreementsDelta += delta;

    activeDebtsDetails.push({
      name: debt.name,
      totalInstallments,
      paidInstallments,
      recovered,
      delta
    });
  });

  console.log('\n--- DETALHES DE ACORDOS ATIVOS ---');
  console.log(activeDebtsDetails);

  console.log('\n--- DETALHES DE CONTAS PAGAS EM ATRASO ---');
  console.log(lateAccounts.slice(0, 10)); // Mostrar as primeiras 10
  console.log(`Total de contas pagas em atraso: ${lateAccounts.length}`);

  console.log('\n--- RESUMO DO SCORE ---');
  console.log('Baseline:', 1000);
  console.log('Delta Contas:', accountsDelta);
  console.log('Delta Acordos:', agreementsDelta);
  console.log('Score Final Calculado:', Math.max(0, Math.min(1000, 1000 + accountsDelta + agreementsDelta)));
}

debug();
