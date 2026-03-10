import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kzlhfdnhcmbctffkhmzg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6bGhmZG5oY21iY3RmZmtobXpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMTcwMzUsImV4cCI6MjA4NTg5MzAzNX0.Pr54-cLbB2TkDnEShv4SXjZCcnK_SruE1dJUPT0GnOI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function recalc() {
    console.log('Fetching accounts...');
    const { data: accounts, error: accError } = await supabase.from('accounts').select('id, name, balance');
    if (accError) {
        console.error('Error fetching accounts:', accError.message);
        return;
    }
    console.log(`Found ${accounts ? accounts.length : 0} accounts.`);

    console.log('Fetching transactions...');
    const { data: transactions, error: txError } = await supabase.from('transactions').select('account_id, card_id, type, amount, description, is_paid');
    if (txError) {
        console.error('Error fetching transactions:', txError.message);
        return;
    }
    console.log(`Found ${transactions ? transactions.length : 0} transactions.`);

    console.log('--- RECALCULATION START ---');
    for (const account of accounts) {
        let newBalance = 0;
        const paidTxs = transactions.filter(t => t.account_id === account.id && t.is_paid && !t.card_id);

        console.log(`Account: ${account.name} (ID: ${account.id})`);
        console.log(`  Initial Balance in DB: ${account.balance}`);
        console.log(`  Count of Paid Txs for this account: ${paidTxs.length}`);

        for (const tx of paidTxs) {
            const amt = Number(tx.amount);
            if (tx.type === 'income') {
                newBalance += amt;
                console.log(`    + RECB: ${tx.description} = ${amt}`);
            } else {
                newBalance -= amt;
                console.log(`    - PAGO: ${tx.description} = ${amt}`);
            }
        }

        newBalance = Math.round(newBalance * 100) / 100;

        console.log(`  New Calculated Balance: ${newBalance}`);
        console.log(`  Difference: ${newBalance - account.balance}`);

        const { error: updateError } = await supabase.from('accounts').update({ balance: newBalance }).eq('id', account.id);
        if (updateError) {
            console.error(`  Error updating account ${account.name}:`, updateError.message);
        } else {
            console.log(`  Updated successfully.`);
        }
        console.log('---');
    }
}

recalc().catch(err => console.error('Unhandled Rejection:', err));
