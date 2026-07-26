create index if not exists ai_simulation_observations_reviewed_by_idx
  on public.ai_simulation_observations (reviewed_by)
  where reviewed_by is not null;

-- One SELECT policy avoids evaluating two permissive policies for every row.
-- Learners still see only their own rows; canonical user_roles administrators
-- additionally see only the human-review queue.
drop policy if exists "administrators read simulation review queue"
  on public.ai_simulation_observations;

drop policy if exists "users read own simulation observations"
  on public.ai_simulation_observations;

create policy "users read own simulation observations"
  on public.ai_simulation_observations
  for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or (
      (select public.is_admin_user())
      and (needs_review = true or review_status = 'pending')
    )
  );

comment on policy "users read own simulation observations"
  on public.ai_simulation_observations is
  'Learners read only their own records; canonical user_roles administrators also read only the review queue.';
