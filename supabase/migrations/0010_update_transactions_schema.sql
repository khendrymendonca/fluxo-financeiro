-- Adiciona a coluna de automaÃ§Ã£o na tabela de transaÃ§Ãµes
-- Execute este script no SQL Editor do seu Supabase para ativar a Renda Fixa automÃ¡tica.

ALTER TABLE IF EXISTS transactions 
ADD COLUMN IF NOT EXISTS is_automatic BOOLEAN DEFAULT false;

-- Garante que registros antigos nÃ£o fiquem nulos
UPDATE transactions SET is_automatic = false WHERE is_automatic IS NULL;


