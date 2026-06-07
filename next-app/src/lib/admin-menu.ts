export type AdminRole =
  | 'super_admin'
  | 'content_admin'
  | 'community_admin'
  | 'workflow_admin'
  | 'support_admin'

export type AdminMenuItemStatus = 'available' | 'coming_soon' | 'disabled'

export type AdminMenuItem = {
  label: string
  href: string
  description: string
  roles: AdminRole[]
  enabled: boolean
  status?: AdminMenuItemStatus
}

export type AdminMenuGroup = {
  key: string
  icon: string
  title: string
  description: string
  pendingLabel: string
  roles: AdminRole[]
  items: AdminMenuItem[]
}

const allRoles: AdminRole[] = ['super_admin', 'content_admin', 'community_admin', 'workflow_admin', 'support_admin']

export const adminMenuGroups: AdminMenuGroup[] = [
  {
    key: 'dashboard',
    icon: '📊',
    title: '总览 Dashboard',
    description: '查看系统状态、待办概览和关键入口。',
    pendingLabel: '待处理 0',
    roles: allRoles,
    items: [
      { label: '后台首页', href: '/admin', description: 'Admin Console 总览', roles: allRoles, enabled: true },
      { label: '部署检查', href: '/admin/deployment-check', description: '环境变量与关键路由检查', roles: ['super_admin', 'content_admin'], enabled: true }
    ]
  },
  {
    key: 'users',
    icon: '👥',
    title: '用户与权限',
    description: '用户、角色权限、会员等级与审批。',
    pendingLabel: '待审批 0',
    roles: ['super_admin', 'support_admin'],
    items: [
      { label: '用户管理', href: '/admin', description: '预留入口', roles: ['super_admin'], enabled: false, status: 'coming_soon' },
      { label: '角色权限', href: '/admin', description: '预留入口', roles: ['super_admin'], enabled: false, status: 'coming_soon' },
      { label: '会员审批', href: '/admin/membership-requests', description: 'free -> vip1/vip2/vip3', roles: ['super_admin', 'support_admin'], enabled: true }
    ]
  },
  {
    key: 'content',
    icon: '📚',
    title: '学习内容管理',
    description: '课程、词汇、语法、题目、草稿与发布。',
    pendingLabel: '草稿 0',
    roles: ['super_admin', 'content_admin'],
    items: [
      { label: '课程管理', href: '/admin/lessons', description: 'Lesson 1-50 数据概览', roles: ['super_admin', 'content_admin'], enabled: true },
      { label: '单词管理', href: '/admin', description: '预留入口，当前归入课程管理', roles: ['super_admin', 'content_admin'], enabled: false, status: 'coming_soon' },
      { label: '语法管理', href: '/admin', description: '预留入口，当前归入课程管理', roles: ['super_admin', 'content_admin'], enabled: false, status: 'coming_soon' },
      { label: '题目管理', href: '/admin', description: '预留入口，当前归入课程管理', roles: ['super_admin', 'content_admin'], enabled: false, status: 'coming_soon' },
      { label: '内容草稿', href: '/admin/drafts', description: 'draft / validate / publish', roles: ['super_admin', 'content_admin'], enabled: true },
      { label: '一键发布', href: '/admin/publish', description: '预览和发布', roles: ['super_admin', 'content_admin'], enabled: true }
    ]
  },
  {
    key: 'learning-data',
    icon: '🧠',
    title: '学习数据',
    description: '学习统计、错题、收藏、复习数据。',
    pendingLabel: '待处理 0',
    roles: ['super_admin', 'content_admin', 'support_admin'],
    items: [
      { label: '学习统计', href: '/admin', description: '预留入口', roles: ['super_admin', 'support_admin'], enabled: false, status: 'coming_soon' },
      { label: '错题管理', href: '/admin', description: '预留入口', roles: ['super_admin', 'content_admin'], enabled: false, status: 'coming_soon' },
      { label: '收藏管理', href: '/admin', description: '预留入口', roles: ['super_admin', 'content_admin'], enabled: false, status: 'coming_soon' },
      { label: '复习数据', href: '/admin', description: '预留入口', roles: ['super_admin', 'content_admin'], enabled: false, status: 'coming_soon' }
    ]
  },
  {
    key: 'community',
    icon: '💬',
    title: '社区与消息',
    description: '论坛审核、帖子、评论、举报和公告。',
    pendingLabel: '待审核 0',
    roles: ['super_admin', 'community_admin'],
    items: [
      { label: '论坛审核', href: '/admin/forum', description: 'pending -> approved/rejected/hidden', roles: ['super_admin', 'community_admin'], enabled: true },
      { label: '帖子管理', href: '/admin/forum?status=all', description: '查看全部帖子', roles: ['super_admin', 'community_admin'], enabled: true },
      { label: '评论管理', href: '/admin/forum', description: '当前在帖子详情内管理', roles: ['super_admin', 'community_admin'], enabled: true },
      { label: '举报处理', href: '/admin', description: '预留入口', roles: ['super_admin', 'community_admin'], enabled: false, status: 'coming_soon' },
      { label: '官方公告', href: '/messages/forum/new', description: '管理员发布公告', roles: ['super_admin', 'community_admin'], enabled: true }
    ]
  },
  {
    key: 'workflow',
    icon: '🧭',
    title: '流程与审批',
    description: '流程版本、流程图、审批任务与人员。',
    pendingLabel: '审批任务 0',
    roles: ['super_admin', 'workflow_admin'],
    items: [
      { label: '流程管理', href: '/admin/workflows', description: 'Workflow 管理首页', roles: ['super_admin', 'workflow_admin'], enabled: true },
      { label: '流程图', href: '/admin/workflows/membership-application/versions', description: '版本列表进入流程图', roles: ['super_admin', 'workflow_admin'], enabled: true },
      { label: '审批任务', href: '/admin/membership-requests', description: '当前会员审批任务', roles: ['super_admin', 'workflow_admin'], enabled: true },
      { label: '审批历史', href: '/admin/membership-requests', description: '当前会员审批记录', roles: ['super_admin', 'workflow_admin'], enabled: true },
      { label: '审批人员', href: '/admin', description: '预留入口，节点字段已预留', roles: ['super_admin', 'workflow_admin'], enabled: false, status: 'coming_soon' }
    ]
  },
  {
    key: 'email',
    icon: '📧',
    title: '邮件系统',
    description: '邮件 provider、模板和发送日志。',
    pendingLabel: '失败 0',
    roles: ['super_admin', 'workflow_admin', 'support_admin'],
    items: [
      { label: '邮件配置', href: '/admin/email-settings', description: 'mock / gmail_gas / resend', roles: ['super_admin', 'workflow_admin'], enabled: true },
      { label: '邮件模板', href: '/admin/email-templates', description: '通知模板变量配置', roles: ['super_admin', 'workflow_admin'], enabled: true },
      { label: '邮件日志', href: '/admin/email-logs', description: '发送状态和错误排查', roles: ['super_admin', 'support_admin'], enabled: true }
    ]
  },
  {
    key: 'settings',
    icon: '⚙️',
    title: '系统设置',
    description: '系统参数、操作日志、部署检查。',
    pendingLabel: '检查 0',
    roles: ['super_admin'],
    items: [
      { label: '系统参数', href: '/admin', description: '预留入口', roles: ['super_admin'], enabled: false, status: 'coming_soon' },
      { label: '操作日志', href: '/admin', description: '预留入口', roles: ['super_admin'], enabled: false, status: 'coming_soon' },
      { label: '部署检查', href: '/admin/deployment-check', description: '环境变量与关键路由检查', roles: ['super_admin'], enabled: true }
    ]
  }
]
