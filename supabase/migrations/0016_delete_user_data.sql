-- ============================================================
-- LGPD Art. 18 VI — Exclusão total de dados do usuário
-- ============================================================

CREATE OR REPLACE FUNCTION delete_user_data(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;

  DELETE FROM transactions       WHERE userid = target_user_id;
  DELETE FROM subcategories
    WHERE categoryid IN (
      SELECT id FROM categories WHERE userid = target_user_id
    );
  DELETE FROM categories         WHERE userid = target_user_id;
  DELETE FROM accounts           WHERE userid = target_user_id;
  DELETE FROM credit_cards       WHERE userid = target_user_id;
  DELETE FROM debts              WHERE userid = target_user_id;
  DELETE FROM goals              WHERE userid = target_user_id;
  DELETE FROM budget_rules       WHERE userid = target_user_id;
  DELETE FROM auth.users         WHERE id = target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION delete_user_data(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION delete_user_data(UUID) TO authenticated;
