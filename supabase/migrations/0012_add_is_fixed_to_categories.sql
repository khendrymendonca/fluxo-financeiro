-- Adiciona a coluna is_fixed na tabela de categorias
-- Isso permite marcar categorias como "Contas Fixas" para analises de relatorios.

ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS is_fixed BOOLEAN DEFAULT false;

-- Garante que registros antigos não fiquem nulos
UPDATE categories SET is_fixed = false WHERE is_fixed IS NULL;
