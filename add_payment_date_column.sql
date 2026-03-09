-- Adicionar coluna payment_date na tabela transactions
-- Esta coluna armazena a data efetiva de pagamento, que pode diferir da data de vencimento
-- Exemplo: parcela vence em Dezembro/2030 mas foi antecipada e paga em Março/2026

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS payment_date DATE;

-- Atualizar transações já pagas com a data de vencimento como data de pagamento
UPDATE transactions 
SET payment_date = date 
WHERE is_paid = true AND payment_date IS NULL;
