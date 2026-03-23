const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf-8');
const url = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(url, key);

async function inspect() {
    // Verifica quantas transações existem (sem filtro extra)
    const { data: all, error: e1 } = await supabase
        .from('transactions')
        .select('id, description, date, payment_date, is_paid, is_recurring, is_automatic, installment_group_id, installment_number')
        .order('date', { ascending: true })
        .limit(100);

    if (e1) { console.error('Erro transactions:', e1.message); return; }
    console.log(`Total transações acessíveis: ${all.length}`);

    const recurring = all.filter(t => t.is_recurring);
    console.log(`Recorrentes: ${recurring.length}`);

    if (recurring.length > 0) {
        console.log('\n=== RECORRENTES ===');
        recurring.forEach(t => {
            const payDate = t.payment_date ? t.payment_date.split('T')[0] : 'null';
            const txDate = t.date.split('T')[0];
            const mismatch = t.is_paid && payDate !== txDate ? ' ⚠️ MISMATCH' : '';
            console.log(`[${t.installment_number || '?'}] ${txDate} | pay=${payDate} | paid=${t.is_paid} | "${t.description}"${mismatch}`);
        });
    }

    // Agora verifica bills
    const { data: bills, error: e2 } = await supabase
        .from('bills')
        .select('id, name, due_date, status, is_fixed')
        .limit(50);

    if (e2) { console.error('Erro bills:', e2.message); return; }
    console.log(`\nTotal bills acessíveis: ${bills.length}`);
    if (bills.length > 0) {
        bills.forEach(b => console.log(`${b.due_date} | ${b.name} | status=${b.status} | fixed=${b.is_fixed}`));
    }
}

inspect();
