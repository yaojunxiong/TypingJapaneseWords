-- Add metadata jsonb column to email_logs for storing workflow context
-- (definition_key, reference_type, reference_id, review_url, trigger_path, user_email, etc.)

alter table public.email_logs
  add column if not exists metadata jsonb;

create index if not exists idx_email_logs_notification_type on public.email_logs(notification_type);
create index if not exists idx_email_logs_metadata on public.email_logs using gin (metadata);
