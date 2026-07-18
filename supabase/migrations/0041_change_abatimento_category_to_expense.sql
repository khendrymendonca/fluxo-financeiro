-- Migration: Change Abatimento Fatura category type from income to expense
-- Descrição: Altera a categoria de abatimento de faturas de Receita para Despesa para que ela seja compatível com o novo fluxo de despesas antecipadas.

UPDATE public.categories 
SET type = 'expense' 
WHERE name = 'Abatimento Fatura' AND type = 'income';

UPDATE public.categories 
SET type = 'expense' 
WHERE name = 'Abatimento' AND type = 'income';
