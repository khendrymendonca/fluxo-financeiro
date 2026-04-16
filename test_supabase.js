
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL ou Key não encontradas no .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTransactions() {
  const { data, error } = await supabase
    .from('transactions')
    .select('id, description, amount, date, is_paid, original_id, transaction_type')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Erro ao buscar transações:', error);
    return;
  }

  console.log('--- ÚLTIMOS 5 LANÇAMENTOS NO SUPABASE ---');
  console.table(data);
}

listTransactions();
