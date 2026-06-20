create table if not exists public.email_logs (
  id uuid primary key,
  workflow_instance_id uuid references public.workflow_instances(id) on delete set null,
  notification_type text not null,
  recipient_email text not null,
  subject text not null,
  provider text not null default 'brevo_smtp',
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  error_message text,
  sent_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.email_logs enable row level security;

-- Authenticated users (server-side code) can insert email logs
drop policy if exists "email_logs insert authenticated" on public.email_logs;
create policy "email_logs insert authenticated"
  on public.email_logs
  for insert
  to authenticated
  with check (true);

-- Authenticated users (server-side code) can update email logs by id
drop policy if exists "email_logs update authenticated" on public.email_logs;
create policy "email_logs update authenticated"
  on public.email_logs
  for update
  to authenticated
  using (true);

-- Only admins can view email logs (operational data, not user-facing)
drop policy if exists "email_logs select admin" on public.email_logs;
create policy "email_logs select admin"
  on public.email_logs
  for select
  using (public.is_admin_user());

create index if not exists idx_email_logs_workflow_instance_id on public.email_logs(workflow_instance_id);
create index if not exists idx_email_logs_status on public.email_logs(status);
create index if not exists idx_email_logs_created_at on public.email_logs(created_at desc);
