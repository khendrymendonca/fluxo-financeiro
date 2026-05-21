-- Corrige a regressao introduzida na 0033: transferencias devem entrar no saldo
-- real das contas/carteiras, embora continuem fora das metricas analiticas.
--
-- Esta migration mantem a estrategia de reconciliar OLD.account_id e NEW.account_id
-- em INSERT/UPDATE/DELETE, mas remove o filtro por is_transfer da recomposicao de
-- accounts.balance.
--
-- Regra de saldo real:
-- - soma apenas transacoes pagas/recebidas (is_paid = true)
-- - ignora soft delete (deleted_at IS NULL)
-- - considera qualquer transacao vinculada a account_id
-- - income soma positivo
-- - qualquer saida/pagamento soma negativo
--
-- Isso cobre:
-- - despesas pagas
-- - receitas recebidas
-- - pagamentos de fatura
-- - transferencias entre contas
-- - troca de conta de pagamento
-- - estorno
-- - soft delete
-- - mudanca de valor

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
), 0)
WHERE a.deleted_at IS NULL;
