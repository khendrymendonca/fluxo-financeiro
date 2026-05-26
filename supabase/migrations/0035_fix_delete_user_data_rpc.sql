-- Corrige a RPC de exclusao de conta/LGPD para o schema atual.
-- A migration 0016 referenciava colunas e tabelas antigas (userid, categoryid, goals),
-- o que impedia a criacao da funcao no banco real.
--
-- Esta versao:
-- - garante a assinatura publica esperada pelo frontend:
--     public.delete_user_data(target_user_id uuid)
-- - valida que o usuario autenticado so pode excluir a propria conta
-- - remove dados do usuario em tabelas reais do schema atual
-- - apaga o registro em auth.users ao final
-- - recarrega o schema cache do PostgREST
-- - usa SECURITY DEFINER porque a remocao final em auth.users exige privilegio elevado
-- - usa search_path restrito e tabelas qualificadas por schema para reduzir risco de hijack

CREATE OR REPLACE FUNCTION public.delete_user_data(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> target_user_id THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  -- Dependentes de user_habits
  DELETE FROM public.habit_logs
  WHERE habit_id IN (
    SELECT id
    FROM public.user_habits
    WHERE user_id = target_user_id
  );

  -- Dependentes de categories
  DELETE FROM public.subcategories
  WHERE category_id IN (
    SELECT id
    FROM public.categories
    WHERE user_id = target_user_id
  );

  -- Tabelas diretamente vinculadas ao usuario
  DELETE FROM public.transactions
  WHERE user_id = target_user_id;

  IF to_regclass('public.bills') IS NOT NULL THEN
    DELETE FROM public.bills
    WHERE user_id = target_user_id;
  END IF;

  DELETE FROM public.user_habits
  WHERE user_id = target_user_id;

  DELETE FROM public.budget_rules
  WHERE user_id = target_user_id;

  DELETE FROM public.savings_goals
  WHERE user_id = target_user_id;

  DELETE FROM public.debts
  WHERE user_id = target_user_id;

  DELETE FROM public.credit_cards
  WHERE user_id = target_user_id;

  DELETE FROM public.accounts
  WHERE user_id = target_user_id;

  DELETE FROM public.categories
  WHERE user_id = target_user_id;

  DELETE FROM public.user_feature_overrides
  WHERE user_id = target_user_id;

  DELETE FROM public.profiles
  WHERE id = target_user_id;

  DELETE FROM auth.users
  WHERE id = target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_data(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_data(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
