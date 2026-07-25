create table if not exists public.ai_simulation_observations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_no integer not null check (lesson_no between 1 and 50),
  lesson_id text not null,
  node_id text not null,
  dataset_version text not null default '1.0.0',
  learner_input text not null default '',
  detected_state text not null check (detected_state in ('fluent', 'partial', 'weak', 'blank', 'off_topic_playful')),
  matched_rule_id text,
  hint_level integer not null default 0 check (hint_level between 0 and 6),
  retry_input text,
  final_outcome text not null default 'pending' check (final_outcome in ('pending', 'success', 'partial', 'skipped', 'abandoned')),
  needs_review boolean not null default false,
  review_status text not null default 'pending' check (review_status in ('pending', 'accepted_response', 'common_error', 'playful_pattern', 'emotion_response', 'ignored')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_simulation_observations_user_created_idx
  on public.ai_simulation_observations (user_id, created_at desc);

create index if not exists ai_simulation_observations_review_idx
  on public.ai_simulation_observations (needs_review, review_status, created_at desc);

alter table public.ai_simulation_observations enable row level security;

create policy "users insert own simulation observations"
  on public.ai_simulation_observations
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users read own simulation observations"
  on public.ai_simulation_observations
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users update own pending simulation observations"
  on public.ai_simulation_observations
  for update
  to authenticated
  using (auth.uid() = user_id and review_status = 'pending')
  with check (auth.uid() = user_id);

comment on table public.ai_simulation_observations is
  'Private learner observations from the structured AI dialogue simulation. Raw learner text must not be promoted into shared teaching data without anonymization and human review.';
