-- ============================================================
-- Transferencias: vinculo real entre as duas pontas
-- ============================================================

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS transfer_group_id UUID;

CREATE INDEX IF NOT EXISTS idx_transactions_transfer_group_id
  ON public.transactions (transfer_group_id)
  WHERE transfer_group_id IS NOT NULL AND deleted_at IS NULL;
