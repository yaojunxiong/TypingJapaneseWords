-- Allow brevo_smtp in public.email_logs.provider.
-- This migration only updates the email_logs provider check constraint.

alter table public.email_logs
  drop constraint if exists email_logs_provider_check;

alter table public.email_logs
  add constraint email_logs_provider_check
  check (provider in ('mock', 'gmail_gas', 'resend', 'mailtrap_sandbox', 'brevo_smtp'));

notify pgrst, 'reload schema';
