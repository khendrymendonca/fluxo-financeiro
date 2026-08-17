-- ============================================================
-- MIGRAÇÃO 0044 — Correção de falhas críticas de segurança
-- Data: 2026-08-17
-- Achados via auditoria (advisors do Supabase + revisão manual)
-- ============================================================

-- ------------------------------------------------------------
-- 1. CRÍTICO: bypass de autenticação nas RPCs super_admin_*
-- Causa raiz: "IF auth.uid() <> '<uuid>' THEN RAISE EXCEPTION"
-- Quando o chamador é anônimo, auth.uid() é NULL, e em PL/pgSQL
-- "NULL <> valor" avalia para NULL, que o IF trata como FALSE.
-- Ou seja: a exceção NUNCA disparava para chamadas anônimas,
-- e a role "anon" tinha EXECUTE nessas 4 funções — permitindo
-- criar, listar, editar e apagar QUALQUER usuário sem login.
-- Correção: adicionar "auth.uid() IS NULL OR" (mesmo padrão já
-- usado corretamente em delete_user_data) + revogar EXECUTE de
-- PUBLIC/anon, mantendo apenas "authenticated".
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.super_admin_create_user(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> '5ab1df69-b67f-493c-b4dd-8f7b950049ac' THEN
    RAISE EXCEPTION 'Acesso negado: apenas o Super Admin pode executar esta ação.';
  END IF;

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', p_full_name),
    now(),
    now(),
    '', '', '', ''
  )
  RETURNING id INTO v_user_id;

  RETURN v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.super_admin_delete_user(
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> '5ab1df69-b67f-493c-b4dd-8f7b950049ac' THEN
    RAISE EXCEPTION 'Acesso negado: apenas o Super Admin pode executar esta ação.';
  END IF;

  IF p_user_id = '5ab1df69-b67f-493c-b4dd-8f7b950049ac' THEN
    RAISE EXCEPTION 'Ação inválida: você não pode apagar o seu próprio usuário.';
  END IF;

  DELETE FROM auth.users WHERE id = p_user_id;
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.super_admin_update_user(
  p_user_id UUID,
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> '5ab1df69-b67f-493c-b4dd-8f7b950049ac' THEN
    RAISE EXCEPTION 'Acesso negado: apenas o Super Admin pode executar esta ação.';
  END IF;

  IF p_password IS NOT NULL AND p_password <> '' THEN
    UPDATE auth.users
    SET email = p_email,
        encrypted_password = crypt(p_password, gen_salt('bf')),
        raw_user_meta_data = raw_user_meta_data || jsonb_build_object('full_name', p_full_name),
        updated_at = now()
    WHERE id = p_user_id;
  ELSE
    UPDATE auth.users
    SET email = p_email,
        raw_user_meta_data = raw_user_meta_data || jsonb_build_object('full_name', p_full_name),
        updated_at = now()
    WHERE id = p_user_id;
  END IF;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.super_admin_list_users()
RETURNS TABLE (
  id UUID,
  email VARCHAR,
  full_name TEXT,
  user_code TEXT,
  plan_id UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> '5ab1df69-b67f-493c-b4dd-8f7b950049ac' THEN
    RAISE EXCEPTION 'Acesso negado: apenas o Super Admin pode executar esta ação.';
  END IF;

  RETURN QUERY
  SELECT u.id, u.email::VARCHAR,
         COALESCE(u.raw_user_meta_data->>'full_name', '')::TEXT,
         p.user_code, p.plan_id, p.created_at
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  ORDER BY p.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.super_admin_create_user(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.super_admin_delete_user(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.super_admin_update_user(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.super_admin_list_users() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.super_admin_create_user(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_delete_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_update_user(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_list_users() TO authenticated;

-- ------------------------------------------------------------
-- 2. CRÍTICO: vazamento de dados financeiros de TODOS os
-- usuários via views SECURITY DEFINER sem escopo por usuário.
-- Como são "SECURITY DEFINER", elas ignoravam o RLS de
-- "transactions"/"categories" e a role "anon" tinha SELECT
-- concedido — qualquer pessoa não-autenticada podia ler o
-- fluxo de caixa e os gastos por categoria de todos os
-- usuários via REST (/rest/v1/view_monthly_cashflow).
-- Correção: trocar para SECURITY INVOKER (Postgres 15+), que
-- passa a respeitar o RLS de quem está consultando — cada
-- usuário continua vendo só o próprio resumo.
-- ------------------------------------------------------------
ALTER VIEW public.view_monthly_cashflow SET (security_invoker = true);
ALTER VIEW public.view_category_expenses SET (security_invoker = true);

-- ------------------------------------------------------------
-- 3. CRÍTICO: tabela category_groups sem RLS habilitado —
-- CRUD totalmente aberto para a role "anon" (sem login).
-- É uma tabela de referência compartilhada (não tem user_id);
-- o app só faz leitura dela no client. Habilitar RLS com
-- select liberado e sem policy de escrita bloqueia
-- inserts/updates/deletes anônimos, sem quebrar a leitura.
-- ------------------------------------------------------------
ALTER TABLE public.category_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "category_groups_select_authenticated"
  ON public.category_groups FOR SELECT
  TO authenticated
  USING (true);

-- ------------------------------------------------------------
-- 4. ALTO: start_invites permitia SELECT público (role "public",
-- sem checar auth.uid()) de TODOS os códigos de convite Start
-- de TODOS os pais — enumeração completa sem autenticação.
-- Nenhum hook do app usa essa leitura pública (a validação do
-- código acontece na Edge Function "create-start-user", que
-- roda com service role e não depende dessa policy). Removendo.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Leitura pública para validação" ON public.start_invites;

-- ------------------------------------------------------------
-- 5. Hardening (WARN): search_path mutável em funções —
-- reduz risco de search_path hijacking. Não altera o
-- comportamento das funções.
-- ------------------------------------------------------------
ALTER FUNCTION public.generate_user_code() SET search_path = public;
ALTER FUNCTION public.spawn_next_recurring_transaction() SET search_path = public;
ALTER FUNCTION public.is_child_of(uuid) SET search_path = public;
ALTER FUNCTION public.can_parent_view(uuid, timestamptz) SET search_path = public;
ALTER FUNCTION public.recalculate_account_balance(uuid) SET search_path = public;
ALTER FUNCTION public.update_account_balance() SET search_path = public;
ALTER FUNCTION public.update_push_subscriptions_updated_at() SET search_path = public;

NOTIFY pgrst, 'reload schema';
