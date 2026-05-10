-- Add logo_url column to forms table
ALTER TABLE forms ADD COLUMN IF NOT EXISTS logo_url TEXT;
