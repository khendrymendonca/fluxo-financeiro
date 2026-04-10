-- ============================================================
-- FASE 7 — Flags Globais (Temas Especiais)
-- ============================================================

CREATE TABLE IF NOT EXISTS global_feature_flags (
  key         TEXT PRIMARY KEY,
  enabled     BOOLEAN NOT NULL DEFAULT false,
  label       TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir temas especiais disponíveis
INSERT INTO global_feature_flags (key, label, enabled) VALUES
  ('theme_easter',    'Tema de Páscoa',    false),
  ('theme_christmas', 'Tema de Natal',     false),
  ('theme_halloween', 'Tema de Halloween', false)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE global_feature_flags ENABLE ROW LEVEL SECURITY;

-- Todos os usuários autenticados podem LER
-- (necessário para o app saber quais temas estão ativos)
CREATE POLICY "global_flags_select_authenticated"
  ON global_feature_flags FOR SELECT TO authenticated
  USING (true);

-- Super admin: UPDATE
-- ATENÇÃO: executar separadamente no SQL Editor com UUID real
