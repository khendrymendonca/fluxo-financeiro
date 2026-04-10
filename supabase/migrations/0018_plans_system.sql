-- ============================================================
-- FASE 7 — Sistema de Planos
-- ============================================================

-- 1. Tabela de planos (criados pelo super admin no app)
CREATE TABLE IF NOT EXISTS plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Features de cada plano
CREATE TABLE IF NOT EXISTS plan_features (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  enabled     BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(plan_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_plan_features_plan_id
  ON plan_features(plan_id);

-- 3. Adicionar plan_id em profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES plans(id)
  ON DELETE SET NULL;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_features ENABLE ROW LEVEL SECURITY;

-- Usuários autenticados podem LER planos e plan_features
-- (necessário para o hook resolver as features do próprio usuário)
CREATE POLICY "plans_select_authenticated"
  ON plans FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "plan_features_select_authenticated"
  ON plan_features FOR SELECT TO authenticated
  USING (true);

-- Super admin: INSERT/UPDATE/DELETE em plans e plan_features
-- ATENÇÃO: executar separadamente no SQL Editor com UUID real
-- (não incluir UUID neste arquivo versionado)
