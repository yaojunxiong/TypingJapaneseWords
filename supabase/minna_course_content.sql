-- Minna course JSON content storage v17.2
-- Run this in Supabase SQL Editor.
-- Purpose:
--   Store editable course lesson JSON in Supabase.
--   Admins can create/update draft and published lesson content.
--   Public users can read only published lessons.

create table if not exists public.minna_course_lessons (
  id bigserial primary key,
  course text not null default 'minna',
  lesson_no integer not null check (lesson_no between 1 and 999),
  lesson_id text not null,
  schema_version text not null default 'minna.lesson.v1',
  status text not null default 'draft' check (status in ('draft','published','archived')),
  title_zh text,
  title_en text,
  content jsonb not null,
  version integer not null default 1,
  created_by uuid,
  created_email text,
  updated_by uuid,
  updated_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  unique(course, lesson_no, status)
);

create index if not exists minna_course_lessons_course_lesson_idx
  on public.minna_course_lessons(course, lesson_no);

create index if not exists minna_course_lessons_status_idx
  on public.minna_course_lessons(status);

create index if not exists minna_course_lessons_content_gin_idx
  on public.minna_course_lessons using gin(content);

create or replace function public.minna_course_lessons_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  if new.status = 'published' and old.status is distinct from 'published' then
    new.published_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_minna_course_lessons_updated_at on public.minna_course_lessons;
create trigger trg_minna_course_lessons_updated_at
before update on public.minna_course_lessons
for each row execute function public.minna_course_lessons_touch_updated_at();

-- Admin helper. Assumes public.minna_admins(email, role) exists.
-- If your admins table uses another structure, adjust this function only.
create or replace function public.is_minna_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.minna_admins a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email',''))
  );
$$;

alter table public.minna_course_lessons enable row level security;

-- Public can read published course JSON.
drop policy if exists "Public read published Minna course lessons" on public.minna_course_lessons;
create policy "Public read published Minna course lessons"
on public.minna_course_lessons
for select
to anon, authenticated
using (status = 'published');

-- Admins can read all draft/published/archived records.
drop policy if exists "Admins read all Minna course lessons" on public.minna_course_lessons;
create policy "Admins read all Minna course lessons"
on public.minna_course_lessons
for select
to authenticated
using (public.is_minna_admin());

-- Admins can insert course lessons.
drop policy if exists "Admins insert Minna course lessons" on public.minna_course_lessons;
create policy "Admins insert Minna course lessons"
on public.minna_course_lessons
for insert
to authenticated
with check (public.is_minna_admin());

-- Admins can update course lessons.
drop policy if exists "Admins update Minna course lessons" on public.minna_course_lessons;
create policy "Admins update Minna course lessons"
on public.minna_course_lessons
for update
to authenticated
using (public.is_minna_admin())
with check (public.is_minna_admin());

-- Optional read view for published lessons only.
create or replace view public.minna_published_course_lessons as
select
  course,
  lesson_no,
  lesson_id,
  schema_version,
  title_zh,
  title_en,
  content,
  version,
  updated_at,
  published_at
from public.minna_course_lessons
where status = 'published';

comment on table public.minna_course_lessons is 'Editable JSON course lesson content for Minna v17.';
comment on column public.minna_course_lessons.content is 'Full lesson JSON matching schema minna.lesson.v1.';
