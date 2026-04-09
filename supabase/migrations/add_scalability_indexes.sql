-- Migration: add_scalability_indexes
-- Execute no Supabase SQL Editor antes do deploy

-- Índice para o trigger spawn_next_recurring_transaction
-- Evita full table scan ao marcar is_paid = true em recorrentes
CREATE INDEX IF NOT EXISTS idx_transactions_recurring
  ON transactions (user_id, is_recurring, deleted_at)
  WHERE is_recurring = true AND deleted_at IS NULL;

-- Índice para a query .or() do useFinanceQueries
-- Acelera a busca de parcelamentos por grupo
CREATE INDEX IF NOT EXISTS idx_transactions_installment_group
  ON transactions (installment_group_id, deleted_at)
  WHERE installment_group_id IS NOT NULL AND deleted_at IS NULL;

-- Índice para soft delete + data (usada em toda filtragem de mês)
CREATE INDEX IF NOT EXISTS idx_transactions_date_user
  ON transactions (user_id, date, deleted_at)
  WHERE deleted_at IS NULL;

-- Índice para invoice_month_year (competência de cartão)
CREATE INDEX IF NOT EXISTS idx_transactions_invoice_month
  ON transactions (card_id, invoice_month_year, deleted_at)
  WHERE card_id IS NOT NULL AND deleted_at IS NULL;