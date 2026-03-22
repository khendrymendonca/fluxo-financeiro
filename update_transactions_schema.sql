-- Adiciona a coluna de automação na tabela de transações
-- Execute este script no SQL Editor do seu Supabase para ativar a Renda Fixa automática.

ALTER TABLE IF EXISTS transactions 
ADD COLUMN IF NOT EXISTS is_automatic BOOLEAN DEFAULT false;

-- Garante que registros antigos não fiquem nulos
UPDATE transactions SET is_automatic = false WHERE is_automatic IS NULL;
