-- Migration 0021: Adiciona coluna is_transfer para evitar inflação de totais no dashboard
-- Data: 16/04/2026

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS is_transfer BOOLEAN DEFAULT false;

-- Atualização retroativa baseada no padrão de descrição do sistema
UPDATE transactions
SET is_transfer = true
WHERE (description LIKE '[Saída]%' OR description LIKE '[Entrada]%')
  AND is_transfer = false;

-- Garante que pagamentos de fatura também não inflem os totais
UPDATE transactions
SET is_transfer = true
WHERE is_invoice_payment = true
  AND is_transfer = false;
