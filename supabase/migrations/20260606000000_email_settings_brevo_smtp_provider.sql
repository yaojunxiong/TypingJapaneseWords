-- Allow brevo_smtp in email_settings provider.
-- This migration only updates the provider check constraint.

alter table public.email_settings
  drop constraint if exists email_settings_provider_check;

alter table public.email_settings
  add constraint email_settings_provider_check
  check (provider in ('mock', 'gmail_gas', 'resend', 'mailtrap_sandbox', 'brevo_smtp'));

notify pgrst, 'reload schema';
