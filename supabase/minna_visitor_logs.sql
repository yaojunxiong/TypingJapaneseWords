-- Minna AI Learning System visitor logs
-- Run this in Supabase SQL Editor as project owner/admin.
-- Privacy note: this table is for admin analytics. Do not expose it directly on public pages.

create table if not exists public.minna_visitor_logs (
  id bigserial primary key,
  visitor_id text not null,
  user_id uuid null,
  user_email text null,
  page_path text null,
  page_title text null,
  referrer text null,
  user_agent text null,
  language text null,
  timezone text null,
  screen_width int null,
  screen_height int null,
  viewport_width int null,
  viewport_height int null,
  device_type text null,
  visit_source text null,
  visited_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.minna_visitor_logs enable row level security;

-- Allow anonymous and logged-in visitors to insert their visit record.
drop policy if exists "allow visitor insert" on public.minna_visitor_logs;
create policy "allow visitor insert"
on public.minna_visitor_logs
for insert
to anon, authenticated
with check (true);

-- Do not create a public SELECT policy. Admin can query in Supabase SQL Editor.
-- If you need an admin dashboard later, create a restricted admin-only view.

create index if not exists idx_minna_visitor_logs_visited_at on public.minna_visitor_logs (visited_at desc);
create index if not exists idx_minna_visitor_logs_visitor_id on public.minna_visitor_logs (visitor_id);
create index if not exists idx_minna_visitor_logs_user_email on public.minna_visitor_logs (user_email);
create index if not exists idx_minna_visitor_logs_page_path on public.minna_visitor_logs (page_path);

-- Useful admin queries:
-- 1) Recent visits
-- select visited_at, user_email, visitor_id, page_path, device_type, language, timezone, referrer
-- from public.minna_visitor_logs
-- order by visited_at desc
-- limit 100;

-- 2) Daily unique visitors
-- select date_trunc('day', visited_at) as day, count(*) as visits, count(distinct visitor_id) as unique_visitors
-- from public.minna_visitor_logs
-- group by 1
-- order by 1 desc;

-- 3) Logged-in Google users
-- select user_email, count(*) as visits, max(visited_at) as last_visit
-- from public.minna_visitor_logs
-- where user_email is not null and user_email <> ''
-- group by user_email
-- order by last_visit desc;

-- 4) Popular pages
-- select page_path, count(*) as visits, count(distinct visitor_id) as unique_visitors
-- from public.minna_visitor_logs
-- group by page_path
-- order by visits desc;
