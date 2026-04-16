-- ============================================================
-- MIGRAÇÃO: AJUSTE DE NOMENCLATURA BUDGET_LIMIT
-- Data: 15/04/2026
-- Objetivo: Garantir que a coluna siga o padrão snake_case (budget_limit)
-- ============================================================

DO $$ 
BEGIN 
    -- 1. Se a coluna budgetlimit (sem underscore) existir, renomeia para budget_limit
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='budgetlimit') THEN
        ALTER TABLE categories RENAME COLUMN budgetlimit TO budget_limit;
    END IF;

    -- 2. Se a coluna budget_limit (com underscore) não existir, cria ela
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='budget_limit') THEN
        ALTER TABLE categories ADD COLUMN budget_limit NUMERIC DEFAULT NULL;
    END IF;
END $$;

COMMENT ON COLUMN categories.budget_limit IS 'Limite mensal de gastos para esta categoria. NULL = sem limite definido.';
