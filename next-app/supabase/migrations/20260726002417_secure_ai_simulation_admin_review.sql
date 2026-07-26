-- Keep learner observations private while enabling the existing user_roles
-- administrator role to read only the human-review queue.

alter table public.ai_simulation_observations
  drop constraint if exists ai_simulation_observations_review_status_check;

alter table public.ai_simulation_observations
  add constraint ai_simulation_observations_review_status_check
  check (
    review_status in (
      'pending',
      'accepted_response',
      'common_error',
      'playful_pattern',
      'emotion_response',
      'ignored',
      'needs_rule',
      'needs_content_fix'
    )
  );

-- The table was created with broad default Data API grants. RLS blocked row
-- access, but these grants still exceeded the operations the product needs.
revoke all privileges on table public.ai_simulation_observations from anon;
revoke all privileges on table public.ai_simulation_observations from authenticated;

grant select on table public.ai_simulation_observations to authenticated;

grant insert (
  user_id,
  lesson_no,
  lesson_id,
  node_id,
  dataset_version,
  learner_input,
  detected_state,
  matched_rule_id,
  hint_level,
  retry_input,
  final_outcome,
  needs_review
) on public.ai_simulation_observations to authenticated;

grant update (
  learner_input,
  detected_state,
  matched_rule_id,
  hint_level,
  retry_input,
  final_outcome,
  updated_at
) on public.ai_simulation_observations to authenticated;

grant select, insert, update, delete
  on table public.ai_simulation_observations
  to service_role;

drop policy if exists "administrators read simulation review queue"
  on public.ai_simulation_observations;

create policy "administrators read simulation review queue"
  on public.ai_simulation_observations
  for select
  to authenticated
  using (
    (select public.is_admin_user())
    and (needs_review = true or review_status = 'pending')
  );

comment on policy "administrators read simulation review queue"
  on public.ai_simulation_observations is
  'Uses the canonical user_roles administrator rule and exposes only rows still in the review queue. Review writes remain server-only.';
