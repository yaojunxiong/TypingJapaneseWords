-- Allow authenticated users to SELECT workflow metadata for visitor workflows
-- (study_visitor, logged_in_first_visit).
-- Admin policies remain unchanged; only SELECT is added for authenticated.

drop policy if exists "workflow definitions visitor read" on public.workflow_definitions;
create policy "workflow definitions visitor read"
  on public.workflow_definitions
  for select
  to authenticated
  using (definition_key in ('study_visitor', 'logged_in_first_visit'));

drop policy if exists "workflow versions visitor read" on public.workflow_versions;
create policy "workflow versions visitor read"
  on public.workflow_versions
  for select
  to authenticated
  using (
    status = 'active'
    and exists (
      select 1 from public.workflow_definitions d
      where d.id = workflow_versions.definition_id
        and d.definition_key in ('study_visitor', 'logged_in_first_visit')
    )
  );

drop policy if exists "workflow nodes visitor read" on public.workflow_nodes;
create policy "workflow nodes visitor read"
  on public.workflow_nodes
  for select
  to authenticated
  using (
    exists (
      select 1 from public.workflow_versions v
      join public.workflow_definitions d on d.id = v.definition_id
      where v.id = workflow_nodes.workflow_version_id
        and v.status = 'active'
        and d.definition_key in ('study_visitor', 'logged_in_first_visit')
    )
  );

drop policy if exists "workflow transitions visitor read" on public.workflow_transitions;
create policy "workflow transitions visitor read"
  on public.workflow_transitions
  for select
  to authenticated
  using (
    exists (
      select 1 from public.workflow_versions v
      join public.workflow_definitions d on d.id = v.definition_id
      where v.id = workflow_transitions.workflow_version_id
        and v.status = 'active'
        and d.definition_key in ('study_visitor', 'logged_in_first_visit')
    )
  );
