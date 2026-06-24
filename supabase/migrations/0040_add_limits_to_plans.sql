-- ============================================================
-- FASE 8 — Limites Quantitativos de Planos
-- ============================================================

-- Adiciona campos de limites quantitativos na tabela de planos
ALTER TABLE plans ADD COLUMN IF NOT EXISTS accounts_limit INTEGER DEFAULT -1;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS cards_limit INTEGER DEFAULT -1;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS debts_limit INTEGER DEFAULT -1;

-- Atualizar planos existentes para que tenham limite ilimitado (-1) por padrão
UPDATE plans SET accounts_limit = -1 WHERE accounts_limit IS NULL;
UPDATE plans SET cards_limit = -1 WHERE cards_limit IS NULL;
UPDATE plans SET debts_limit = -1 WHERE debts_limit IS NULL;
