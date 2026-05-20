-- Minna Course Version History v19.5
-- Run this in Supabase SQL Editor.
-- Purpose: keep a snapshot every time admin saves draft or publishes course content.

create table if not exists public.minna_course_lesson_versions (
  id uuid primary key default gen_random_uuid(),
  course text not null default 'minna',
  lesson_no int not null,
  lesson_id text not null,
  status text not null check (status in ('draft','published','rollback')),
  version int not null default 1,
  schema_version text not null default 'minna.lesson.v1',
  title_zh text,
  title_en text,
  content jsonb not null,
  source_action text not null default 'save',
  source_version_id uuid,
  created_by uuid,
  created_email text,
  created_at timestamptz not null default now()
);

create index if not exists minna_course_lesson_versions_course_lesson_idx
  on public.minna_course_lesson_versions(course, lesson_no, created_at desc);

create index if not exists minna_course_lesson_versions_status_idx
  on public.minna_course_lesson_versions(course, lesson_no, status, version desc);

alter table public.minna_course_lesson_versions enable row level security;

-- Admins can read version history.
drop policy if exists minna_course_versions_admin_select on public.minna_course_lesson_versions;
create policy minna_course_versions_admin_select
on public.minna_course_lesson_versions
for select
using (
  exists (
    select 1 from public.minna_admins a
    where a.email = auth.jwt() ->> 'email'
  )
);

-- Admins can insert version history.
drop policy if exists minna_course_versions_admin_insert on public.minna_course_lesson_versions;
create policy minna_course_versions_admin_insert
on public.minna_course_lesson_versions
for insert
with check (
  exists (
    select 1 from public.minna_admins a
    where a.email = auth.jwt() ->> 'email'
  )
);

-- Optional admin view for easier inspection.
create or replace view public.minna_course_version_history_admin as
select
  id,
  course,
  lesson_no,
  lesson_id,
  status,
  version,
  schema_version,
  title_zh,
  title_en,
  source_action,
  source_version_id,
  created_email,
  created_at,
  jsonb_array_length(coalesce(content -> 'sections', '[]'::jsonb)) as section_count
from public.minna_course_lesson_versions
order by lesson_no, created_at desc;
