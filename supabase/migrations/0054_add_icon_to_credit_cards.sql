-- Permite escolher um ícone/logomarca (ex: Nubank, Mastercard) para exibir no cartão de crédito,
-- no mesmo padrão usado por categorias e subcategorias.
ALTER TABLE public.credit_cards ADD COLUMN IF NOT EXISTS icon text;
