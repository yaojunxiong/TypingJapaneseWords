-- review_items: unified table for wrong answers + favorites
-- Used by Review Center (/review)

create table if not exists public.review_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  lesson_no int not null,
  stage text not null,             -- 'vocab' | 'grammar' | 'examples' | 'quiz'
  question_id text not null,       -- unique identifier per lesson+stage+question
  source_type text not null        -- 'wrong_answer' | 'favorite'
    check (source_type in ('wrong_answer', 'favorite')),
  question_text text,
  jp text,                         -- Japanese text (hint/sentence)
  ja text,                         -- alternate Japanese
  zh text,                         -- Chinese translation
  en text,                         -- English translation
  correct_answer text,             -- text of the correct option
  selected_answer text,            -- user's wrong pick (for wrong_answer)
  options jsonb,                   -- full options array
  explanation text,
  review_count int default 0,
  correct_streak int default 0,    -- consecutive correct answers in review mode
  mastered boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_reviewed_at timestamptz
);

-- Unique constraint: one record per user+lesson+stage+question+source
create unique index if not exists review_items_unique_idx
  on public.review_items (user_id, lesson_no, stage, question_id, source_type);

create index if not exists review_items_user_idx
  on public.review_items (user_id);

create index if not exists review_items_lesson_idx
  on public.review_items (user_id, lesson_no);

create index if not exists review_items_source_idx
  on public.review_items (user_id, source_type);

create index if not exists review_items_mastered_idx
  on public.review_items (user_id, mastered);

-- RLS: enable row-level security
alter table public.review_items enable row level security;

-- Policy: users can only read their own review items
create policy "Users can view own review items"
  on public.review_items
  for select
  using (auth.uid() = user_id);

-- Policy: users can insert their own review items
create policy "Users can insert own review items"
  on public.review_items
  for insert
  with check (auth.uid() = user_id);

-- Policy: users can update their own review items
create policy "Users can update own review items"
  on public.review_items
  for update
  using (auth.uid() = user_id);

-- Policy: users can delete their own review items
create policy "Users can delete own review items"
  on public.review_items
  for delete
  using (auth.uid() = user_id);

-- Admin can read all (for debugging)
create policy "Admin can read all review items"
  on public.review_items
  for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role = 'admin'
    )
  );
