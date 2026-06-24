-- =============================================================
-- Migration 02: recording_takes table + recordings bucket
-- =============================================================
-- Apply in Supabase Dashboard → SQL Editor
-- After applying, create the 'recordings' bucket via Storage UI.

-- 1. recording_takes table
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

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_takes_user_lesson
  ON public.recording_takes(user_id, lesson_no)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_takes_line
  ON public.recording_takes(user_id, lesson_no, line_no)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_takes_best
  ON public.recording_takes(user_id, lesson_no, line_no)
  WHERE is_best = TRUE AND deleted_at IS NULL;

-- 3. updated_at trigger
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

-- 4. Row Level Security
ALTER TABLE public.recording_takes ENABLE ROW LEVEL SECURITY;

-- Users can view their own takes
CREATE POLICY "用户可以查看自己的录音"
  ON public.recording_takes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL);

-- Users can insert their own takes
CREATE POLICY "用户可以上传自己的录音"
  ON public.recording_takes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own takes
CREATE POLICY "用户可以更新自己的录音"
  ON public.recording_takes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Users can soft-delete their own takes
CREATE POLICY "用户可以删除自己的录音"
  ON public.recording_takes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- NOTE: Admin RLS policies will be added in a later phase.

-- 5. Storage bucket 'recordings' (create via Dashboard UI)
--    Name: recordings
--    Public: OFF
--    File size limit: 10 MB
--    Allowed MIME types: audio/webm, audio/mp4, audio/mpeg

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
    AND auth.uid()::text = SPLIT_PART(name, '/', 1)
  );

CREATE POLICY "用户删除自己的录音文件"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'recordings'
    AND auth.uid()::text = SPLIT_PART(name, '/', 1)
  );
*/

-- 6. Rollback
-- DROP TRIGGER IF EXISTS set_updated_at ON public.recording_takes;
-- DROP FUNCTION IF EXISTS trigger_set_updated_at;
-- DROP TABLE IF EXISTS public.recording_takes;
-- DELETE FROM storage.objects WHERE bucket_id = 'recordings';
-- DELETE FROM storage.buckets WHERE id = 'recordings';
