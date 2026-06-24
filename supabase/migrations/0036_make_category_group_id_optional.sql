-- Migration to make group_id optional in categories table
ALTER TABLE categories ALTER COLUMN group_id DROP NOT NULL;
