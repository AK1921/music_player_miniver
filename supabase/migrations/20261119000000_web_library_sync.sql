ALTER TABLE public.user_preferences
    ADD COLUMN IF NOT EXISTS web_custom_palette JSONB;

CREATE TABLE IF NOT EXISTS public.web_recent_tracks (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    track_id TEXT NOT NULL,
    track JSONB NOT NULL,
    played_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, track_id)
);

CREATE INDEX IF NOT EXISTS web_recent_tracks_by_user_time
    ON public.web_recent_tracks (user_id, played_at DESC);

ALTER TABLE public.web_recent_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own web listening history"
    ON public.web_recent_tracks FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.web_recent_tracks TO authenticated;

DO $$
DECLARE
    synced_table TEXT;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime' AND NOT puballtables) THEN
        FOREACH synced_table IN ARRAY ARRAY['playlists', 'user_preferences', 'web_recent_tracks', 'media_files']
        LOOP
            IF NOT EXISTS (
                SELECT 1 FROM pg_publication_tables
                WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = synced_table
            ) THEN
                EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', synced_table);
            END IF;
        END LOOP;
    END IF;
END $$;
