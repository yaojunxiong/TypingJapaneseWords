-- seed-study-visitor-workflow.sql
-- 目的：在已有 workflow_* 表中注册 study_visitor 流程定义
-- 方法：INSERT ... WHERE NOT EXISTS，幂等可重复执行
-- 前提：workflow_definitions / workflow_versions / workflow_nodes / workflow_transitions 表已存在

-- 1. 注册流程定义
insert into public.workflow_definitions (definition_key, name)
values ('study_visitor', '学习网站新访客确认')
on conflict (definition_key) do nothing;

-- 2. 创建版本 1 (active)
insert into public.workflow_versions (definition_id, version_number, status, published_at)
select d.id, 1, 'active', now()
from public.workflow_definitions d
where d.definition_key = 'study_visitor'
  and not exists (
    select 1
    from public.workflow_versions v
    where v.definition_id = d.id and v.status = 'active'
  );

-- 3. 创建节点
insert into public.workflow_nodes (workflow_version_id, node_key, node_name, node_type, order_index, assignee_type, assignee_value)
select v.id, n.node_key, n.node_name, n.node_type, n.order_index, n.assignee_type, n.assignee_value
from public.workflow_versions v
join public.workflow_definitions d on d.id = v.definition_id
cross join (values
  ('start_visit',    '新访客访问',   'start',    1, null::text, null::text),
  ('admin_approval', '管理员确认',   'approval', 2, 'role',      'admin'),
  ('end_confirmed',  '确认完成',     'end',      3, null::text, null::text),
  ('end_rejected',   '已拒绝',       'end',      4, null::text, null::text)
) as n(node_key, node_name, node_type, order_index, assignee_type, assignee_value)
where d.definition_key = 'study_visitor'
  and v.status = 'active'
  and not exists (
    select 1
    from public.workflow_nodes wn
    where wn.workflow_version_id = v.id and wn.node_key = n.node_key
  );

-- 4. 创建转换
insert into public.workflow_transitions (workflow_version_id, from_node_key, to_node_key, action)
select v.id, t.from_node_key, t.to_node_key, t.action
from public.workflow_versions v
join public.workflow_definitions d on d.id = v.definition_id
cross join (values
  ('start_visit',    'admin_approval', 'submit'),
  ('admin_approval', 'end_confirmed',  'approve'),
  ('admin_approval', 'end_rejected',   'reject')
) as t(from_node_key, to_node_key, action)
where d.definition_key = 'study_visitor'
  and v.status = 'active'
  and not exists (
    select 1
    from public.workflow_transitions wt
    where wt.workflow_version_id = v.id
      and wt.from_node_key = t.from_node_key
      and wt.to_node_key = t.to_node_key
      and wt.action = t.action
  );

-- 5. 更新 RLS 策略—允许 study_visitor 所有者读写自己的实例

drop policy if exists workflow_instances_read on public.workflow_instances;
create policy workflow_instances_read on public.workflow_instances for select using (
  public.is_admin_user()
  or exists (
    select 1 from public.membership_requests mr
    where mr.workflow_instance_id = workflow_instances.id and mr.user_id = auth.uid()
  )
  or (reference_type = 'study_visitor' and reference_id = auth.uid())
);

drop policy if exists workflow_instances_insert on public.workflow_instances;
create policy workflow_instances_insert on public.workflow_instances for insert to authenticated
with check (
  public.is_admin_user()
  or reference_type = 'study_visitor'
);

drop policy if exists workflow_instances_admin_update on public.workflow_instances;
create policy workflow_instances_admin_update on public.workflow_instances for update using (public.is_admin_user());

drop policy if exists workflow_instances_admin_delete on public.workflow_instances;
create policy workflow_instances_admin_delete on public.workflow_instances for delete using (public.is_admin_user());

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
      and wi.reference_type = 'study_visitor'
      and wi.reference_id = auth.uid()
  )
);

drop policy if exists workflow_tasks_insert on public.workflow_tasks;
create policy workflow_tasks_insert on public.workflow_tasks for insert to authenticated
with check (
  public.is_admin_user()
  or exists (
    select 1 from public.workflow_instances wi
    where wi.id = workflow_tasks.workflow_instance_id and wi.reference_type = 'study_visitor'
  )
);

drop policy if exists workflow_tasks_admin_update on public.workflow_tasks;
create policy workflow_tasks_admin_update on public.workflow_tasks for update using (public.is_admin_user());

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
      and wi.reference_type = 'study_visitor'
      and wi.reference_id = auth.uid()
  )
);

drop policy if exists workflow_actions_insert on public.workflow_actions;
create policy workflow_actions_insert on public.workflow_actions for insert to authenticated
with check (
  public.is_admin_user()
  or exists (
    select 1 from public.workflow_instances wi
    where wi.id = workflow_actions.workflow_instance_id and wi.reference_type = 'study_visitor'
  )
);
