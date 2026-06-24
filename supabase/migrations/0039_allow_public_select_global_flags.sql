-- Liberar leitura das flags globais para usuários não logados (anônimos) na tela de login
DROP POLICY IF EXISTS "global_flags_select_authenticated" ON public.global_feature_flags;
DROP POLICY IF EXISTS "global_flags_select_all" ON public.global_feature_flags;

CREATE POLICY "global_flags_select_all"
  ON public.global_feature_flags FOR SELECT
  USING (true);
