-- Minna AI Learning System admin access
-- Run this in Supabase SQL Editor as project owner/admin.
-- Purpose: allow only selected Google login emails to read visitor logs in the admin page.

create table if not exists public.minna_admins (
  email text primary key,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

-- Add your admin email here. You can add more later.
insert into public.minna_admins (email, role)
values ('yaojunxiong23@icloud.com', 'owner')
on conflict (email) do update set role = excluded.role;

alter table public.minna_admins enable row level security;
alter table public.minna_visitor_logs enable row level security;

-- Admins can read their own admin row.
drop policy if exists "admins can read own admin row" on public.minna_admins;
create policy "admins can read own admin row"
on public.minna_admins
for select
to authenticated
using (lower(email) = lower(auth.jwt() ->> 'email'));

-- Admins can read visitor logs.
drop policy if exists "admins can read visitor logs" on public.minna_visitor_logs;
create policy "admins can read visitor logs"
on public.minna_visitor_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.minna_admins a
    where lower(a.email) = lower(auth.jwt() ->> 'email')
  )
);

-- Keep public insert policy for visitor logs. Recreate safely if needed.
drop policy if exists "allow visitor insert" on public.minna_visitor_logs;
create policy "allow visitor insert"
on public.minna_visitor_logs
for insert
to anon, authenticated
with check (true);

notify pgrst, 'reload schema';

-- Test after logging in as admin:
-- select * from public.minna_admins;
-- select visited_at, user_email, visitor_id, page_path, device_type, language, timezone, referrer
-- from public.minna_visitor_logs
-- order by visited_at desc
-- limit 20;
