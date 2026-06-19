-- Allow authenticated users to SELECT their own visitor_activity_events
-- Needed so that authenticated non-admin users can read back the inserted
-- record id and update workflow_skip_reason after the fact.

create policy "visitor activity self read"
on public.visitor_activity_events
for select
to authenticated
using (
  user_id = auth.uid()
);
