-- Migração: Adicionar campo de rendimento mensal às contas
-- Execute este SQL no Supabase SQL Editor

ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS monthly_yield_rate NUMERIC DEFAULT 0;
