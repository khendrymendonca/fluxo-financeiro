const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf-8');
const url = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(url, key);

async function fix() {
    const today = new Date();

    const { data: txs, error } = await supabase
        .from('transactions')
        .select('id, description, date, payment_date, is_paid, is_recurring, installment_group_id')
        .eq('is_recurring', true);

    if (error) { console.error('Erro ao buscar:', error); return; }

    console.log(`Total de transações recorrentes: ${txs.length}`);

    let fixed = 0;
    for (const t of txs) {
        const txDate = new Date(t.date + 'T12:00:00');
        const shouldBePaid = txDate <= today;
        const targetPaymentDate = t.date.split('T')[0];
        const currentPaymentDate = t.payment_date ? t.payment_date.split('T')[0] : null;

        let needsUpdate = false;
        let payload = {};

        if (shouldBePaid && currentPaymentDate !== targetPaymentDate) {
            payload = { is_paid: true, payment_date: targetPaymentDate };
            needsUpdate = true;
            console.log(`CORRIGINDO (paid/payDate): ${t.date} | ${t.description} | payDate atual: ${currentPaymentDate} → ${targetPaymentDate}`);
        } else if (!shouldBePaid && t.is_paid) {
            payload = { is_paid: false, payment_date: null };
            needsUpdate = true;
            console.log(`CORRIGINDO (futuro pago): ${t.date} | ${t.description} → marcando como pendente`);
        }

        if (needsUpdate) {
            const { error: upErr } = await supabase.from('transactions').update(payload).eq('id', t.id);
            if (upErr) console.error(`  Erro ao atualizar ${t.id}:`, upErr);
            else fixed++;
        }
    }

    console.log(`\n✅ Correção concluída. ${fixed} transações atualizadas.`);
}

fix();
