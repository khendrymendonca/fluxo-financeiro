
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf-8');
const url = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1];
const key = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1];

const supabase = createClient(url, key);

async function check() {
  const { count, error } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Erro:', error);
    return;
  }

  console.log('Total de transações no banco:', count);
}

check();
