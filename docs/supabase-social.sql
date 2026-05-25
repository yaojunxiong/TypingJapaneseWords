-- Minna social tables (profile + friends)
create table if not exists public.minna_social_profiles (
  user_id text primary key,
  user_email text,
  nick text,
  bio text,
  goal text,
  avatar_url text,
  updated_at timestamptz default now()
);

create table if not exists public.minna_social_friends (
  owner_user_id text not null,
  owner_email text,
  friend_label text not null,
  created_at timestamptz default now(),
  primary key (owner_user_id, friend_label)
);

alter table public.minna_social_profiles enable row level security;
alter table public.minna_social_friends enable row level security;

do $$ begin
  create policy "profile_select_own" on public.minna_social_profiles for select using (auth.uid()::text = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "profile_upsert_own" on public.minna_social_profiles for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "friends_select_own" on public.minna_social_friends for select using (auth.uid()::text = owner_user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "friends_write_own" on public.minna_social_friends for all using (auth.uid()::text = owner_user_id) with check (auth.uid()::text = owner_user_id);
exception when duplicate_object then null; end $$;
