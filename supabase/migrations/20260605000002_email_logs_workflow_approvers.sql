-- Email notification logs and workflow approver fields.
-- Run this once in Supabase SQL Editor after forum review flow migration.

create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  workflow_type text null,
  reference_type text null,
  reference_id uuid null,
  to_email text not null,
  subject text not null,
  body text null,
  provider text not null default 'mock',
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed')),
  error_message text null,
  sent_at timestamptz null,
  created_by uuid null references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists email_logs_reference_idx
  on public.email_logs (reference_type, reference_id, created_at desc);

create index if not exists email_logs_status_idx
  on public.email_logs (status, created_at desc);

alter table public.email_logs enable row level security;

drop policy if exists email_logs_admin_select on public.email_logs;
create policy email_logs_admin_select
on public.email_logs for select
to authenticated
using (public.is_admin_user());

drop policy if exists email_logs_authenticated_insert on public.email_logs;
create policy email_logs_authenticated_insert
on public.email_logs for insert
to authenticated
with check (created_by = auth.uid() or public.is_admin_user());

drop policy if exists email_logs_owner_or_admin_update on public.email_logs;
create policy email_logs_owner_or_admin_update
on public.email_logs for update
to authenticated
using (created_by = auth.uid() or public.is_admin_user())
with check (created_by = auth.uid() or public.is_admin_user());

alter table public.workflow_nodes
  add column if not exists approver_user_id uuid references auth.users(id) on delete set null;

alter table public.workflow_nodes
  add column if not exists approver_role text;

alter table public.workflow_nodes
  add column if not exists approver_email text;

create or replace function public.forum_admin_notification_emails()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    array_agg(distinct email) filter (where email is not null and email <> ''),
    array['yaojunxiong23@gmail.com']::text[]
  )
  from (
    select lower(ur.email) as email
    from public.user_roles ur
    where ur.role = 'admin'
    union
    select 'yaojunxiong23@gmail.com'
  ) admins;
$$;

notify pgrst, 'reload schema';
