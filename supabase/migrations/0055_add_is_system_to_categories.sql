-- A categoria "Abatimento no Cartão" é criada automaticamente pro usuário (seed_default_categories,
-- migration 0048) e é usada internamente pelo fluxo de abatimento de fatura (transactionService.ts).
-- Ela não deve aparecer nem ser editável na tela de Gestão de Categorias — é nativa do sistema.
-- Adiciona uma flag explícita em vez de depender só do nome, pra ficar robusto e explícito.
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false;

-- Backfill: marca as categorias de abatimento já existentes.
UPDATE public.categories
SET is_system = true
WHERE lower(name) LIKE '%abatimento%' AND is_system = false;

-- Todo usuário novo já nasce com a categoria marcada como nativa do sistema.
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
  VALUES (NEW.id, v_group_id, 'Abatimento no Cartão', 'expense', 'CreditCard', '#6366F1', 'financial', true, false, true);

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
