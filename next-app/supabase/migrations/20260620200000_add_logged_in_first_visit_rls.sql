-- Extend workflow RLS policies to allow logged_in_first_visit reference_type
-- in addition to the existing study_visitor.

drop policy if exists workflow_instances_read on public.workflow_instances;
create policy workflow_instances_read on public.workflow_instances for select using (
  public.is_admin_user()
  or exists (
    select 1 from public.membership_requests mr
    where mr.workflow_instance_id = workflow_instances.id and mr.user_id = auth.uid()
  )
  or (reference_type in ('study_visitor', 'logged_in_first_visit') and reference_id = auth.uid())
);

drop policy if exists workflow_instances_insert on public.workflow_instances;
create policy workflow_instances_insert on public.workflow_instances for insert to authenticated
with check (
  public.is_admin_user()
  or reference_type in ('study_visitor', 'logged_in_first_visit')
);

drop policy if exists workflow_tasks_read on public.workflow_tasks;
create policy workflow_tasks_read on public.workflow_tasks for select using (
  public.is_admin_user()
  or exists (
    select 1 from public.membership_requests mr
    where mr.workflow_instance_id = workflow_tasks.workflow_instance_id and mr.user_id = auth.uid()
  )
  or exists (
    select 1 from public.workflow_instances wi
    where wi.id = workflow_tasks.workflow_instance_id
      and wi.reference_type in ('study_visitor', 'logged_in_first_visit')
      and wi.reference_id = auth.uid()
  )
);

drop policy if exists workflow_tasks_insert on public.workflow_tasks;
create policy workflow_tasks_insert on public.workflow_tasks for insert to authenticated
with check (
  public.is_admin_user()
  or exists (
    select 1 from public.workflow_instances wi
    where wi.id = workflow_tasks.workflow_instance_id
      and wi.reference_type in ('study_visitor', 'logged_in_first_visit')
  )
);

drop policy if exists workflow_actions_read on public.workflow_actions;
create policy workflow_actions_read on public.workflow_actions for select using (
  public.is_admin_user()
  or exists (
    select 1 from public.membership_requests mr
    where mr.workflow_instance_id = workflow_actions.workflow_instance_id and mr.user_id = auth.uid()
  )
  or exists (
    select 1 from public.workflow_instances wi
    where wi.id = workflow_actions.workflow_instance_id
      and wi.reference_type in ('study_visitor', 'logged_in_first_visit')
      and wi.reference_id = auth.uid()
  )
);

drop policy if exists workflow_actions_insert on public.workflow_actions;
create policy workflow_actions_insert on public.workflow_actions for insert to authenticated
with check (
  public.is_admin_user()
  or exists (
    select 1 from public.workflow_instances wi
    where wi.id = workflow_actions.workflow_instance_id
      and wi.reference_type in ('study_visitor', 'logged_in_first_visit')
  )
);
