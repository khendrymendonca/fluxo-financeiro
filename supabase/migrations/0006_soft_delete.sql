-- Add deleted_at column for Soft Delete support
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Update RLS policies to exclude soft-deleted records by default
-- Note: In a real production environment, we'd drop and recreate the policies
-- to include (deleted_at IS NULL). For now, we'll focus on the columns.

-- Create an index for performance
CREATE INDEX IF NOT EXISTS idx_transactions_deleted_at ON transactions (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bills_deleted_at ON bills (deleted_at) WHERE deleted_at IS NULL;
