import Link from 'next/link'
import { cookies } from 'next/headers'
import MinnaNav from '@/components/minna-nav'
import { getLang, tr } from '@/lib/i18n'
import { checkAdminAccess } from '@/lib/admin-auth'
import { getEmailConfigStatus } from '@/lib/email-service'

const routes = [
  { path: '/admin', label: '后台管理中心' },
  { path: '/admin/users', label: '用户管理只读列表' },
  { path: '/admin/membership-requests', label: '审批记录只读列表' },
  { path: '/admin/knowledge-base', label: '知识库报告' },
  { path: '/admin/lessons/1', label: '课程只读查看' },
  { path: '/admin/export.csv', label: 'CSV 导出' },
  { path: '/admin/system', label: '系统检测与部署状态（本页）' },
  { path: '/admin/workflows/study-visitor', label: '访客确认流程管理' },
]

const restoredModules = [
  '后台入口中心',
  '审批记录只读页',
  '用户管理只读页',
  '系统检测与部署状态（本页）',
  '邮件通知服务（Resend）',
  'workflow_instances / workflow_tasks / workflow_actions 数据库表',
  '学习网站访客确认流程管理',
]

const pendingModules = [
  { icon: '💬', label: '论坛审核', desc: '旧分支存在，待确认 forum_posts 表后移植' },
  { icon: '📝', label: '课程内容管理', desc: '暂不开放编辑，后续只读查看优先' },
  { icon: '🗺️', label: '流程图只读查看', desc: '旧分支有 React Flow 流程图，待确认 @xyflow/react 依赖' },
]

const knowledgeLinks = [
  { file: 'opencode-latest-report.md', label: 'OpenCode 最新任务报告' },
  { file: 'codex-latest-report.md', label: 'Codex 最新任务报告' },
  { file: 'admin-legacy-branch-extraction-plan.md', label: '旧分支后台能力提取计划' },
  { file: 'admin-system-deep-trace-audit.md', label: '全项目后台能力深度追溯' },
  { file: 'learning-progress-confirmation-design.md', label: '学习进度判定设计报告' },
  { file: 'email-current-state.md', label: '邮件发送能力评估' },
]

const checks = [
  { name: 'npm run audit', by: '开发端执行', url: null },
  { name: 'npm run build', by: '开发端执行', url: null },
  { name: 'Vercel production deploy', by: '开发端执行', url: null },
  { name: 'git status clean', by: '开发端执行', url: null },
  { name: '知识库报告', by: '后台查看', url: '/admin/knowledge-base' },
]

export default async function AdminSystemPage() {
  const lang = await getLang()
  const cookieStore = await cookies()
  const adminCheck = await checkAdminAccess(cookieStore)

  if (!adminCheck.userAuthed) {
    return (
      <main>
        <MinnaNav active="me" />
        <h1>{tr(lang, '系统检测', 'System Status')}</h1>
        <section className="card">
          <p className="small">{tr(lang, '请先登录后访问管理员页面。', 'Please sign in before opening Admin.')}</p>
          <p><Link href="/login">{tr(lang, '去登录', 'Sign in')}</Link></p>
        </section>
      </main>
    )
  }

  if (!adminCheck.isAdmin) {
    return (
      <main>
        <MinnaNav active="me" />
        <h1>{tr(lang, '系统检测', 'System Status')}</h1>
        <section className="card">
          <p className="small">{tr(lang, '你没有管理员权限。', 'You do not have admin access.')}</p>
          <p className="small">{tr(lang, '当前角色', 'Current role')}：{adminCheck.role}</p>
          <p><Link href="/lessons">{tr(lang, '返回课程', 'Back to lessons')}</Link></p>
        </section>
      </main>
    )
  }

  return (
    <main>
      <MinnaNav active="me" />
      <section className="heroCard card">
        <div className="heroEmoji">🔍</div>
        <h2>{tr(lang, '系统检测与部署状态', 'System Status & Deployment')}</h2>
        <p className="small">{tr(lang, '只读展示当前系统状态、已恢复模块、检测清单和后续计划。', 'Read-only system status, restored modules, checklist, and roadmap.')}</p>
      </section>

      <section className="card">
        <h2>{tr(lang, '当前系统状态', 'System Status')}</h2>
        <table className="table" style={{ minWidth: 400 }}>
          <tbody>
            <tr><td className="small" style={{ fontWeight: 700, width: 160 }}>{tr(lang, '当前环境', 'Environment')}</td><td>Production</td></tr>
            <tr><td className="small" style={{ fontWeight: 700 }}>{tr(lang, '主域名', 'Domain')}</td><td><Link href="https://study.jimmyyao.com" target="_blank">https://study.jimmyyao.com</Link></td></tr>
            <tr><td className="small" style={{ fontWeight: 700 }}>{tr(lang, '后台模式', 'Admin Mode')}</td><td>{tr(lang, '只读安全恢复中', 'Read-only safe recovery')}</td></tr>
            <tr><td className="small" style={{ fontWeight: 700 }}>{tr(lang, '前台学习主线', 'Learning Core')}</td><td>{tr(lang, '保持不修改', 'Preserved unchanged')}</td></tr>
            <tr><td className="small" style={{ fontWeight: 700 }}>{tr(lang, 'Vercel Project', 'Vercel Project')}</td><td>typing-japanese-words（根目录部署）</td></tr>
          </tbody>
        </table>
      </section>

      <EmailConfigCard lang={lang} />

      <section className="card">
        <h2>{tr(lang, '当前后台可用路由', 'Available Admin Routes')}</h2>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
          {routes.map((r) => (
            <li key={r.path} className="small">
              <Link href={r.path}>
                <code style={{ fontSize: 13 }}>{r.path}</code>
              </Link>
              {' — '}{r.label}
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>{tr(lang, '最近恢复模块', 'Recently Restored')}</h2>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
          {restoredModules.map((m) => (
            <li key={m} className="small" style={{ listStyle: 'none', marginLeft: -18 }}>
              ✅ {m}
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>{tr(lang, '检测清单', 'Checklist')}</h2>
        <p className="small">{tr(lang, '以下检测项由开发端在本地执行，不在后台服务器执行。', 'Checks are run locally by the developer, not on the server.')}</p>
        <table className="table" style={{ minWidth: 400 }}>
          <thead>
            <tr>
              <th>{tr(lang, '检测项', 'Check')}</th>
              <th>{tr(lang, '执行方', 'By')}</th>
              <th>{tr(lang, '链接', 'Link')}</th>
            </tr>
          </thead>
          <tbody>
            {checks.map((c) => (
              <tr key={c.name}>
                <td><code style={{ fontSize: 13 }}>{c.name}</code></td>
                <td className="small">{c.by}</td>
                <td className="small">{c.url ? <Link href={c.url}>{tr(lang, '查看', 'View')}</Link> : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>{tr(lang, '知识库报告入口', 'Knowledge Base Reports')}</h2>
        <div style={{ display: 'grid', gap: 8 }}>
          {knowledgeLinks.map((kl) => (
            <Link
              key={kl.file}
              href={`/admin/knowledge-base?file=${kl.file}`}
              className="pillLink"
              style={{ textDecoration: 'none', display: 'block' }}
            >
              📄 {kl.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>{tr(lang, '后续待恢复', 'Pending Restoration')}</h2>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
          {pendingModules.map((m) => (
            <div key={m.label} style={{ border: '1px solid #fcd34d', borderRadius: 14, padding: 16, background: '#fffbeb', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 24 }}>{m.icon}</span>
                <span style={{ background: '#fef3c7', color: '#92400e', fontSize: 11, fontWeight: 800, borderRadius: 999, padding: '3px 10px' }}>{tr(lang, '待恢复', 'Pending')}</span>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>{m.label}</div>
                <div className="small" style={{ marginTop: 4 }}>{m.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}

function EmailConfigCard({ lang }: { lang: 'zh' | 'en' }) {
  const status = getEmailConfigStatus()
  return (
    <section className="card">
      <h2>{tr(lang, '邮件通知配置', 'Email Notification Config')}</h2>
      <table className="table" style={{ minWidth: 360 }}>
        <tbody>
          <tr>
            <td className="small" style={{ fontWeight: 700, width: 180 }}>Brevo SMTP</td>
            <td>{status.brevoConfigured
              ? <span style={{ color: '#166534' }}>✅ {tr(lang, '已配置', 'Configured')}</span>
              : <span style={{ color: '#92400e' }}>⚠️ {tr(lang, '未配置', 'Not configured')}</span>
            }</td>
          </tr>
          <tr>
            <td className="small" style={{ fontWeight: 700 }}>EMAIL_FROM</td>
            <td>{status.fromEmailConfigured
              ? <span style={{ color: '#166534' }}>✅ {status.fromEmail}</span>
              : <span style={{ color: '#92400e' }}>⚠️ {tr(lang, '未配置', 'Not configured')}</span>
            }</td>
          </tr>
          <tr>
            <td className="small" style={{ fontWeight: 700 }}>{tr(lang, '管理员邮箱', 'Admin Email')}</td>
            <td>{status.adminEmailConfigured
              ? <span style={{ color: '#166534' }}>✅ {status.adminEmail}</span>
              : <span style={{ color: '#92400e' }}>⚠️ {tr(lang, '未配置', 'Not configured')}</span>
            }</td>
          </tr>
          <tr>
            <td className="small" style={{ fontWeight: 700 }}>{tr(lang, '整体状态', 'Overall')}</td>
            <td>{status.allConfigured
              ? <span style={{ color: '#166534' }}>✅ {tr(lang, '可以发送通知邮件', 'Ready to send notifications')}</span>
              : <span style={{ color: '#92400e' }}>⚠️ {tr(lang, '邮件发送不可用，但不影响流程', 'Email unavailable, workflow unaffected')}</span>
            }</td>
          </tr>
        </tbody>
      </table>
      <p className="small" style={{ marginTop: 8 }}>
        {tr(lang, '需要配置 BREVO_SMTP_HOST/USER/PASS 和 ADMIN_NOTIFICATION_EMAIL。', 'Set BREVO_SMTP_HOST/USER/PASS and ADMIN_NOTIFICATION_EMAIL.')}
        <br />
        {tr(lang, '邮件发送失败不会影响流程状态，仅记录错误日志。', 'Email failures do not affect workflow state. Errors are logged.')}
      </p>
    </section>
  )
}
