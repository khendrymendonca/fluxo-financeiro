DO $$
DECLARE
  u RECORD;
  cat_cartao UUID;
  cat_abatimento UUID;
  cat_acordo UUID;
  cat_transferencia UUID;
  v_group_id UUID;
BEGIN
  -- Precisamos de um group_id válido caso o usuário não tenha categorias no grupo.
  -- Usaremos o primeiro disponível ou nulo.
  SELECT id INTO v_group_id FROM public.category_groups LIMIT 1;

  FOR u IN SELECT DISTINCT user_id FROM public.categories LOOP
    
    -- 1. Cartão de Crédito
    SELECT id INTO cat_cartao FROM public.categories WHERE user_id = u.user_id AND (name = 'Cartão de Crédito' OR name ILIKE '%cartão de crédito%') LIMIT 1;
    IF cat_cartao IS NULL THEN
      INSERT INTO public.categories (user_id, group_id, name, type, icon, color, is_active, is_fixed, is_system) 
      VALUES (u.user_id, v_group_id, 'Cartão de Crédito', 'expense', 'CreditCard', '#E11D48', true, false, true) RETURNING id INTO cat_cartao;
    END IF;

    -- 2. Abatimento no Cartão
    SELECT id INTO cat_abatimento FROM public.categories WHERE user_id = u.user_id AND name ILIKE '%abatimento%' LIMIT 1;
    IF cat_abatimento IS NULL THEN
      INSERT INTO public.categories (user_id, group_id, name, type, icon, color, is_active, is_fixed, is_system) 
      VALUES (u.user_id, v_group_id, 'Abatimento no Cartão', 'expense', 'CreditCard', '#6366F1', true, false, true) RETURNING id INTO cat_abatimento;
    END IF;

    -- 3. Acordo
    SELECT id INTO cat_acordo FROM public.categories WHERE user_id = u.user_id AND (name = 'Acordo' OR name ILIKE 'acordo%') LIMIT 1;
    IF cat_acordo IS NULL THEN
      INSERT INTO public.categories (user_id, group_id, name, type, icon, color, is_active, is_fixed, is_system) 
      VALUES (u.user_id, v_group_id, 'Acordo', 'expense', 'Handshake', '#F59E0B', true, false, true) RETURNING id INTO cat_acordo;
    END IF;

    -- 4. Transferência
    SELECT id INTO cat_transferencia FROM public.categories WHERE user_id = u.user_id AND (name = 'Transferência' OR name ILIKE 'transferência%') LIMIT 1;
    IF cat_transferencia IS NULL THEN
      INSERT INTO public.categories (user_id, group_id, name, type, icon, color, is_active, is_fixed, is_system) 
      VALUES (u.user_id, v_group_id, 'Transferência', 'expense', 'ArrowRightLeft', '#71717A', true, false, true) RETURNING id INTO cat_transferencia;
    END IF;

    -- Forçar is_system = true para essas categorias, caso já existissem antes
    UPDATE public.categories 
    SET is_system = true, is_fixed = false 
    WHERE id IN (cat_cartao, cat_abatimento, cat_acordo, cat_transferencia);

    -- ==========================================
    -- REALIZANDO AS ATUALIZAÇÕES (RETROATIVO)
    -- ==========================================

    -- A. Pagamento de Fatura (Normal e Entrada de Parcelamento da Fatura)
    UPDATE public.transactions 
    SET category_id = cat_cartao, subcategory_id = NULL 
    WHERE user_id = u.user_id 
      AND is_invoice_payment = true 
      AND (transaction_type != 'adjustment' OR transaction_type IS NULL);

    -- B. Abatimentos na Fatura (Adiantamento, Renegociação)
    UPDATE public.transactions 
    SET category_id = cat_abatimento, subcategory_id = NULL 
    WHERE user_id = u.user_id 
      AND is_invoice_payment = true 
      AND transaction_type = 'adjustment';

    -- C. Acordos
    UPDATE public.transactions 
    SET category_id = cat_acordo, subcategory_id = NULL 
    WHERE user_id = u.user_id 
      AND debt_id IS NOT NULL;

    -- D. Transferências entre contas
    UPDATE public.transactions 
    SET category_id = cat_transferencia, subcategory_id = NULL 
    WHERE user_id = u.user_id 
      AND is_transfer = true;

  END LOOP;
END;
$$;
