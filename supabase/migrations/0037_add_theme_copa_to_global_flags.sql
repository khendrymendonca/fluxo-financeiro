-- Adicionar o Tema da Copa às flags globais
INSERT INTO global_feature_flags (key, label, enabled)
VALUES ('theme_copa', 'Tema da Copa 🇧🇷', false)
ON CONFLICT (key) DO NOTHING;
