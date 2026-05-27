-- Minna Next learning progress and mistakes sync
-- Run this in the Supabase SQL Editor for the TypingJapaneseWords project.

create table if not exists public.minna_learning_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  user_key text not null,
  user_email text,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.minna_learning_mistakes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  user_key text not null,
  user_email text,
  mistakes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.minna_learning_checkins (
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text,
  checkin_date date not null,
  streak integer not null default 1,
  xp_total integer not null default 0,
  crowns_total integer not null default 0,
  mistakes_total integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, checkin_date)
);

create or replace function public.minna_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_minna_learning_state_updated_at on public.minna_learning_state;
create trigger trg_minna_learning_state_updated_at
before update on public.minna_learning_state
for each row execute function public.minna_touch_updated_at();

drop trigger if exists trg_minna_learning_mistakes_updated_at on public.minna_learning_mistakes;
create trigger trg_minna_learning_mistakes_updated_at
before update on public.minna_learning_mistakes
for each row execute function public.minna_touch_updated_at();

drop trigger if exists trg_minna_learning_checkins_updated_at on public.minna_learning_checkins;
create trigger trg_minna_learning_checkins_updated_at
before update on public.minna_learning_checkins
for each row execute function public.minna_touch_updated_at();

alter table public.minna_learning_state enable row level security;
alter table public.minna_learning_mistakes enable row level security;
alter table public.minna_learning_checkins enable row level security;

drop policy if exists "Users read own Minna learning state" on public.minna_learning_state;
create policy "Users read own Minna learning state"
on public.minna_learning_state
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users upsert own Minna learning state" on public.minna_learning_state;
create policy "Users upsert own Minna learning state"
on public.minna_learning_state
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users update own Minna learning state" on public.minna_learning_state;
create policy "Users update own Minna learning state"
on public.minna_learning_state
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users read own Minna mistakes" on public.minna_learning_mistakes;
create policy "Users read own Minna mistakes"
on public.minna_learning_mistakes
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users upsert own Minna mistakes" on public.minna_learning_mistakes;
create policy "Users upsert own Minna mistakes"
on public.minna_learning_mistakes
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users update own Minna mistakes" on public.minna_learning_mistakes;
create policy "Users update own Minna mistakes"
on public.minna_learning_mistakes
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users read own Minna checkins" on public.minna_learning_checkins;
create policy "Users read own Minna checkins"
on public.minna_learning_checkins
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users insert own Minna checkins" on public.minna_learning_checkins;
create policy "Users insert own Minna checkins"
on public.minna_learning_checkins
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users update own Minna checkins" on public.minna_learning_checkins;
create policy "Users update own Minna checkins"
on public.minna_learning_checkins
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists idx_minna_learning_state_email on public.minna_learning_state (lower(user_email));
create index if not exists idx_minna_learning_mistakes_email on public.minna_learning_mistakes (lower(user_email));
create index if not exists idx_minna_learning_checkins_date on public.minna_learning_checkins (checkin_date desc);
