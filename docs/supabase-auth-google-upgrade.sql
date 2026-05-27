-- Minna AI Learning App: Supabase Auth + Google login upgrade
-- Run this AFTER the original supabase-setup.sql.
-- This keeps the old user_key flow working, and adds optional Google Auth binding.

alter table public.lesson_progress
add column if not exists user_id uuid,
add column if not exists user_email text;

create index if not exists idx_lesson_progress_user_id
on public.lesson_progress(user_id);

create index if not exists idx_lesson_progress_user_email
on public.lesson_progress(user_email);

-- IMPORTANT SECURITY NOTE:
-- The earlier demo policies allow anon select/insert/update for easy testing.
-- For production, remove those demo policies and use the authenticated policies below.

-- Optional production hardening: uncomment these three lines after Google login works.
-- drop policy if exists "demo_select_lesson_progress" on public.lesson_progress;
-- drop policy if exists "demo_insert_lesson_progress" on public.lesson_progress;
-- drop policy if exists "demo_update_lesson_progress" on public.lesson_progress;

-- Authenticated users can read only their own rows.
drop policy if exists "auth_select_own_lesson_progress" on public.lesson_progress;
create policy "auth_select_own_lesson_progress"
on public.lesson_progress
for select
to authenticated
using (auth.uid() = user_id);

-- Authenticated users can insert only their own rows.
drop policy if exists "auth_insert_own_lesson_progress" on public.lesson_progress;
create policy "auth_insert_own_lesson_progress"
on public.lesson_progress
for insert
to authenticated
with check (auth.uid() = user_id);

-- Authenticated users can update only their own rows.
drop policy if exists "auth_update_own_lesson_progress" on public.lesson_progress;
create policy "auth_update_own_lesson_progress"
on public.lesson_progress
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- After Google login works, you can use this query to inspect saved progress:
-- select user_email, lesson_id, progress, updated_at from public.lesson_progress order by updated_at desc limit 20;
