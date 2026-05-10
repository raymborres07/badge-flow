-- 1. Create the forms table
CREATE TABLE IF NOT EXISTS forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    title_en TEXT NOT NULL,
    title_ja TEXT NOT NULL,
    hero_text_en TEXT,
    hero_text_ja TEXT,
    description_en TEXT,
    description_ja TEXT
);

-- 2. Add form_id column to config and registrations
ALTER TABLE form_config ADD COLUMN IF NOT EXISTS form_id UUID REFERENCES forms(id);
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS form_id UUID REFERENCES forms(id);

-- 3. Create a default form for existing data
INSERT INTO forms (id, slug, title_en, title_ja, hero_text_en, hero_text_ja)
VALUES (
    '00000000-0000-0000-0000-000000000001', 
    'tech-de-tsunagaru', 
    'Tech de Tsunagaru', 
    'Tech de Tsunagaru', 
    'Join the community and get your event badge', 
    'コミュニティに参加して、イベントバッジを受け取ろう'
) ON CONFLICT (slug) DO NOTHING;

-- 4. Update existing records to point to the default form
UPDATE form_config SET form_id = '00000000-0000-0000-0000-000000000001' WHERE form_id IS NULL;
UPDATE registrations SET form_id = '00000000-0000-0000-0000-000000000001' WHERE form_id IS NULL;

-- 5. Make form_id NOT NULL for future records (optional, but good for integrity)
-- ALTER TABLE form_config ALTER COLUMN form_id SET NOT NULL;
-- ALTER TABLE registrations ALTER COLUMN form_id SET NOT NULL;
