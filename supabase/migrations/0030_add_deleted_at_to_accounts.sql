-- Migration: Adiciona soft delete support na tabela accounts
-- Data: 2026-04-21
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_accounts_deleted_at
  ON accounts (deleted_at) WHERE deleted_at IS NULL;
