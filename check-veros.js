import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function checkBills() {
    const { data, error } = await supabase.from('bills').select('*').ilike('name', '%Vero%');
    console.log("Bills named Vero:", data.length);
    if (data) {
        data.forEach(d => console.log(d.id, d.name, d.due_date, d.type));
    }
}

checkBills();
