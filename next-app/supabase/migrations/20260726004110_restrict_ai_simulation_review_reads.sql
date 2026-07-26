-- Keep cross-user review reads behind the server-only service-role client.
-- Authenticated browser sessions, including administrator sessions, may read only
-- their own observations.

drop policy if exists "administrators read simulation review queue"
  on public.ai_simulation_observations;

drop policy if exists "users read own simulation observations"
  on public.ai_simulation_observations;

create policy "users read own simulation observations"
  on public.ai_simulation_observations
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

comment on policy "users read own simulation observations"
  on public.ai_simulation_observations is
  'Learners and administrators read only their own records through authenticated Data API sessions. Cross-user review reads require the server-only service-role client after application-level administrator authorization.';
