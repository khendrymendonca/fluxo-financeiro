-- Corrige a regra estrutural de saldo para toda transicao de transacao.
-- Esta migration substitui a funcao update_account_balance() definida nas migrations
-- 0004/0011 por uma versao que recalcula a conta antiga (OLD.account_id) e a conta
-- nova (NEW.account_id) em INSERT/UPDATE/DELETE.
--
-- Regra de saldo:
-- - soma apenas transacoes pagas/recebidas (is_paid = true)
-- - ignora soft delete (deleted_at IS NULL)
-- - ignora transferencias comuns (is_transfer = true)
-- - preserva pagamento de fatura, que no historico tambem foi marcado como is_transfer
--
-- Plano minimo de reversao:
-- - restaurar a definicao anterior da funcao update_account_balance()
-- - recriar o trigger trigger_update_balance apontando para a funcao restaurada
-- - executar novamente um recálculo completo de accounts.balance a partir de transactions

CREATE OR REPLACE FUNCTION recalculate_account_balance(target_account_id UUID)
RETURNS VOID AS $$
BEGIN
  IF target_account_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE accounts
  SET balance = COALESCE((
    SELECT SUM(
      CASE
        WHEN type = 'income' THEN amount
        ELSE -amount
      END
    )
    FROM transactions
    WHERE account_id = target_account_id
      AND is_paid = TRUE
      AND deleted_at IS NULL
      AND (
        COALESCE(is_transfer, FALSE) = FALSE
        OR COALESCE(is_invoice_payment, FALSE) = TRUE
      )
  ), 0)
  WHERE id = target_account_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM recalculate_account_balance(OLD.account_id);
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM recalculate_account_balance(NEW.account_id);
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_balance ON transactions;

CREATE TRIGGER trigger_update_balance
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_account_balance();

UPDATE accounts a
SET balance = COALESCE((
  SELECT SUM(
    CASE
      WHEN t.type = 'income' THEN t.amount
      ELSE -t.amount
    END
  )
  FROM transactions t
  WHERE t.account_id = a.id
    AND t.is_paid = TRUE
    AND t.deleted_at IS NULL
    AND (
      COALESCE(t.is_transfer, FALSE) = FALSE
      OR COALESCE(t.is_invoice_payment, FALSE) = TRUE
    )
), 0)
WHERE a.deleted_at IS NULL;
