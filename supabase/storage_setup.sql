-- ==============================================================================
-- NEXORA – Supabase Storage Buckets & Policies
-- ==============================================================================

-- 1. Create Private Storage Buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('media-files', 'media-files', false, 52428800, NULL), -- 50MB per file
    ('media-vault', 'media-vault', false, 52428800, NULL), -- 50MB per file encrypted
    ('media-thumbnails', 'media-thumbnails', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']) -- 5MB thumbnails
ON CONFLICT (id) DO UPDATE SET 
    public = false,
    file_size_limit = EXCLUDED.file_size_limit;

-- 2. Storage Policies for 'media-files' (Scoped to user_id folder prefix: {user_id}/*)
CREATE POLICY "Users can upload own media files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'media-files' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view/download own media files"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'media-files' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own media files"
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'media-files' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own media files"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'media-files' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Storage Policies for 'media-vault' (Zero-Knowledge Encrypted)
CREATE POLICY "Users can upload own vault files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'media-vault' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view/download own vault files"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'media-vault' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own vault files"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'media-vault' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Storage Policies for 'media-thumbnails'
CREATE POLICY "Users can upload own thumbnails"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'media-thumbnails' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view own thumbnails"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'media-thumbnails' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own thumbnails"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'media-thumbnails' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

