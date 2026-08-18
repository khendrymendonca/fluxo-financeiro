-- Permite que cada subcategoria tenha seu próprio ícone (opcional). Quando
-- definido, o ícone da subcategoria passa a prevalecer sobre o da categoria-mãe
-- nas telas de Gestão de Contas e de Lançamentos.
ALTER TABLE public.subcategories ADD COLUMN IF NOT EXISTS icon text;
