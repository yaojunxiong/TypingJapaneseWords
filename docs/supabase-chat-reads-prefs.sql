-- Minna chat enhancement: cloud thread prefs + read receipts

create table if not exists public.minna_chat_thread_prefs (
  thread_id bigint not null references public.minna_chat_threads(id) on delete cascade,
  user_id text not null,
  pinned boolean not null default false,
  muted boolean not null default false,
  updated_at timestamptz default now(),
  primary key (thread_id, user_id)
);

create table if not exists public.minna_chat_reads (
  thread_id bigint not null references public.minna_chat_threads(id) on delete cascade,
  user_id text not null,
  last_read_at timestamptz not null default now(),
  updated_at timestamptz default now(),
  primary key (thread_id, user_id)
);

alter table public.minna_chat_thread_prefs enable row level security;
alter table public.minna_chat_reads enable row level security;

do $$ begin
  create policy "chat_prefs_select_own" on public.minna_chat_thread_prefs for select using (
    user_id = auth.uid()::text
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "chat_prefs_write_own" on public.minna_chat_thread_prefs for all using (
    user_id = auth.uid()::text and exists(
      select 1 from public.minna_chat_participants p
      where p.thread_id = minna_chat_thread_prefs.thread_id and p.user_id = auth.uid()::text
    )
  ) with check (
    user_id = auth.uid()::text and exists(
      select 1 from public.minna_chat_participants p
      where p.thread_id = minna_chat_thread_prefs.thread_id and p.user_id = auth.uid()::text
    )
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "chat_reads_select_member" on public.minna_chat_reads for select using (
    exists(
      select 1 from public.minna_chat_participants p
      where p.thread_id = minna_chat_reads.thread_id and p.user_id = auth.uid()::text
    )
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "chat_reads_write_own" on public.minna_chat_reads for all using (
    user_id = auth.uid()::text and exists(
      select 1 from public.minna_chat_participants p
      where p.thread_id = minna_chat_reads.thread_id and p.user_id = auth.uid()::text
    )
  ) with check (
    user_id = auth.uid()::text and exists(
      select 1 from public.minna_chat_participants p
      where p.thread_id = minna_chat_reads.thread_id and p.user_id = auth.uid()::text
    )
  );
exception when duplicate_object then null; end $$;
