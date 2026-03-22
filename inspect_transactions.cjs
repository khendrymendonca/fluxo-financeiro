
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf-8');
const url = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1];
const key = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1];

const supabase = createClient(url, key);

async function inspect() {
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('invoice_month_year', '2026-03')
    .order('date', { ascending: true });

  if (error) {
    console.error('Erro ao buscar transações:', error);
    return;
  }

  console.log('--- Transações Encontradas na Fatura de Março ---');
  transactions.forEach(t => {
    const signal = t.type === 'income' ? '-' : '';
    console.log(`${t.date} | ${t.description} | ${signal}${t.amount} | ID: ${t.id} | Paid: ${t.is_paid}`);
  });
  
  const total = transactions.reduce((sum, t) => {
    const val = t.type === 'income' ? -t.amount : t.amount;
    return sum + val;
  }, 0);
  
  console.log('--- TOTAL CALCULADO: R$', total.toFixed(2));
}

inspect();
