-- Admin configurable email settings, templates, and logs.
-- Run after 20260605000002_email_logs_workflow_approvers.sql.

create table if not exists public.email_settings (
  id integer primary key default 1 check (id = 1),
  enabled boolean not null default false,
  provider text not null default 'mock'
    check (provider in ('mock', 'gmail_gas', 'resend')),
  from_name text not null default 'Minna Learning',
  from_email text,
  admin_email text,
  gas_webhook_url text,
  resend_from_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.email_settings (id)
values (1)
on conflict (id) do nothing;

create table if not exists public.email_templates (
  template_key text primary key,
  title text not null,
  subject text not null,
  body text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.email_logs add column if not exists template_key text;
alter table public.email_logs add column if not exists workflow_type text;
alter table public.email_logs add column if not exists reference_type text;
alter table public.email_logs add column if not exists reference_id uuid;
alter table public.email_logs add column if not exists body text;
alter table public.email_logs add column if not exists created_by uuid references auth.users(id) on delete set null default auth.uid();

create index if not exists email_logs_template_idx
  on public.email_logs (template_key, created_at desc);

insert into public.email_templates (template_key, title, subject, body, enabled)
values
  (
    'forum_post_pending_admin',
    '论坛帖子待审核 - 通知管理员',
    '论坛帖子待审核：{{post_title}}',
    '有新的论坛帖子等待审核。\n\n标题：{{post_title}}\n作者：{{user_name}}\n提交时间：{{created_at}}\n\n审核入口：{{admin_url}}\n帖子地址：{{post_url}}\n\n{{site_name}}',
    true
  ),
  (
    'forum_post_approved_author',
    '论坛帖子已通过 - 通知作者',
    '你的论坛帖子已通过审核：{{post_title}}',
    '你的论坛帖子已通过审核并公开展示。\n\n标题：{{post_title}}\n帖子地址：{{post_url}}\n\n{{site_name}}',
    true
  ),
  (
    'forum_post_rejected_author',
    '论坛帖子已拒绝 - 通知作者',
    '你的论坛帖子未通过审核：{{post_title}}',
    '你的论坛帖子未通过审核。\n\n标题：{{post_title}}\n审核备注：{{review_note}}\n帖子地址：{{post_url}}\n\n{{site_name}}',
    true
  )
on conflict (template_key) do update
set title = excluded.title,
    subject = excluded.subject,
    body = excluded.body,
    enabled = excluded.enabled,
    updated_at = now();

create or replace function public.email_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_email_settings_updated_at on public.email_settings;
create trigger trg_email_settings_updated_at
before update on public.email_settings
for each row execute function public.email_touch_updated_at();

drop trigger if exists trg_email_templates_updated_at on public.email_templates;
create trigger trg_email_templates_updated_at
before update on public.email_templates
for each row execute function public.email_touch_updated_at();

alter table public.email_settings enable row level security;
alter table public.email_templates enable row level security;
alter table public.email_logs enable row level security;

drop policy if exists email_settings_admin_rw on public.email_settings;
create policy email_settings_admin_rw
on public.email_settings for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists email_templates_admin_rw on public.email_templates;
create policy email_templates_admin_rw
on public.email_templates for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

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

notify pgrst, 'reload schema';
