import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf-8');
const VITE_SUPABASE_URL = env.split('\n').find(l => l.startsWith('VITE_SUPABASE_URL')).split('=')[1].trim();
const VITE_SUPABASE_ANON_KEY = env.split('\n').find(l => l.startsWith('VITE_SUPABASE_ANON_KEY')).split('=')[1].trim();

const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);

async function checkBills() {
    const { data, error } = await supabase.from('bills').select('*');
    if (error) {
        console.error("DB Error:", error);
        return;
    }

    const vero = data.filter(b => b.name.toLowerCase().includes('vero'));
    console.log("\n=== VERO BILLS ===");
    vero.forEach(v => console.log(`- ID: ${v.id} | Name: ${v.name} | Due: ${v.due_date} | isFixed: ${v.is_fixed} | Payment Date: ${v.payment_date}`));

    const dia20 = data.filter(b => b.name.toLowerCase().includes('dia 20'));
    console.log("\n=== DIA 20 BILLS ===");
    dia20.forEach(v => console.log(`- ID: ${v.id} | Name: ${v.name} | Due: ${v.due_date} | isFixed: ${v.is_fixed} | Payment Date: ${v.payment_date}`));

    console.log("\nTotal Bills:", data.length);
}

checkBills();
