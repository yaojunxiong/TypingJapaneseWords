alter table public.visitor_activity_events
add column if not exists is_admin boolean not null default false;

alter table public.visitor_activity_events
add column if not exists workflow_skip_reason text null;
