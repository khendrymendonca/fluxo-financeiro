-- ============================================================
-- category_groups: lookup global somente leitura
-- ============================================================

ALTER TABLE public.category_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "category_groups_select_authenticated"
  ON public.category_groups;

CREATE POLICY "category_groups_select_authenticated"
  ON public.category_groups
  FOR SELECT
  TO authenticated
  USING (true);

REVOKE ALL ON TABLE public.category_groups FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.category_groups FROM authenticated;
GRANT SELECT ON TABLE public.category_groups TO authenticated;
