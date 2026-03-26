-- Migração: Adicionar campos de limite de conta (cheque especial)
-- Execute este SQL no Supabase SQL Editor

ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS has_overdraft BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS overdraft_limit NUMERIC DEFAULT 0;


