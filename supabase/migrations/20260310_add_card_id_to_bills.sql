-- Migration to add card_id to bills table
ALTER TABLE bills ADD COLUMN IF NOT EXISTS card_id UUID REFERENCES credit_cards(id) ON DELETE SET NULL;
