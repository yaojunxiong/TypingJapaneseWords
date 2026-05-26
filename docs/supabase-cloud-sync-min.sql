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

alter table public.minna_learning_state enable row level security;
alter table public.minna_learning_mistakes enable row level security;

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
