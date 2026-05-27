-- Minna AI Learning App: all lessons progress support
-- Run this after supabase-setup.sql and supabase-auth-google-upgrade.sql.
-- The table already supports all lessons through lesson_id.
-- This file adds a convenient view for all Minna no Nihongo lesson pages.

create or replace view public.minna_user_lesson_summary as
select
  user_key,
  user_id,
  user_email,
  lesson_id,
  progress ->> 'score' as score,
  progress ->> 'xp' as xp,
  progress -> 'done' as done_map,
  progress -> 'wrong' as wrong_map,
  updated_at
from public.lesson_progress;

-- Helpful indexes for all lesson pages.
create index if not exists idx_lesson_progress_lesson_id
on public.lesson_progress(lesson_id);

create index if not exists idx_lesson_progress_updated_at
on public.lesson_progress(updated_at desc);

-- Lesson ID convention:
-- minna_lesson_01
-- minna_lesson_02
-- minna_lesson_03
-- ...
-- minna_lesson_50

-- Example query:
-- select * from public.minna_user_lesson_summary where user_email = 'your@gmail.com' order by lesson_id;
