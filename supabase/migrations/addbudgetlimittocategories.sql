ALTER TABLE categories
ADD COLUMN IF NOT EXISTS budgetlimit NUMERIC DEFAULT NULL;

COMMENT ON COLUMN categories.budgetlimit IS
'Limite mensal de gastos para esta categoria. NULL = sem limite definido.';