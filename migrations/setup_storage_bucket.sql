-- 1. Create the "logos" bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow public access to read files in the "logos" bucket
CREATE POLICY "Allow public read for logos" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'logos');

-- 3. Allow anyone to upload files to the "logos" bucket
-- (Note: In production, you might want to restrict this to authenticated users only)
CREATE POLICY "Allow public upload for logos" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'logos');

-- 4. Allow anyone to update/delete files in the "logos" bucket
CREATE POLICY "Allow public update for logos" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'logos');

CREATE POLICY "Allow public delete for logos" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'logos');
