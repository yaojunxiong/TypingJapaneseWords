-- =============================================================
-- Migration 02: recording_takes table + recordings bucket
-- =============================================================
-- Apply in Supabase Dashboard → SQL Editor
-- After applying, create the 'recordings' bucket via Storage UI.
--
-- Permission model:
--   recordings bucket: private (not public)
--   Normal users: access only their own recordings via RLS + API
--   Admins: access all recordings via API routes that check admin role
--   Playback always via signed URL (1h expiry), never public permanent URL

-- 1. Admin helper function (safe to re-run)
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
  );
$$;

-- 2. recording_takes table
CREATE TABLE IF NOT EXISTS public.recording_takes (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_no             SMALLINT NOT NULL,
  line_no               SMALLINT NOT NULL,
  take_no               SMALLINT NOT NULL,
  storage_path          TEXT NOT NULL,
  audio_mime_type       TEXT NOT NULL DEFAULT 'audio/webm',
  duration_ms           INTEGER NOT NULL DEFAULT 0,
  score                 REAL,
  is_best               BOOLEAN NOT NULL DEFAULT FALSE,
  is_system_recommended BOOLEAN NOT NULL DEFAULT FALSE,
  upload_status         TEXT NOT NULL DEFAULT 'pending'
                          CHECK (upload_status IN ('pending', 'uploaded', 'failed')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ,

  CONSTRAINT unique_best_per_line
    EXCLUDE USING gist (
      user_id WITH =,
      lesson_no WITH =,
      line_no WITH =,
      (is_best::int) WITH =
    ) WHERE (is_best = TRUE),

  UNIQUE (user_id, lesson_no, line_no, take_no)
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_takes_user_lesson
  ON public.recording_takes(user_id, lesson_no)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_takes_line
  ON public.recording_takes(user_id, lesson_no, line_no)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_takes_best
  ON public.recording_takes(user_id, lesson_no, line_no)
  WHERE is_best = TRUE AND deleted_at IS NULL;

-- 4. updated_at trigger
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.recording_takes;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.recording_takes
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 5. Row Level Security
ALTER TABLE public.recording_takes ENABLE ROW LEVEL SECURITY;

-- Normal users: view own takes | Admins: view all takes
DROP POLICY IF EXISTS "用户查看录音" ON public.recording_takes;
CREATE POLICY "用户查看录音"
  ON public.recording_takes FOR SELECT
  TO authenticated
  USING (
    (user_id = auth.uid() AND deleted_at IS NULL)
    OR public.is_admin_user()
  );

-- Users insert their own takes (admin should not insert on behalf of others)
DROP POLICY IF EXISTS "用户上传录音" ON public.recording_takes;
CREATE POLICY "用户上传录音"
  ON public.recording_takes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Normal users: update own | Admins: update any
DROP POLICY IF EXISTS "用户更新录音" ON public.recording_takes;
CREATE POLICY "用户更新录音"
  ON public.recording_takes FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin_user()
  );

-- Normal users: delete own | Admins: delete any
DROP POLICY IF EXISTS "用户删除录音" ON public.recording_takes;
CREATE POLICY "用户删除录音"
  ON public.recording_takes FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin_user()
  );

-- 6. Storage bucket 'recordings' (create via Dashboard UI)
--    Name: recordings
--    Public: OFF (private — children's recordings must never be publicly accessible)
--    File size limit: 10 MB
--    Allowed MIME types: audio/webm, audio/mp4, audio/mpeg
--
-- Normal users access their own files; admins access all files.
-- Playback is always via signed URL (1h expiry) generated server-side.
-- Frontend never exposes a public permanent URL to storage objects.

-- Storage RLS policies (apply via Dashboard → SQL Editor after bucket creation):
/*
CREATE POLICY "用户上传自己的录音文件"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'recordings'
    AND auth.uid()::text = SPLIT_PART(name, '/', 1)
  );

CREATE POLICY "用户读取自己的录音文件"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'recordings'
    AND (
      auth.uid()::text = SPLIT_PART(name, '/', 1)
      OR public.is_admin_user()
    )
  );

CREATE POLICY "用户删除自己的录音文件"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'recordings'
    AND (
      auth.uid()::text = SPLIT_PART(name, '/', 1)
      OR public.is_admin_user()
    )
  );
*/

-- 7. Rollback
-- DROP TRIGGER IF EXISTS set_updated_at ON public.recording_takes;
-- DROP FUNCTION IF EXISTS trigger_set_updated_at;
-- DROP TABLE IF EXISTS public.recording_takes;
-- DELETE FROM storage.objects WHERE bucket_id = 'recordings';
-- DELETE FROM storage.buckets WHERE id = 'recordings';
-- DROP FUNCTION IF EXISTS public.is_admin_user;
