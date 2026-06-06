-- Add Brevo provider value for email settings/logs.
-- This does not modify RLS policies.

alter table public.email_settings
  drop constraint if exists email_settings_provider_check;

alter table public.email_settings
  add constraint email_settings_provider_check
  check (provider in ('mock', 'gmail_gas', 'resend', 'mailtrap_sandbox', 'brevo'));

alter table public.email_logs
  drop constraint if exists email_logs_provider_check;

alter table public.email_logs
  add constraint email_logs_provider_check
  check (provider in ('mock', 'gmail_gas', 'resend', 'mailtrap_sandbox', 'brevo'));

notify pgrst, 'reload schema';
