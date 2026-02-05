-- Adicionar coluna is_paid na tabela transactions
ALTER TABLE transactions 
ADD COLUMN is_paid BOOLEAN DEFAULT false;

-- Atualizar transações existentes para true (considerando que transações passadas já foram pagas)
UPDATE transactions 
SET is_paid = true 
WHERE date <= CURRENT_DATE;

-- Transações futuras ficam como false por padrão (já definido no DEFAULT)
