-- ============================================================
-- Add resolved_at to review_items for soft-delete
-- Create user_attempts for attempt history tracking
-- Fix admin RLS on review_items (enable admin update/delete)
-- ============================================================

-- ============================================================
-- 1. Add resolved_at to review_items
-- ============================================================
alter table if exists public.review_items
  add column if not exists resolved_at timestamptz;

-- When using resolved_at instead of mastered:
--   wrong_answer records: resolved_at IS NULL → unresolved (in review queue)
--                          resolved_at IS NOT NULL → resolved (removed from queue)
--   favorite records: resolved_at not used

create index if not exists review_items_resolved_idx
  on public.review_items (user_id, resolved_at)
  where source_type = 'wrong_answer';

-- ============================================================
-- 2. Create user_attempts table
-- ============================================================
create table if not exists public.user_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_no int not null,
  item_type text not null,           -- 'vocab' | 'grammar' | 'examples' | 'quiz'
  item_id text not null,             -- unique identifier for the item
  mode text not null default 'practice' check (mode in ('practice', 'review', 'quiz')),
  is_correct boolean not null,
  user_answer text,
  correct_answer text,
  created_at timestamptz not null default now()
);

-- Indexes for querying attempt history
create index if not exists user_attempts_user_idx
  on public.user_attempts (user_id, created_at desc);

create index if not exists user_attempts_lesson_idx
  on public.user_attempts (user_id, lesson_no);

-- ============================================================
-- 3. RLS for user_attempts
-- ============================================================
alter table public.user_attempts enable row level security;

-- Users can read own attempts
create policy "Users can view own attempts"
  on public.user_attempts
  for select
  using (auth.uid() = user_id);

-- Users can insert own attempts
create policy "Users can insert own attempts"
  on public.user_attempts
  for insert
  with check (auth.uid() = user_id);

-- Admin can read all attempts
create policy "Admin can read all attempts"
  on public.user_attempts
  for select
  using (auth.uid() = user_id or public.is_admin());

-- ============================================================
-- 4. Fix admin RLS on review_items — also allow admin update/delete
-- ============================================================
drop policy if exists "Admin can update all review items" on public.review_items;
create policy "Admin can update all review items"
  on public.review_items
  for update
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Admin can delete all review items" on public.review_items;
create policy "Admin can delete all review items"
  on public.review_items
  for delete
  using (auth.uid() = user_id or public.is_admin());
