-- Add missing columns to email_logs (table was initially created with minimal columns)
-- These are needed for workflow notification logging.

alter table public.email_logs
  add column if not exists workflow_instance_id uuid references public.workflow_instances(id) on delete set null,
  add column if not exists notification_type text,
  add column if not exists recipient_email text,
  add column if not exists failed_at timestamptz;

-- Ensure RLS policies exist (created in 20260620230000 but table may have existed before)
drop policy if exists "email_logs insert authenticated" on public.email_logs;
create policy "email_logs insert authenticated"
  on public.email_logs
  for insert
  to authenticated
  with check (true);

drop policy if exists "email_logs update authenticated" on public.email_logs;
create policy "email_logs update authenticated"
  on public.email_logs
  for update
  to authenticated
  using (true);

drop policy if exists "email_logs select admin" on public.email_logs;
create policy "email_logs select admin"
  on public.email_logs
  for select
  using (public.is_admin_user());

create index if not exists idx_email_logs_workflow_instance_id on public.email_logs(workflow_instance_id);
create index if not exists idx_email_logs_status on public.email_logs(status);
create index if not exists idx_email_logs_created_at on public.email_logs(created_at desc);
