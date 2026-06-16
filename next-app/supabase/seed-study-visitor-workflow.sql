-- seed-study-visitor-workflow.sql
-- 目的：在已有 workflow_* 表中注册 study_visitor 流程定义
-- 方法：INSERT IF NOT EXISTS + DO $$ 块，幂等可重复执行
-- 前提：workflow_definitions / workflow_versions / workflow_nodes / workflow_transitions 表已存在

-- 1. 注册流程定义
insert into public.workflow_definitions (definition_key, name, description)
values ('study_visitor', '学习网站新访客确认', '新访客访问后自动创建，管理员确认/拒绝')
on conflict (definition_key) do nothing;

-- 2. 创建版本 1 (active) + 节点 + 转换
do $$
declare
  def_id uuid;
  ver_id uuid;
begin
  select id into def_id from public.workflow_definitions
  where definition_key = 'study_visitor'
  limit 1;

  if not found then
    raise exception 'workflow_definitions entry not found';
  end if;

  if exists (
    select 1 from public.workflow_versions
    where definition_id = def_id and status = 'active'
  ) then
    return;
  end if;

  insert into public.workflow_versions (definition_id, version_number, status, published_at)
  values (def_id, 1, 'active', now())
  returning id into ver_id;

  insert into public.workflow_nodes (workflow_version_id, node_key, node_name, node_type, order_index, assignee_type, assignee_value)
  values
    (ver_id, 'start_visit',    '新访客访问',   'start',    1, null, null),
    (ver_id, 'admin_approval', '管理员确认',   'approval', 2, 'role', 'admin'),
    (ver_id, 'end_confirmed',  '确认完成',     'end',      3, null, null),
    (ver_id, 'end_rejected',   '已拒绝',       'end',      4, null, null);

  insert into public.workflow_transitions (workflow_version_id, from_node_key, to_node_key, action)
  values
    (ver_id, 'start_visit',    'admin_approval', 'submit'),
    (ver_id, 'admin_approval', 'end_confirmed',  'approve'),
    (ver_id, 'admin_approval', 'end_rejected',   'reject');
end $$;

-- 3. 更新 RLS 策略—允许 study_visitor 所有者读写自己的实例

create or replace policy workflow_instances_read on public.workflow_instances for select using (
  public.is_admin_user()
  or exists (
    select 1 from public.membership_requests mr
    where mr.workflow_instance_id = workflow_instances.id and mr.user_id = auth.uid()
  )
  or (reference_type = 'study_visitor' and reference_id = auth.uid())
);

create or replace policy workflow_instances_insert on public.workflow_instances for insert to authenticated
with check (
  public.is_admin_user()
  or reference_type = 'study_visitor'
);

-- UPDATE/DELETE 仅 admin
create or replace policy workflow_instances_admin_update on public.workflow_instances for update using (public.is_admin_user());
create or replace policy workflow_instances_admin_delete on public.workflow_instances for delete using (public.is_admin_user());

create or replace policy workflow_tasks_read on public.workflow_tasks for select using (
  public.is_admin_user()
  or exists (
    select 1 from public.membership_requests mr
    where mr.workflow_instance_id = workflow_tasks.workflow_instance_id and mr.user_id = auth.uid()
  )
  or exists (
    select 1 from public.workflow_instances wi
    where wi.id = workflow_tasks.workflow_instance_id
      and wi.reference_type = 'study_visitor'
      and wi.reference_id = auth.uid()
  )
);

create or replace policy workflow_tasks_insert on public.workflow_tasks for insert to authenticated
with check (
  public.is_admin_user()
  or exists (
    select 1 from public.workflow_instances wi
    where wi.id = workflow_tasks.workflow_instance_id and wi.reference_type = 'study_visitor'
  )
);

create or replace policy workflow_tasks_admin_update on public.workflow_tasks for update using (public.is_admin_user());

create or replace policy workflow_actions_read on public.workflow_actions for select using (
  public.is_admin_user()
  or exists (
    select 1 from public.membership_requests mr
    where mr.workflow_instance_id = workflow_actions.workflow_instance_id and mr.user_id = auth.uid()
  )
  or exists (
    select 1 from public.workflow_instances wi
    where wi.id = workflow_actions.workflow_instance_id
      and wi.reference_type = 'study_visitor'
      and wi.reference_id = auth.uid()
  )
);

create or replace policy workflow_actions_insert on public.workflow_actions for insert to authenticated
with check (
  public.is_admin_user()
  or exists (
    select 1 from public.workflow_instances wi
    where wi.id = workflow_actions.workflow_instance_id and wi.reference_type = 'study_visitor'
  )
);
