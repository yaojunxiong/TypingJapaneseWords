-- Minna cloud sync: check-in state + mistakes
create table if not exists public.minna_learning_state (
  user_id text primary key,
  user_key text not null,
  user_email text,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists public.minna_learning_mistakes (
  user_id text primary key,
  user_key text not null,
  user_email text,
  mistakes jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists public.minna_learning_checkins (
  user_id text not null,
  checkin_date date not null,
  user_email text,
  streak integer not null default 1,
  xp_total integer not null default 0,
  crowns_total integer not null default 0,
  mistakes_total integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (user_id, checkin_date)
);

alter table public.minna_learning_state enable row level security;
alter table public.minna_learning_mistakes enable row level security;
alter table public.minna_learning_checkins enable row level security;

do $$ begin
  create policy "learning_state_select_own" on public.minna_learning_state
  for select using (auth.uid()::text = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "learning_state_write_own" on public.minna_learning_state
  for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "learning_mistakes_select_own" on public.minna_learning_mistakes
  for select using (auth.uid()::text = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "learning_mistakes_write_own" on public.minna_learning_mistakes
  for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "learning_checkins_select_own" on public.minna_learning_checkins
  for select using (auth.uid()::text = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "learning_checkins_write_own" on public.minna_learning_checkins
  for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);
exception when duplicate_object then null; end $$;
