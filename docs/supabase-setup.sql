-- Minna AI Learning App Supabase setup
-- Run this in Supabase Dashboard -> SQL Editor.

create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_key text not null,
  lesson_id text not null,
  progress jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(user_key, lesson_id)
);

alter table public.lesson_progress enable row level security;

-- Demo policy for a simple public static GitHub Pages app.
-- Anyone with the anon key can upsert/select rows by user_key.
-- For private/production use, replace this with Supabase Auth policies.
drop policy if exists "demo_select_lesson_progress" on public.lesson_progress;
create policy "demo_select_lesson_progress"
on public.lesson_progress
for select
to anon
using (true);

drop policy if exists "demo_insert_lesson_progress" on public.lesson_progress;
create policy "demo_insert_lesson_progress"
on public.lesson_progress
for insert
to anon
with check (true);

drop policy if exists "demo_update_lesson_progress" on public.lesson_progress;
create policy "demo_update_lesson_progress"
on public.lesson_progress
for update
to anon
using (true)
with check (true);

create index if not exists idx_lesson_progress_user_lesson
on public.lesson_progress(user_key, lesson_id);

-- Optional: test query
-- select * from public.lesson_progress order by updated_at desc limit 10;
