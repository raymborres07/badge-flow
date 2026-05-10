-- Add badge_type and signatories columns to forms table
ALTER TABLE forms ADD COLUMN IF NOT EXISTS badge_type TEXT DEFAULT 'lanyard';
ALTER TABLE forms ADD COLUMN IF NOT EXISTS signatories JSONB DEFAULT '[]';
