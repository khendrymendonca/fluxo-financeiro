DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subcategories' AND column_name='budget_limit') THEN
        ALTER TABLE subcategories ADD COLUMN budget_limit NUMERIC DEFAULT NULL;
    END IF;
END $$;

COMMENT ON COLUMN subcategories.budget_limit IS 'Limite mensal de gastos para esta subcategoria. NULL = sem limite definido.';
