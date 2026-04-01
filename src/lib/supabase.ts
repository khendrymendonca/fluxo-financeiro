import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('DEBUG: Supabase URL sendo usada:', supabaseUrl);

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL e Anon Key são obrigatórios. Verifique seu arquivo .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);


