import nodemailer from 'nodemailer'
import { formatTokyoDateTime } from './date-format'

type EmailConfig = {
  host: string
  port: number
  user: string
  pass: string
  from: string
  adminEmail: string | null
}

type SendEmailResult = {
  ok: boolean
  error?: string
}

const DEFAULT_PORT = 587

function getEmailConfig(): EmailConfig | null {
  const host = String(process.env.BREVO_SMTP_HOST || '').trim()
  const port = Number(process.env.BREVO_SMTP_PORT || DEFAULT_PORT)
  const user = String(process.env.BREVO_SMTP_USER || '').trim()
  const pass = String(process.env.BREVO_SMTP_PASS || '').trim()
  const from = String(process.env.EMAIL_FROM || '').trim() || user
  const adminEmail = String(process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL || '').trim() || null

  if (!host || !user || !pass) {
    return null
  }

  return { host, port, user, pass, from, adminEmail }
}

export function getEmailConfigStatus() {
  const config = getEmailConfig()
  return {
    brevoConfigured: !!config,
    fromEmailConfigured: config ? !!config.from : false,
    adminEmailConfigured: config ? !!config.adminEmail : false,
    allConfigured: config ? !!config.from && !!config.adminEmail : false,
    fromEmail: config?.from || null,
    adminEmail: config?.adminEmail || null,
  }
}

export function isEmailConfigured(): boolean {
  return getEmailConfig() !== null
}

async function sendEmail(to: string, subject: string, html: string): Promise<SendEmailResult> {
  const config = getEmailConfig()

  if (!config) {
    console.warn('[email] Brevo SMTP not configured, skipping email')
    return { ok: false, error: 'Brevo SMTP not configured' }
  }

  try {
    const transport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: { user: config.user, pass: config.pass },
    })

    await transport.sendMail({
      from: config.from,
      to,
      subject,
      html,
    })

    return { ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown email error'
    console.error('[email] sendEmail failed:', message)
    return { ok: false, error: message }
  }
}

export async function sendAdminNotification(subject: string, html: string): Promise<SendEmailResult> {
  const config = getEmailConfig()
  if (!config) {
    console.warn('[email] Brevo SMTP not configured, skipping admin notification')
    return { ok: false, error: 'Brevo SMTP not configured' }
  }
  if (!config.adminEmail) {
    console.warn('[email] ADMIN_NOTIFICATION_EMAIL not configured, skipping admin notification')
    return { ok: false, error: 'ADMIN_NOTIFICATION_EMAIL not configured' }
  }
  return sendEmail(config.adminEmail, subject, html)
}

export async function sendTestEmail(): Promise<SendEmailResult> {
  const config = getEmailConfig()
  if (!config) {
    console.warn('[email] Brevo SMTP not configured, skipping test email')
    return { ok: false, error: 'Brevo SMTP not configured' }
  }
  if (!config.adminEmail) {
    console.warn('[email] ADMIN_NOTIFICATION_EMAIL not configured, skipping test email')
    return { ok: false, error: 'ADMIN_NOTIFICATION_EMAIL not configured' }
  }

  const now = formatTokyoDateTime(new Date())
  const env = process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown'
  const html = [
    '<h2>学习系统邮件测试</h2>',
    '<table style="border-collapse:collapse;width:100%">',
    `<tr><td style="padding:8px 12px;font-weight:700;border:1px solid #ddd">当前时间</td><td style="padding:8px 12px;border:1px solid #ddd">${now}</td></tr>`,
    `<tr><td style="padding:8px 12px;font-weight:700;border:1px solid #ddd">当前环境</td><td style="padding:8px 12px;border:1px solid #ddd">${env}</td></tr>`,
    `<tr><td style="padding:8px 12px;font-weight:700;border:1px solid #ddd">Brevo SMTP</td><td style="padding:8px 12px;border:1px solid #ddd;color:#166534">已配置</td></tr>`,
    `<tr><td style="padding:8px 12px;font-weight:700;border:1px solid #ddd">发件地址</td><td style="padding:8px 12px;border:1px solid #ddd">${config.from}</td></tr>`,
    `<tr><td style="padding:8px 12px;font-weight:700;border:1px solid #ddd">SMTP Host</td><td style="padding:8px 12px;border:1px solid #ddd">${config.host}:${config.port}</td></tr>`,
    '</table>',
    '<p style="margin-top:16px">如果你收到这封邮件，说明 Brevo SMTP 配置正确，可以正常发送通知邮件。</p>',
  ].join('\n')

  return sendAdminNotification('学习系统邮件测试', html)
}

export async function sendWorkflowPendingNotification(params: {
  workflowType: string
  instanceId: string
  createdAt: string
  metadata?: Record<string, string | null | undefined>
}): Promise<SendEmailResult> {
  const typeLabel = params.workflowType === 'study_visitor' ? '学习网站新访客' : params.workflowType
  const subject = params.workflowType === 'study_visitor'
    ? '学习网站新访客待确认'
    : `[Minna] ${typeLabel}需要确认`

  const lines: string[] = [
    `<h2>新的${typeLabel}已提交</h2>`,
    `<table style="border-collapse:collapse;width:100%">`,
    `<tr><td style="padding:8px 12px;font-weight:700;border:1px solid #ddd">流程类型</td><td style="padding:8px 12px;border:1px solid #ddd">${params.workflowType}</td></tr>`,
    `<tr><td style="padding:8px 12px;font-weight:700;border:1px solid #ddd">实例 ID</td><td style="padding:8px 12px;border:1px solid #ddd;font-family:monospace">${params.instanceId}</td></tr>`,
    `<tr><td style="padding:8px 12px;font-weight:700;border:1px solid #ddd">提交时间</td><td style="padding:8px 12px;border:1px solid #ddd">${formatTokyoDateTime(params.createdAt)}</td></tr>`,
  ]

  if (params.metadata) {
    for (const [key, value] of Object.entries(params.metadata)) {
      if (value) {
        const label = key.replace(/_/g, ' ')
        lines.push(`<tr><td style="padding:8px 12px;font-weight:700;border:1px solid #ddd">${label}</td><td style="padding:8px 12px;border:1px solid #ddd">${value}</td></tr>`)
      }
    }
  }

  lines.push('</table>')
  lines.push(`<p style="margin-top:20px"><a href="https://study.jimmyyao.com/admin/workflows" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px">前往访客确认后台处理</a></p>`)

  return sendAdminNotification(subject, lines.join('\n'))
}
