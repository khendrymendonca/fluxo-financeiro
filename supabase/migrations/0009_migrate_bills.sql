-- Script de migração: Unificação de Bills (Contas Fixas) em Transactions
-- Objetivo: Migrar todas as contas fixas para a tabela de transações e remover a tabela bills.

BEGIN;

-- 1. Migração dos dados de bills para transactions
-- Mapeamento:
-- name -> description
-- amount -> amount
-- due_date -> date
-- category_id -> category_id
-- is_recurring = true
-- transaction_type = 'recurring'
-- user_id -> user_id
-- deleted_at -> deleted_at (se existir em bills)

INSERT INTO transactions (
  description,
  amount,
  date,
  category_id,
  subcategory_id,
  user_id,
  account_id,
  card_id,
  type,
  is_paid,
  payment_date,
  is_recurring,
  transaction_type,
  deleted_at,
  created_at,
  updated_at
)
SELECT 
  name as description,
  amount,
  COALESCE(due_date, NOW()) as date,
  category_id,
  subcategory_id,
  user_id,
  account_id,
  card_id,
  CASE WHEN type = 'receivable' THEN 'income' ELSE 'expense' END as type,
  CASE WHEN status = 'paid' THEN true ELSE false END as is_paid,
  payment_date,
  true as is_recurring,
  'recurring' as transaction_type,
  deleted_at,
  created_at,
  updated_at
FROM bills;

-- 2. Eliminar a tabela antiga
DROP TABLE IF EXISTS bills CASCADE;

COMMIT;
