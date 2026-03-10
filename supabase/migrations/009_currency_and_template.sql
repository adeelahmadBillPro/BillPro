-- Migration 009: Multi-currency + Invoice template settings
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'PKR';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS invoice_template TEXT DEFAULT 'classic';
