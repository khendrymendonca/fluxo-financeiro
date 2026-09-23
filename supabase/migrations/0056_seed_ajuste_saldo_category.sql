-- Pré-configura a categoria "Ajuste de Saldo" pra todo mundo como is_system = true
-- e tipo 'expense' (mas permitida em ambos no frontend)

DO $$
DECLARE
  v_group_id uuid;
BEGIN
  -- Tentar achar um grupo adequado, pode ser 'financial' ou genérico
  SELECT id INTO v_group_id FROM public.category_groups WHERE name = 'financial' LIMIT 1;
  IF v_group_id IS NULL THEN
    SELECT id INTO v_group_id FROM public.category_groups LIMIT 1;
  END IF;

  INSERT INTO public.categories (user_id, group_id, name, type, icon, color, budget_group, is_active, is_fixed, is_system)
  SELECT p.id, v_group_id, 'Ajuste de Saldo', 'expense', 'Settings2', '#9CA3AF', 'financial', true, false, true
  FROM public.profiles p
  WHERE NOT EXISTS (
    SELECT 1 FROM public.categories c
    WHERE c.user_id = p.id AND c.name = 'Ajuste de Saldo' AND c.is_system = true
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

  INSERT INTO public.categories (user_id, group_id, name, type, icon, color, budget_group, is_active, is_fixed, is_system)
  VALUES 
    (NEW.id, v_group_id, 'Abatimento no Cartão', 'expense', 'CreditCard', '#6366F1', 'financial', true, false, true),
    (NEW.id, v_group_id, 'Ajuste de Saldo', 'expense', 'Settings2', '#9CA3AF', 'financial', true, false, true);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_seed_default_categories ON auth.users;
CREATE TRIGGER tr_seed_default_categories
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.seed_default_categories();

NOTIFY pgrst, 'reload schema';
