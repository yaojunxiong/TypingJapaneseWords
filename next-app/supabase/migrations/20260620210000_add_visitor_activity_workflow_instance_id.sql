alter table public.visitor_activity_events
add column if not exists workflow_instance_id uuid null references public.workflow_instances(id);

create index if not exists visitor_activity_events_workflow_instance_id_idx
on public.visitor_activity_events (workflow_instance_id);

drop policy if exists "visitor activity self workflow update"
on public.visitor_activity_events;

create policy "visitor activity self workflow update"
on public.visitor_activity_events
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
