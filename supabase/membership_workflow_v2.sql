create table if not exists public.workflow_definitions (
  id uuid primary key default gen_random_uuid(),
  definition_key text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.workflow_versions (
  id uuid primary key default gen_random_uuid(),
  definition_id uuid not null references public.workflow_definitions(id) on delete cascade,
  version_number integer not null,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  published_at timestamptz null,
  unique (definition_id, version_number)
);

create table if not exists public.workflow_nodes (
  id uuid primary key default gen_random_uuid(),
  workflow_version_id uuid not null references public.workflow_versions(id) on delete cascade,
  node_key text not null,
  node_name text not null,
  node_type text not null,
  order_index integer not null default 0,
  assignee_type text null,
  assignee_value text null,
  approval_mode text null default 'any',
  unique (workflow_version_id, node_key)
);

create table if not exists public.workflow_transitions (
  id uuid primary key default gen_random_uuid(),
  workflow_version_id uuid not null references public.workflow_versions(id) on delete cascade,
  from_node_key text not null,
  to_node_key text not null,
  action text not null
);

create table if not exists public.workflow_instances (
  id uuid primary key default gen_random_uuid(),
  workflow_version_id uuid not null references public.workflow_versions(id),
  reference_type text not null,
  reference_id uuid not null,
  current_node_key text null,
  status text not null default 'running',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workflow_tasks (
  id uuid primary key default gen_random_uuid(),
  workflow_instance_id uuid not null references public.workflow_instances(id) on delete cascade,
  workflow_version_id uuid not null references public.workflow_versions(id),
  node_key text not null,
  node_name text not null,
  assignee_type text null,
  assignee_value text null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  completed_at timestamptz null,
  completed_by uuid null references auth.users(id) on delete set null
);

create table if not exists public.workflow_actions (
  id uuid primary key default gen_random_uuid(),
  workflow_instance_id uuid not null references public.workflow_instances(id) on delete cascade,
  workflow_version_id uuid not null references public.workflow_versions(id),
  actor_user_id uuid null references auth.users(id) on delete set null,
  action text not null,
  from_node_key text null,
  to_node_key text null,
  comment text null,
  created_at timestamptz not null default now()
);

alter table public.membership_requests
  add column if not exists workflow_version_id uuid;
alter table public.membership_requests
  add column if not exists workflow_instance_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'membership_requests_workflow_version_fk') then
    alter table public.membership_requests
      add constraint membership_requests_workflow_version_fk
      foreign key (workflow_version_id) references public.workflow_versions(id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'membership_requests_workflow_instance_fk') then
    alter table public.membership_requests
      add constraint membership_requests_workflow_instance_fk
      foreign key (workflow_instance_id) references public.workflow_instances(id);
  end if;
end $$;

alter table public.workflow_definitions enable row level security;
alter table public.workflow_versions enable row level security;
alter table public.workflow_nodes enable row level security;
alter table public.workflow_transitions enable row level security;
alter table public.workflow_instances enable row level security;
alter table public.workflow_tasks enable row level security;
alter table public.workflow_actions enable row level security;

drop policy if exists workflow_definitions_admin_rw on public.workflow_definitions;
create policy workflow_definitions_admin_rw on public.workflow_definitions for all using (public.is_admin_user()) with check (public.is_admin_user());

drop policy if exists workflow_versions_admin_rw on public.workflow_versions;
create policy workflow_versions_admin_rw on public.workflow_versions for all using (public.is_admin_user()) with check (public.is_admin_user());

drop policy if exists workflow_nodes_admin_rw on public.workflow_nodes;
create policy workflow_nodes_admin_rw on public.workflow_nodes for all using (public.is_admin_user()) with check (public.is_admin_user());

drop policy if exists workflow_transitions_admin_rw on public.workflow_transitions;
create policy workflow_transitions_admin_rw on public.workflow_transitions for all using (public.is_admin_user()) with check (public.is_admin_user());

drop policy if exists workflow_instances_admin_or_owner_read on public.workflow_instances;
create policy workflow_instances_admin_or_owner_read on public.workflow_instances for select using (
  public.is_admin_user() or exists (
    select 1 from public.membership_requests mr
    where mr.workflow_instance_id = workflow_instances.id and mr.user_id = auth.uid()
  )
);

drop policy if exists workflow_instances_admin_update on public.workflow_instances;
create policy workflow_instances_admin_update on public.workflow_instances for all using (public.is_admin_user()) with check (public.is_admin_user());

drop policy if exists workflow_tasks_admin_or_owner_read on public.workflow_tasks;
create policy workflow_tasks_admin_or_owner_read on public.workflow_tasks for select using (
  public.is_admin_user() or exists (
    select 1 from public.membership_requests mr
    where mr.workflow_instance_id = workflow_tasks.workflow_instance_id and mr.user_id = auth.uid()
  )
);

drop policy if exists workflow_tasks_admin_update on public.workflow_tasks;
create policy workflow_tasks_admin_update on public.workflow_tasks for all using (public.is_admin_user()) with check (public.is_admin_user());

drop policy if exists workflow_actions_admin_or_owner_read on public.workflow_actions;
create policy workflow_actions_admin_or_owner_read on public.workflow_actions for select using (
  public.is_admin_user() or exists (
    select 1 from public.membership_requests mr
    where mr.workflow_instance_id = workflow_actions.workflow_instance_id and mr.user_id = auth.uid()
  )
);

drop policy if exists workflow_actions_admin_insert on public.workflow_actions;
create policy workflow_actions_admin_insert on public.workflow_actions for all using (public.is_admin_user()) with check (public.is_admin_user());

insert into public.workflow_definitions (definition_key, name)
values ('membership_application', 'Membership Application')
on conflict (definition_key) do nothing;

do $$
declare
  def_id uuid;
  active_count int;
  v1_id uuid;
begin
  select id into def_id from public.workflow_definitions where definition_key = 'membership_application' limit 1;
  select count(*) into active_count from public.workflow_versions where definition_id = def_id and status = 'active';

  if active_count = 0 then
    insert into public.workflow_versions (definition_id, version_number, status, published_at)
    values (def_id, 1, 'active', now())
    returning id into v1_id;

    insert into public.workflow_nodes (workflow_version_id, node_key, node_name, node_type, order_index, assignee_type, assignee_value, approval_mode)
    values
      (v1_id, 'start_submit', '用户提交申请', 'start', 1, null, null, 'any'),
      (v1_id, 'admin_approval', '管理员审批', 'approval', 2, 'role', 'admin', 'any'),
      (v1_id, 'end_approved', '通过结束', 'end', 3, null, null, 'any'),
      (v1_id, 'end_rejected', '驳回结束', 'end', 4, null, null, 'any');

    insert into public.workflow_transitions (workflow_version_id, from_node_key, to_node_key, action)
    values
      (v1_id, 'start_submit', 'admin_approval', 'submit'),
      (v1_id, 'admin_approval', 'end_approved', 'approve'),
      (v1_id, 'admin_approval', 'end_rejected', 'reject');
  end if;
end $$;

update public.membership_requests mr
set workflow_version_id = (
  select wv.id
  from public.workflow_definitions wd
  join public.workflow_versions wv on wv.definition_id = wd.id
  where wd.definition_key = 'membership_application' and wv.status = 'active'
  order by wv.version_number desc
  limit 1
)
where mr.workflow_version_id is null;
