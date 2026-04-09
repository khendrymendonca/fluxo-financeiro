import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL e Anon Key são obrigatórios. Verifique seu arquivo .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * SEGURANÇA: Nunca logar o objeto de erro bruto do Supabase em produção.
 * Ele contém URL do banco, query SQL e dados do payload.
 * Este helper extrai apenas o que é seguro exibir.
 */
export function logSafeError(context: string, err: unknown): void {
  if (import.meta.env.DEV) {
    // Em desenvolvimento, log completo para depuração
    console.error(`[${context}]`, err);
    return;
  }
  // Em produção: apenas mensagem sem dados internos
  const message = err instanceof Error ? err.message : 'Erro desconhecido';
  console.error(`[${context}] ${message}`);
}


