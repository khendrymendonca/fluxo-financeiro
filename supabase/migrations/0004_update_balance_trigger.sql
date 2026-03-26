-- 1. Criando a Função de Recálculo (A Lógica)
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
          -- Usando exatamente a mesma lógica que você tinha no frontend
          WHEN is_invoice_payment = TRUE THEN -amount
          WHEN type = 'income' THEN amount
          ELSE -amount
        END
      ), 0)
      FROM transactions
      WHERE account_id = affected_account_id 
        AND is_paid = TRUE
    )
    WHERE id = affected_account_id;
  END IF;

  -- 3. Cobre o cenário onde o usuário edita a transação e MUDA a conta (ex: de Conta Corrente para Nubank)
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
    )
    WHERE id = OLD.account_id;
  END IF;

  RETURN NULL; -- Triggers do tipo AFTER podem retornar NULL
END;
$$ LANGUAGE plpgsql;

-- 2. Criando a Trigger (O Gatilho)
-- Remove a trigger se ela já existir
DROP TRIGGER IF EXISTS trigger_update_balance ON transactions;

-- Cria o gatilho que vai escutar qualquer mudança na tabela
CREATE TRIGGER trigger_update_balance
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_account_balance();


