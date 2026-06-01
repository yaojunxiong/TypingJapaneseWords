-- Fix user_roles RLS recursion and keep default admin.
-- Run in Supabase SQL editor as project owner.

create table if not exists public.user_roles (
  user_id uuid primary key,
  email text,
  role text not null default 'normal' check (role in ('normal', 'member', 'vip', 'admin')),
  vip_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.user_roles_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_roles_updated_at on public.user_roles;
create trigger trg_user_roles_updated_at
before update on public.user_roles
for each row execute function public.user_roles_touch_updated_at();

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'admin'
  );
$$;

alter table public.user_roles enable row level security;

drop policy if exists user_roles_select_self on public.user_roles;
create policy user_roles_select_self
on public.user_roles
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists user_roles_select_admin on public.user_roles;
create policy user_roles_select_admin
on public.user_roles
for select
to authenticated
using (public.is_admin_user());

drop policy if exists user_roles_insert_admin on public.user_roles;
create policy user_roles_insert_admin
on public.user_roles
for insert
to authenticated
with check (public.is_admin_user());

drop policy if exists user_roles_update_admin on public.user_roles;
create policy user_roles_update_admin
on public.user_roles
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

insert into public.user_roles (user_id, email, role)
select u.id, 'yaojunxiong23@gmail.com', 'admin'
from auth.users u
where lower(u.email) = 'yaojunxiong23@gmail.com'
on conflict (user_id)
do update set
  email = excluded.email,
  role = 'admin',
  updated_at = now();

notify pgrst, 'reload schema';
