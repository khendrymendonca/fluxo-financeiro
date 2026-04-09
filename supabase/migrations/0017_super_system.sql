-- ============================================================
-- FASE 4 — Sistema Super: perfis de usuário + feature overrides
-- ============================================================

-- 1. Perfis (código único FLX-XXXX por usuário)
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_code  TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_user_code
  ON profiles(user_code);

-- 2. Overrides de features por usuário
-- Só registra exceções: se não há registro, vale o default do código
CREATE TABLE IF NOT EXISTS user_feature_overrides (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  enabled     BOOLEAN NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_ufo_user_id
  ON user_feature_overrides(user_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feature_overrides ENABLE ROW LEVEL SECURITY;

-- Usuário lê seu próprio perfil
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Usuário lê seus próprios overrides
CREATE POLICY "ufo_select_own"
  ON user_feature_overrides FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- Função: gerar código único FLX-XXXX
-- ============================================================
CREATE OR REPLACE FUNCTION generate_user_code()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code  TEXT := 'FLX-';
  i     INT;
BEGIN
  FOR i IN 1..4 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN code;
END;
$$;

-- ============================================================
-- Trigger: criar profile ao cadastrar novo usuário
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_code TEXT;
  attempts INT := 0;
BEGIN
  LOOP
    new_code := generate_user_code();
    BEGIN
      INSERT INTO profiles (id, user_code) VALUES (NEW.id, new_code);
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      attempts := attempts + 1;
      IF attempts > 10 THEN
        RAISE EXCEPTION 'Falha ao gerar código único';
      END IF;
    END;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_handle_new_user ON auth.users;
CREATE TRIGGER tr_handle_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- Gerar perfis para usuários já cadastrados
-- ============================================================
INSERT INTO profiles (id, user_code)
SELECT
  u.id,
  'FLX-' ||
    substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', floor(random()*32+1)::int, 1) ||
    substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', floor(random()*32+1)::int, 1) ||
    substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', floor(random()*32+1)::int, 1) ||
    substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', floor(random()*32+1)::int, 1)
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = u.id)
ON CONFLICT DO NOTHING;
