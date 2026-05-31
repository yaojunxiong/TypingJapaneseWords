-- ============================================================
-- lesson_drafts: admin edit drafts for course content
-- ============================================================
-- Drafts store per-item edits that overlay the source JSON
-- without modifying the original files. Only admin users can
-- access this table (via public.is_admin() RLS policy).
-- ============================================================

create table if not exists public.lesson_drafts (
  id uuid primary key default gen_random_uuid(),
  lesson_no int not null,
  stage text not null check (stage in ('vocab', 'grammar', 'examples', 'quiz')),
  item_id text not null,            -- matches the "id" field inside each section item
  draft_data jsonb not null,        -- the edited fields (full or partial override)
  status text not null default 'draft'
    check (status in ('draft', 'validated', 'published', 'discarded')),
  message text,                     -- optional admin note
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One active draft per item per lesson+stage
create unique index if not exists lesson_drafts_item_idx
  on public.lesson_drafts (lesson_no, stage, item_id);

create index if not exists lesson_drafts_lesson_idx
  on public.lesson_drafts (lesson_no);

create index if not exists lesson_drafts_status_idx
  on public.lesson_drafts (status);

-- RLS
alter table public.lesson_drafts enable row level security;

-- Admin can do everything
create policy "Admin can select drafts"
  on public.lesson_drafts
  for select
  using (public.is_admin());

create policy "Admin can insert drafts"
  on public.lesson_drafts
  for insert
  with check (public.is_admin());

create policy "Admin can update drafts"
  on public.lesson_drafts
  for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admin can delete drafts"
  on public.lesson_drafts
  for delete
  using (public.is_admin());

-- Auto-update updated_at
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_lesson_drafts_updated_at on public.lesson_drafts;
create trigger trg_lesson_drafts_updated_at
  before update on public.lesson_drafts
  for each row execute function public.touch_updated_at();
