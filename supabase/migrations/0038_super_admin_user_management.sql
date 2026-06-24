-- ============================================================
-- FASE 8 — Gerenciamento Administrativo de Usuários e Planos pelo Super Admin
-- ============================================================

-- 1. Ativar as flags de temas da Copa
INSERT INTO global_feature_flags (key, label, enabled)
VALUES ('theme_copa', 'Tema da Copa - Login (Global)', true)
ON CONFLICT (key) DO UPDATE SET enabled = true, label = 'Tema da Copa - Login (Global)';

INSERT INTO global_feature_flags (key, label, enabled)
VALUES ('theme_copa_internal', 'Tema da Copa - Área Logada (Interno)', true)
ON CONFLICT (key) DO UPDATE SET enabled = true, label = 'Tema da Copa - Área Logada (Interno)';


-- 2. Políticas RLS de Controle Total para o Super Admin
DROP POLICY IF EXISTS "profiles_super_admin_all" ON public.profiles;
CREATE POLICY "profiles_super_admin_all"
  ON public.profiles FOR ALL TO authenticated
  USING (auth.uid() = '5ab1df69-b67f-493c-b4dd-8f7b950049ac')
  WITH CHECK (auth.uid() = '5ab1df69-b67f-493c-b4dd-8f7b950049ac');

DROP POLICY IF EXISTS "ufo_super_admin_all" ON public.user_feature_overrides;
CREATE POLICY "ufo_super_admin_all"
  ON public.user_feature_overrides FOR ALL TO authenticated
  USING (auth.uid() = '5ab1df69-b67f-493c-b4dd-8f7b950049ac')
  WITH CHECK (auth.uid() = '5ab1df69-b67f-493c-b4dd-8f7b950049ac');

DROP POLICY IF EXISTS "global_flags_super_admin_all" ON public.global_feature_flags;
CREATE POLICY "global_flags_super_admin_all"
  ON public.global_feature_flags FOR ALL TO authenticated
  USING (auth.uid() = '5ab1df69-b67f-493c-b4dd-8f7b950049ac')
  WITH CHECK (auth.uid() = '5ab1df69-b67f-493c-b4dd-8f7b950049ac');

DROP POLICY IF EXISTS "plans_super_admin_all" ON public.plans;
CREATE POLICY "plans_super_admin_all"
  ON public.plans FOR ALL TO authenticated
  USING (auth.uid() = '5ab1df69-b67f-493c-b4dd-8f7b950049ac')
  WITH CHECK (auth.uid() = '5ab1df69-b67f-493c-b4dd-8f7b950049ac');

DROP POLICY IF EXISTS "plan_features_super_admin_all" ON public.plan_features;
CREATE POLICY "plan_features_super_admin_all"
  ON public.plan_features FOR ALL TO authenticated
  USING (auth.uid() = '5ab1df69-b67f-493c-b4dd-8f7b950049ac')
  WITH CHECK (auth.uid() = '5ab1df69-b67f-493c-b4dd-8f7b950049ac');


-- 3. Função RPC: Criar usuário no auth.users do Supabase
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
  -- Verificar privilégio de Super Admin
  IF auth.uid() <> '5ab1df69-b67f-493c-b4dd-8f7b950049ac' THEN
    RAISE EXCEPTION 'Acesso negado: apenas o Super Admin pode executar esta ação.';
  END IF;

  -- Inserir usuário na tabela auth.users do Supabase
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
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
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO v_user_id;

  RETURN v_user_id;
END;
$$;


-- 4. Função RPC: Excluir usuário no auth.users do Supabase
CREATE OR REPLACE FUNCTION public.super_admin_delete_user(
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Verificar privilégio de Super Admin
  IF auth.uid() <> '5ab1df69-b67f-493c-b4dd-8f7b950049ac' THEN
    RAISE EXCEPTION 'Acesso negado: apenas o Super Admin pode executar esta ação.';
  END IF;

  -- Impedir que o Super Admin apague a si mesmo
  IF p_user_id = '5ab1df69-b67f-493c-b4dd-8f7b950049ac' THEN
    RAISE EXCEPTION 'Ação inválida: você não pode apagar o seu próprio usuário.';
  END IF;

  DELETE FROM auth.users WHERE id = p_user_id;
  RETURN TRUE;
END;
$$;


-- 5. Função RPC: Atualizar e-mail, senha e nome de um usuário
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
  -- Verificar privilégio de Super Admin
  IF auth.uid() <> '5ab1df69-b67f-493c-b4dd-8f7b950049ac' THEN
    RAISE EXCEPTION 'Acesso negado: apenas o Super Admin pode executar esta ação.';
  END IF;

  -- Se nova senha foi fornecida, atualizar senha e outros campos
  IF p_password IS NOT NULL AND p_password <> '' THEN
    UPDATE auth.users
    SET 
      email = p_email,
      encrypted_password = crypt(p_password, gen_salt('bf')),
      raw_user_meta_data = raw_user_meta_data || jsonb_build_object('full_name', p_full_name),
      updated_at = now()
    WHERE id = p_user_id;
  ELSE
    -- Sem atualizar a senha
    UPDATE auth.users
    SET 
      email = p_email,
      raw_user_meta_data = raw_user_meta_data || jsonb_build_object('full_name', p_full_name),
      updated_at = now()
    WHERE id = p_user_id;
  END IF;

  RETURN TRUE;
END;
$$;


-- 6. Função RPC: Listar todos os usuários cadastrados
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
  -- Verificar privilégio de Super Admin
  IF auth.uid() <> '5ab1df69-b67f-493c-b4dd-8f7b950049ac' THEN
    RAISE EXCEPTION 'Acesso negado: apenas o Super Admin pode executar esta ação.';
  END IF;

  RETURN QUERY
  SELECT 
    u.id,
    u.email::VARCHAR,
    COALESCE(u.raw_user_meta_data->>'full_name', '')::TEXT as full_name,
    p.user_code,
    p.plan_id,
    p.created_at
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  ORDER BY p.created_at DESC;
END;
$$;
