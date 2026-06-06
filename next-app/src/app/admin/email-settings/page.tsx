import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { requireAdmin } from '@/lib/admin-auth'
import { sendEmail } from '@/lib/email-service'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

async function saveEmailSettings(formData: FormData) {
  'use server'

  await requireAdmin()
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const provider = String(formData.get('provider') || 'mock')

  await supabase.from('email_settings').upsert({
    id: 1,
    enabled: formData.get('enabled') === 'on',
    provider,
    from_name: String(formData.get('from_name') || 'Minna Learning').trim(),
    from_email: String(formData.get('from_email') || '').trim() || null,
    admin_email: String(formData.get('admin_email') || '').trim() || null,
    gas_webhook_url: String(formData.get('gas_webhook_url') || '').trim() || null,
    resend_from_email: String(formData.get('resend_from_email') || '').trim() || null
  })

  revalidatePath('/admin/email-settings')
}

async function sendTestEmail(formData: FormData) {
  'use server'

  const admin = await requireAdmin()
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const to = String(formData.get('to_email') || '').trim() || admin.email

  await sendEmail(supabase, {
    to,
    subject: '测试邮件：邮件系统',
    body: [
      '这是一封测试邮件记录。',
      '',
      'mock provider 只写入 email_logs；mailtrap_sandbox 会发送到 Mailtrap Sandbox Inbox；gmail_gas 会通过 GAS Webhook 真实发送；resend/brevo/brevo_smtp 当前仅真实发送论坛待审管理员通知。',
      `触发管理员：${admin.email}`,
      `生成时间：${new Date().toLocaleString('zh-CN')}`
    ].join('\n'),
    templateKey: 'test_email',
    workflowType: 'email_system_test',
    referenceType: 'email_settings'
  })

  revalidatePath('/admin/email-logs')
  revalidatePath('/admin/email-settings')
}

export default async function AdminEmailSettingsPage() {
  try {
    await requireAdmin()
  } catch {
    return <section className="card"><h2>无权限</h2><p><Link href="/">返回首页</Link></p></section>
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data } = await supabase
    .from('email_settings')
    .select('enabled,provider,from_name,from_email,admin_email,gas_webhook_url,resend_from_email')
    .eq('id', 1)
    .maybeSingle()

  const settings = data || {
    enabled: false,
    provider: 'mock',
    from_name: 'Minna Learning',
    from_email: '',
    admin_email: '',
    gas_webhook_url: '',
    resend_from_email: ''
  }
  const provider = String(settings.provider || 'mock')
  const adminEmail = String(settings.admin_email || '')

  return (
    <>
      <section className="heroCard card">
        <div className="heroEmoji">📧</div>
        <h2>邮件发送配置</h2>
        <p className="small">SMTP 密码/API Key 只从环境变量读取；这里保存开关、provider 和发件地址。</p>
      </section>

      <section className="card">
        <h2>当前配置</h2>
        <div className="forumMeta strong">
          <span>状态：{settings.enabled ? '已启用' : '已关闭'}</span>
          <span>Provider：{provider}</span>
        </div>
        <p className="small">From Name：{String(settings.from_name || 'Minna Learning')}</p>
        <p className="small">From Email：{String(settings.from_email || '未设置')}</p>
        <p className="small">管理员通知邮箱：{adminEmail || '未设置，将使用管理员邮箱兜底'}</p>
        <p className="small">mock 只写日志；brevo_smtp 会使用环境变量 SMTP 配置真实发送测试邮件和论坛待审管理员通知。</p>
      </section>

      <form action={saveEmailSettings} className="card forumForm">
        <label>
          <span>启用邮件发送</span>
          <input name="enabled" type="checkbox" defaultChecked={Boolean(settings.enabled)} />
        </label>
        <label>
          <span>Provider</span>
          <select name="provider" defaultValue={String(settings.provider || 'mock')}>
            <option value="mock">mock（只写日志）</option>
            <option value="mailtrap_sandbox">mailtrap_sandbox（开发测试）</option>
            <option value="gmail_gas">gmail_gas（Google Apps Script）</option>
            <option value="resend">resend</option>
            <option value="brevo">brevo</option>
            <option value="brevo_smtp">brevo_smtp</option>
          </select>
        </label>
        <label>
          <span>From Name</span>
          <input name="from_name" defaultValue={String(settings.from_name || 'Minna Learning')} />
        </label>
        <label>
          <span>From Email</span>
          <input name="from_email" type="email" defaultValue={String(settings.from_email || '')} />
        </label>
        <label>
          <span>管理员通知邮箱</span>
          <input name="admin_email" type="email" defaultValue={String(settings.admin_email || '')} />
        </label>
        <label>
          <span>GAS Webhook URL</span>
          <input name="gas_webhook_url" defaultValue={String(settings.gas_webhook_url || '')} placeholder="密钥放 GAS_EMAIL_SECRET 环境变量" />
        </label>
        <label>
          <span>Resend From Email</span>
          <input name="resend_from_email" type="email" defaultValue={String(settings.resend_from_email || '')} placeholder="预留字段；当前 Resend 使用 From Email" />
        </label>
        <button className="btn" type="submit">保存配置</button>
        <p className="small"><Link href="/admin">← 返回后台首页</Link></p>
      </form>

      <form action={sendTestEmail} className="card forumForm">
        <h2>发送测试邮件</h2>
        <p className="small">使用当前 provider 和同一套 sendEmail()。mock 只写日志，mailtrap_sandbox 会发送到 Mailtrap Sandbox，gmail_gas 会真实发送；brevo_smtp 测试邮件会真实发送。</p>
        <label>
          <span>测试收件人</span>
          <input name="to_email" type="email" defaultValue={adminEmail} placeholder="默认使用当前管理员邮箱" />
        </label>
        <button className="btn" type="submit">发送测试邮件</button>
        <p className="small"><Link href="/admin/email-logs">查看邮件日志</Link></p>
      </form>
    </>
  )
}
