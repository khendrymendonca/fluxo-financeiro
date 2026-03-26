-- Adicionar coluna is_paid na tabela transactions
ALTER TABLE transactions 
ADD COLUMN is_paid BOOLEAN DEFAULT false;

-- Atualizar transaÃ§Ãµes existentes para true (considerando que transaÃ§Ãµes passadas jÃ¡ foram pagas)
UPDATE transactions 
SET is_paid = true 
WHERE date <= CURRENT_DATE;

-- TransaÃ§Ãµes futuras ficam como false por padrÃ£o (jÃ¡ definido no DEFAULT)


