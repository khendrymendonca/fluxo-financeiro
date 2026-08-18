-- Pré-configura a categoria "Abatimento no Cartão" pra todo mundo:
-- 1) backfill pros usuários que já existem
-- 2) trigger pra todo usuário novo já nascer com ela

DO $$
DECLARE
  v_group_id uuid;
BEGIN
  SELECT id INTO v_group_id FROM public.category_groups WHERE name = 'needs' LIMIT 1;
  IF v_group_id IS NULL THEN
    SELECT id INTO v_group_id FROM public.category_groups LIMIT 1;
  END IF;

  INSERT INTO public.categories (user_id, group_id, name, type, icon, color, budget_group, is_active, is_fixed)
  SELECT p.id, v_group_id, 'Abatimento no Cartão', 'expense', 'CreditCard', '#6366F1', 'financial', true, false
  FROM public.profiles p
  WHERE NOT EXISTS (
    SELECT 1 FROM public.categories c
    WHERE c.user_id = p.id AND c.type = 'expense' AND lower(c.name) LIKE '%abatimento%'
  );
END $$;

CREATE OR REPLACE FUNCTION public.seed_default_categories()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id uuid;
BEGIN
  SELECT id INTO v_group_id FROM public.category_groups WHERE name = 'needs' LIMIT 1;
  IF v_group_id IS NULL THEN
    SELECT id INTO v_group_id FROM public.category_groups LIMIT 1;
  END IF;

  INSERT INTO public.categories (user_id, group_id, name, type, icon, color, budget_group, is_active, is_fixed)
  VALUES (NEW.id, v_group_id, 'Abatimento no Cartão', 'expense', 'CreditCard', '#6366F1', 'financial', true, false);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_seed_default_categories ON auth.users;
CREATE TRIGGER tr_seed_default_categories
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.seed_default_categories();

NOTIFY pgrst, 'reload schema';
