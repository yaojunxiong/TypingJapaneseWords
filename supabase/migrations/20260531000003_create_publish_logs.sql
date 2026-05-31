-- ============================================================
-- Add ready_to_publish status to lesson_drafts
-- ============================================================
alter table public.lesson_drafts
  drop constraint if exists lesson_drafts_status_check;

alter table public.lesson_drafts
  add constraint lesson_drafts_status_check
  check (status in ('draft', 'validated', 'ready_to_publish', 'published', 'discarded'));

-- ============================================================
-- lesson_publish_logs: record of publish operations
-- ============================================================
create table if not exists public.lesson_publish_logs (
  id uuid primary key default gen_random_uuid(),
  published_by uuid references auth.users(id),
  draft_ids uuid[] not null,
  summary jsonb,           -- { lessons: [1,2,...], stages: [...], items: [...] }
  diff jsonb,              -- array of { lesson_no, stage, item_id, field, old, new }
  commit_hash text,
  deploy_url text,
  status text not null default 'pending'
    check (status in ('pending', 'success', 'failed')),
  error_message text,
  created_at timestamptz not null default now()
);

alter table public.lesson_publish_logs enable row level security;

create policy "Admin can select publish logs"
  on public.lesson_publish_logs
  for select
  using (public.is_admin());

create policy "Admin can insert publish logs"
  on public.lesson_publish_logs
  for insert
  with check (public.is_admin());

create policy "Admin can update publish logs"
  on public.lesson_publish_logs
  for update
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists lesson_publish_logs_created_idx
  on public.lesson_publish_logs (created_at desc);
