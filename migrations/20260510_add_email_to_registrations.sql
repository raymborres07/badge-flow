-- Add email column to registrations table to support auto-fill for recurring users
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS email TEXT;

-- Index the email column for faster lookups
CREATE INDEX IF NOT EXISTS idx_registrations_email ON registrations(email);

-- Update form_config table if there's a constraint on target_lanyard_field
-- (Note: This depends on how the constraint was named. If it's a CHECK constraint, we might need to drop and recreate it.)
-- However, if it's just a text column without a check constraint, this step is not needed.
-- But since we got a 400 error, there's likely a constraint.
-- Most common way to fix this in Supabase if it's an enum or check:
-- ALTER TABLE form_config DROP CONSTRAINT IF EXISTS form_config_target_lanyard_field_check;
-- ALTER TABLE form_config ADD CONSTRAINT form_config_target_lanyard_field_check CHECK (target_lanyard_field IN ('none', 'name', 'industry', 'email'));
