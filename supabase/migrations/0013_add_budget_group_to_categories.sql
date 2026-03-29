-- Migration: Add budget_group to categories
-- Description: Adds a new column to categorize expenses into 3 macro-groups: essential, lifestyle, and financial.

-- 1. Add the column with a default value for legacy data
ALTER TABLE categories ADD COLUMN IF NOT EXISTS budget_group VARCHAR(50) DEFAULT 'essential';

-- 2. Update existing categories based on their legacy group_id if possible
-- 'Essenciais' -> 'essential'
-- 'Estilo de Vida' -> 'lifestyle'
-- 'Metas/Acordos' or 'metas' -> 'financial'
-- income categories -> 'income'

UPDATE categories 
SET budget_group = 'income' 
WHERE type = 'income';

UPDATE categories 
SET budget_group = 'lifestyle' 
WHERE type = 'expense' AND (
  name ILIKE '%lazer%' OR 
  name ILIKE '%estilo%' OR 
  name ILIKE '%shopping%' OR 
  name ILIKE '%restaurante%'
);

UPDATE categories 
SET budget_group = 'financial' 
WHERE type = 'expense' AND (
  name ILIKE '%investimento%' OR 
  name ILIKE '%reserva%' OR 
  name ILIKE '%meta%' OR 
  name ILIKE '%acordo%' OR
  name ILIKE '%dívida%'
);

-- 3. Ensure the column is not null for future inserts
ALTER TABLE categories ALTER COLUMN budget_group SET NOT NULL;
