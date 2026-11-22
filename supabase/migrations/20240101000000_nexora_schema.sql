-- ==============================================================================
-- NEXORA – Complete PostgreSQL Production Schema & Row Level Security
-- ==============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. PROFILES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    storage_used_bytes BIGINT DEFAULT 0 CHECK (storage_used_bytes >= 0),
    storage_limit_bytes BIGINT DEFAULT 1073741824, -- 1 GB default free tier
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 2. USER PREFERENCES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    theme_id TEXT DEFAULT 'neon-midnight',
    color_mode TEXT DEFAULT 'dark' CHECK (color_mode IN ('dark', 'light', 'system')),
    biometrics_enabled BOOLEAN DEFAULT FALSE,
    auto_lock_vault BOOLEAN DEFAULT TRUE,
    recycle_bin_retention_days INT DEFAULT 30 CHECK (recycle_bin_retention_days BETWEEN 1 AND 365),
    audio_visualizer_style TEXT DEFAULT 'bars',
    compact_view BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. FOLDERS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#6366F1',
    icon TEXT DEFAULT 'folder',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, parent_id, name)
);

-- ==============================================================================
-- 4. MEDIA FILES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.media_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video', 'audio', 'pdf', 'document', 'other')),
    size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
    thumbnail_path TEXT,
    duration_seconds NUMERIC(10, 2), -- for audio/video
    width INT,                       -- for images/videos
    height INT,                      -- for images/videos
    artist TEXT,                     -- for music
    album TEXT,                      -- for music
    title TEXT,                      -- for music
    is_favourite BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 5. RECYCLE BIN (SOFT DELETE & RESTORATION AUDIT)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.recycle_bin (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES public.media_files(id) ON DELETE CASCADE,
    original_folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
    deleted_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- ==============================================================================
-- 6. PRIVATE VAULT METADATA (ZERO-KNOWLEDGE ENCRYPTED)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.vault_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    encrypted_name TEXT NOT NULL,
    encrypted_mime_type TEXT NOT NULL,
    nonce TEXT NOT NULL,               -- AES-GCM IV/nonce (hex or base64)
    salt TEXT NOT NULL,                -- PBKDF2 salt
    size_bytes BIGINT NOT NULL,
    auth_tag TEXT NOT NULL,            -- AES-GCM authentication tag
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 7. PLAYLISTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.playlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    cover_url TEXT DEFAULT '',
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 8. PLAYLIST ITEMS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.playlist_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
    media_file_id UUID NOT NULL REFERENCES public.media_files(id) ON DELETE CASCADE,
    position INT NOT NULL DEFAULT 0,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(playlist_id, media_file_id)
);

-- ==============================================================================
-- 9. FAVOURITES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.favourites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    media_file_id UUID NOT NULL REFERENCES public.media_files(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, media_file_id)
);

-- ==============================================================================
-- 10. PLAYBACK HISTORY
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.playback_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    media_file_id UUID NOT NULL REFERENCES public.media_files(id) ON DELETE CASCADE,
    played_at TIMESTAMPTZ DEFAULT NOW(),
    playback_duration_seconds INT DEFAULT 0
);

-- ==============================================================================
-- 11. FILE ACTIVITY LOGS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.file_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    media_file_id UUID REFERENCES public.media_files(id) ON DELETE SET NULL,
    action TEXT NOT NULL CHECK (action IN ('upload', 'delete', 'soft_delete', 'restore', 'rename', 'move', 'vault_lock', 'vault_unlock', 'share')),
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 12. NOTES (PRODUCTIVITY)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    category TEXT DEFAULT 'General',
    color TEXT DEFAULT '#2A2D3E',
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 13. TASKS / TO-DO (PRODUCTIVITY)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT DEFAULT 'Personal',
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    is_completed BOOLEAN DEFAULT FALSE,
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 14. SHARED LINKS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.shared_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    media_file_id UUID NOT NULL REFERENCES public.media_files(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    access_count INT DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_media_files_user ON public.media_files(user_id);
CREATE INDEX IF NOT EXISTS idx_media_files_folder ON public.media_files(folder_id);
CREATE INDEX IF NOT EXISTS idx_media_files_type ON public.media_files(file_type);
CREATE INDEX IF NOT EXISTS idx_media_files_deleted ON public.media_files(is_deleted);
CREATE INDEX IF NOT EXISTS idx_media_files_created ON public.media_files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_playback_history_user ON public.playback_history(user_id, played_at DESC);
CREATE INDEX IF NOT EXISTS idx_recycle_bin_user ON public.recycle_bin(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_metadata_user ON public.vault_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_user ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_links_token ON public.shared_links(token);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recycle_bin ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favourites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playback_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_links ENABLE ROW LEVEL SECURITY;

-- Profiles: Only owner can read/update
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Preferences: Only owner
CREATE POLICY "Users can manage own preferences" ON public.user_preferences FOR ALL USING (auth.uid() = user_id);

-- Folders: Only owner
CREATE POLICY "Users can manage own folders" ON public.folders FOR ALL USING (auth.uid() = user_id);

-- Media Files: Only owner
CREATE POLICY "Users can manage own media files" ON public.media_files FOR ALL USING (auth.uid() = user_id);

-- Recycle Bin: Only owner
CREATE POLICY "Users can manage own recycle bin" ON public.recycle_bin FOR ALL USING (auth.uid() = user_id);

-- Vault: Only owner
CREATE POLICY "Users can manage own vault" ON public.vault_metadata FOR ALL USING (auth.uid() = user_id);

-- Playlists & items
CREATE POLICY "Users can manage own playlists" ON public.playlists FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view public playlists" ON public.playlists FOR SELECT USING (is_public = TRUE);
CREATE POLICY "Users can manage playlist items" ON public.playlist_items FOR ALL USING (
    EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = playlist_id AND p.user_id = auth.uid())
);

-- Favourites, History, Logs, Notes, Tasks, Shares
CREATE POLICY "Users can manage own favourites" ON public.favourites FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage playback history" ON public.playback_history FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage file logs" ON public.file_activity_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage notes" ON public.notes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage tasks" ON public.tasks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage shared links" ON public.shared_links FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public can view valid shared link" ON public.shared_links FOR SELECT USING (
    is_revoked = FALSE AND expires_at > NOW()
);

-- ==============================================================================
-- AUTOMATIC PROFILE CREATION TRIGGER ON SIGNUP
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
    );
    INSERT INTO public.user_preferences (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- STORAGE USAGE ACCUMULATOR TRIGGER
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.update_user_storage_usage()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.profiles
        SET storage_used_bytes = storage_used_bytes + NEW.size_bytes
        WHERE id = NEW.user_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.profiles
        SET storage_used_bytes = GREATEST(0, storage_used_bytes - OLD.size_bytes)
        WHERE id = OLD.user_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_media_file_storage_change ON public.media_files;
CREATE TRIGGER on_media_file_storage_change
    AFTER INSERT OR DELETE ON public.media_files
    FOR EACH ROW EXECUTE FUNCTION public.update_user_storage_usage();

