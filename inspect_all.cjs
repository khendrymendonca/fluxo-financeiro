
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
    .gte('date', '2026-01-20')
    .lte('date', '2026-03-31')
    .order('date', { ascending: true });

  if (error) {
    console.error('Erro ao buscar transações:', error);
    return;
  }

  console.log('--- Listando Todas as Transações Recentes ---');
  transactions.forEach(t => {
    const signal = t.type === 'income' ? '-' : '';
    console.log(`${t.date} | ${t.description} | ${signal}${t.amount} | InvRef: ${t.invoice_month_year} | ID: ${t.id}`);
  });
}

inspect();
