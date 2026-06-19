create table if not exists public.visitor_flow_block_rules (
  id uuid primary key default gen_random_uuid(),
  flow_type text not null check (flow_type in ('anonymous_visitor', 'logged_in_first_visit', 'all')),
  rule_type text not null check (rule_type in ('email', 'user_id', 'visitor_id', 'ip', 'path', 'user_agent')),
  rule_value text not null,
  enabled boolean not null default true,
  reason text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.visitor_flow_block_rules enable row level security;

create policy "visitor_flow_block_rules admin select"
on public.visitor_flow_block_rules
for select
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'admin'
  )
);

create policy "visitor_flow_block_rules admin insert"
on public.visitor_flow_block_rules
for insert
to authenticated
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'admin'
  )
);

create policy "visitor_flow_block_rules admin update"
on public.visitor_flow_block_rules
for update
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'admin'
  )
);

create policy "visitor_flow_block_rules admin delete"
on public.visitor_flow_block_rules
for delete
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'admin'
  )
);

create index if not exists visitor_flow_block_rules_flow_type_idx
on public.visitor_flow_block_rules (flow_type);

create index if not exists visitor_flow_block_rules_rule_type_idx
on public.visitor_flow_block_rules (rule_type);

create index if not exists visitor_flow_block_rules_enabled_idx
on public.visitor_flow_block_rules (enabled);
