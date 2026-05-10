-- =============================================================
-- SAFE SCHEMA SYNC - Run this in Supabase SQL Editor
-- Safe to run multiple times (idempotent)
-- =============================================================

-- 1. FORMS TABLE - add all new columns
ALTER TABLE forms ADD COLUMN IF NOT EXISTS organizer_name TEXT DEFAULT 'GDGoC NagoyaUniversity';
ALTER TABLE forms ADD COLUMN IF NOT EXISTS badge_subtitle TEXT DEFAULT 'Certificate of Participation';
ALTER TABLE forms ADD COLUMN IF NOT EXISTS event_date TEXT DEFAULT '';
ALTER TABLE forms ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS badge_type TEXT DEFAULT 'lanyard';
ALTER TABLE forms ADD COLUMN IF NOT EXISTS signatories JSONB DEFAULT '[]';
ALTER TABLE forms ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2. FORM_CONFIG TABLE - add missing columns
ALTER TABLE form_config ADD COLUMN IF NOT EXISTS placeholder_en TEXT;
ALTER TABLE form_config ADD COLUMN IF NOT EXISTS placeholder_ja TEXT;
ALTER TABLE form_config ADD COLUMN IF NOT EXISTS grid_rows JSONB DEFAULT '[]'::jsonb;

-- 3. REGISTRATIONS TABLE - add email and soft delete
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_registrations_email ON registrations(email);
CREATE INDEX IF NOT EXISTS idx_registrations_deleted_at ON registrations(deleted_at);

-- Prevent duplicate registrations for the same form
-- First, clean up any existing duplicates (keep most recent)
DELETE FROM registrations a USING (
      SELECT id, 
             ROW_NUMBER() OVER (PARTITION BY form_id, email ORDER BY created_at DESC) as rn
      FROM registrations
      WHERE email IS NOT NULL
) b
WHERE a.id = b.id AND b.rn > 1;

ALTER TABLE registrations 
    DROP CONSTRAINT IF EXISTS unique_form_email;
ALTER TABLE registrations 
    ADD CONSTRAINT unique_form_email UNIQUE (form_id, email);

-- 4. FORM_CONFIG CONSTRAINT - drop and recreate safely
ALTER TABLE form_config DROP CONSTRAINT IF EXISTS form_config_target_lanyard_field_check;
ALTER TABLE form_config ADD CONSTRAINT form_config_target_lanyard_field_check
    CHECK (target_lanyard_field IN ('none', 'name', 'industry', 'email'));

-- 5. FOREIGN KEYS - with cascade delete
ALTER TABLE form_config
    DROP CONSTRAINT IF EXISTS form_config_form_id_fkey,
    ADD CONSTRAINT form_config_form_id_fkey
        FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE;

ALTER TABLE registrations
    DROP CONSTRAINT IF EXISTS registrations_form_id_fkey,
    ADD CONSTRAINT registrations_form_id_fkey
        FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE;

-- 6. RLS POLICIES for forms
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access to forms" ON forms;
CREATE POLICY "Allow public access to forms" ON forms FOR ALL USING (true) WITH CHECK (true);

-- 7. RLS POLICIES for registrations
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access to registrations" ON registrations;
CREATE POLICY "Allow public access to registrations" ON registrations FOR ALL USING (true) WITH CHECK (true);

-- 8. RLS POLICIES for form_config
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing storage policies first to avoid conflicts
DROP POLICY IF EXISTS "Allow public read for logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public upload for logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update for logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete for logos" ON storage.objects;

CREATE POLICY "Allow public read for logos" ON storage.objects FOR SELECT USING (bucket_id = 'logos');
CREATE POLICY "Allow public upload for logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'logos');
CREATE POLICY "Allow public update for logos" ON storage.objects FOR UPDATE USING (bucket_id = 'logos');
CREATE POLICY "Allow public delete for logos" ON storage.objects FOR DELETE USING (bucket_id = 'logos');

-- 9. POPULATE DEFAULTS for existing rows
UPDATE forms SET organizer_name = 'GDGoC NagoyaUniversity' WHERE organizer_name IS NULL;
UPDATE forms SET badge_subtitle = 'Certificate of Participation' WHERE badge_subtitle IS NULL;
UPDATE forms SET badge_type = 'lanyard' WHERE badge_type IS NULL;
UPDATE forms SET signatories = '[]'::jsonb WHERE signatories IS NULL;
UPDATE forms SET event_date = '' WHERE event_date IS NULL;

-- 10. Link any orphaned registrations
UPDATE registrations
SET form_id = '00000000-0000-0000-0000-000000000001'::uuid
WHERE form_id IS NULL;
