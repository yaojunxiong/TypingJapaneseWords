create table if not exists public.membership_levels (
  level_code text primary key,
  title text not null,
  sort_order integer not null default 0,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.membership_levels (level_code, title, sort_order, is_enabled)
values
  ('free', 'Free', 0, true),
  ('vip1', 'VIP 1', 1, true),
  ('vip2', 'VIP 2', 2, true),
  ('vip3', 'VIP 3', 3, true)
on conflict (level_code) do update
set title = excluded.title,
    sort_order = excluded.sort_order,
    is_enabled = excluded.is_enabled;

create table if not exists public.user_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  level text not null default 'free' references public.membership_levels(level_code),
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.membership_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  current_level text not null default 'free' references public.membership_levels(level_code),
  requested_level text not null references public.membership_levels(level_code),
  reason text null,
  status text not null default 'pending',
  reviewed_by uuid null references auth.users(id) on delete set null,
  reviewed_at timestamptz null,
  review_note text null,
  reject_reason text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.membership_requests
  add column if not exists current_level text;
alter table public.membership_requests
  add column if not exists requested_level text;
alter table public.membership_requests
  add column if not exists review_note text;
alter table public.membership_requests
  add column if not exists reviewed_by uuid;
alter table public.membership_requests
  add column if not exists reviewed_at timestamptz;
alter table public.membership_requests
  add column if not exists reject_reason text;

update public.membership_requests
set current_level = coalesce(current_level, 'free')
where current_level is null;

alter table public.membership_requests
  alter column current_level set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'membership_requests_current_level_fk'
  ) then
    alter table public.membership_requests
      add constraint membership_requests_current_level_fk
      foreign key (current_level) references public.membership_levels(level_code);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'membership_requests_requested_level_fk'
  ) then
    alter table public.membership_requests
      add constraint membership_requests_requested_level_fk
      foreign key (requested_level) references public.membership_levels(level_code);
  end if;
end $$;

alter table public.membership_requests enable row level security;
alter table public.user_memberships enable row level security;
alter table public.membership_levels enable row level security;

drop policy if exists membership_levels_select_all on public.membership_levels;
create policy membership_levels_select_all
  on public.membership_levels
  for select
  using (true);

drop policy if exists user_memberships_self_read on public.user_memberships;
create policy user_memberships_self_read
  on public.user_memberships
  for select
  using (auth.uid() = user_id or public.is_admin_user());

drop policy if exists user_memberships_self_upsert on public.user_memberships;
create policy user_memberships_self_upsert
  on public.user_memberships
  for insert
  with check (auth.uid() = user_id or public.is_admin_user());

drop policy if exists user_memberships_admin_update on public.user_memberships;
create policy user_memberships_admin_update
  on public.user_memberships
  for update
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists membership_requests_self_create on public.membership_requests;
create policy membership_requests_self_create
  on public.membership_requests
  for insert
  with check (auth.uid() = user_id);

drop policy if exists membership_requests_self_read on public.membership_requests;
create policy membership_requests_self_read
  on public.membership_requests
  for select
  using (auth.uid() = user_id or public.is_admin_user());

drop policy if exists membership_requests_admin_update on public.membership_requests;
create policy membership_requests_admin_update
  on public.membership_requests
  for update
  using (public.is_admin_user())
  with check (public.is_admin_user());
