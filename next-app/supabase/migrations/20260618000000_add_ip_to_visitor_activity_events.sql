alter table public.visitor_activity_events
add column if not exists ip text null;
