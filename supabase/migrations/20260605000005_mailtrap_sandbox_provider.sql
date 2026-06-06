-- Add Mailtrap Sandbox SMTP provider for development email testing.
-- Run after 20260605000004_email_system_mvp.sql.

alter table public.email_settings
  drop constraint if exists email_settings_provider_check;

alter table public.email_settings
  add constraint email_settings_provider_check
  check (provider in ('mock', 'gmail_gas', 'resend', 'mailtrap_sandbox'));

alter table public.email_logs
  drop constraint if exists email_logs_provider_check;

alter table public.email_logs
  add constraint email_logs_provider_check
  check (provider in ('mock', 'gmail_gas', 'resend', 'mailtrap_sandbox'));

notify pgrst, 'reload schema';
