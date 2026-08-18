-- seed_default_categories() só deve rodar como trigger em auth.users (usa
-- NEW, só existe em contexto de trigger). Estava com EXECUTE aberto pra
-- anon/authenticated via RPC direto -- fechando, mesmo padrão já aplicado
-- em handle_new_user.
REVOKE EXECUTE ON FUNCTION public.seed_default_categories() FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
