create table if not exists public.visitor_activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  email text null,
  path text not null,
  page_type text null,
  lesson_no integer null,
  referrer text null,
  user_agent text null,
  created_at timestamptz not null default now()
);

alter table public.visitor_activity_events enable row level security;

create policy "visitor activity insert anonymous and authenticated"
on public.visitor_activity_events
for insert
to anon, authenticated
with check (
  path <> ''
  and position('?' in path) = 0
  and position('#' in path) = 0
  and (user_id is null or user_id = auth.uid())
  and char_length(path) <= 300
  and (referrer is null or char_length(referrer) <= 300)
  and (user_agent is null or char_length(user_agent) <= 500)
);

create policy "visitor activity admin read"
on public.visitor_activity_events
for select
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'admin'
  )
);

create index if not exists visitor_activity_events_created_at_idx
on public.visitor_activity_events (created_at desc);

create index if not exists visitor_activity_events_user_id_idx
on public.visitor_activity_events (user_id);

create index if not exists visitor_activity_events_path_idx
on public.visitor_activity_events (path);
