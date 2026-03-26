-- ==========================================================
-- CORREÇÃO DE INTEGRIDADE DE SALDO (SOFT DELETE)
-- ==========================================================

CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
DECLARE
  affected_account_id UUID;
BEGIN
  -- 1. Identifica qual conta foi afetada baseado na ação (INSERT, UPDATE ou DELETE)
  IF (TG_OP = 'DELETE') THEN
    affected_account_id := OLD.account_id;
  ELSE
    affected_account_id := NEW.account_id;
  END IF;

  -- 2. Recalcula e atualiza o saldo da conta principal afetada
  IF affected_account_id IS NOT NULL THEN
    UPDATE accounts
    SET balance = (
      SELECT COALESCE(SUM(
        CASE
          WHEN is_invoice_payment = TRUE THEN -amount
          WHEN type = 'income' THEN amount
          ELSE -amount
        END
      ), 0)
      FROM transactions
      WHERE account_id = affected_account_id 
        AND is_paid = TRUE
        AND deleted_at IS NULL -- ✅ FIX: Não somar transações excluídas logicamente
    )
    WHERE id = affected_account_id;
  END IF;

  -- 3. Cobre o cenário onde o usuário edita a transação e MUDA a conta
  IF (TG_OP = 'UPDATE' AND OLD.account_id IS NOT NULL AND OLD.account_id != NEW.account_id) THEN
    UPDATE accounts
    SET balance = (
      SELECT COALESCE(SUM(
        CASE
          WHEN is_invoice_payment = TRUE THEN -amount
          WHEN type = 'income' THEN amount
          ELSE -amount
        END
      ), 0)
      FROM transactions
      WHERE account_id = OLD.account_id 
        AND is_paid = TRUE
        AND deleted_at IS NULL -- ✅ FIX: Não somar transações excluídas logicamente
    )
    WHERE id = OLD.account_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
