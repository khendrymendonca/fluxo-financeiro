
-- Migration: 20260412_add_card_id_to_debts.sql
-- Adiciona suporte a parcelamento de faturas na tabela de dívidas

ALTER TABLE debts ADD COLUMN IF NOT EXISTS card_id UUID REFERENCES credit_cards(id) ON DELETE SET NULL;

-- Adiciona o tipo de dívida (acordo normal ou parcelamento de fatura)
ALTER TABLE debts ADD COLUMN IF NOT EXISTS debt_type TEXT NOT NULL DEFAULT 'agreement' 
  CHECK (debt_type IN ('agreement', 'invoice_installment'));

-- Garante que o RLS está atualizado para o card_id
COMMENT ON COLUMN debts.card_id IS 'Referência ao cartão de crédito quando a dívida for um parcelamento de fatura.';
