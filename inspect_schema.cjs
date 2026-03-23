
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf-8');
const url = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1];
const key = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1];

const supabase = createClient(url, key);

async function inspectSchema() {
    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching transactions:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Columns in transactions table:');
        console.log(Object.keys(data[0]).join(', '));
    } else {
        // Se não houver dados, tentar bills
        const { data: bills, error: bErr } = await supabase.from('bills').select('*').limit(1);
        if (bills && bills.length > 0) {
            console.log('Columns in bills table:');
            console.log(Object.keys(bills[0]).join(', '));
        }
    }
}

inspectSchema();
