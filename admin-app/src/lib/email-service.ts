import { randomUUID } from 'crypto'
import nodemailer from 'nodemailer'
import type { SupabaseClient } from '@supabase/supabase-js'
import { formatTokyoDateTime } from './date-format'

type EmailConfig = {
  host: string
  port: number
  user: string
  pass: string
  from: string
  adminEmail: string | null
}

export type SendEmailResult = {
  ok: boolean
  error?: string
  emailLogId?: string
}

export type WorkflowNotificationLog = {
  notificationType: string
  recipientEmail: string
  subject: string
  instanceId: string
  definitionKey: string
  referenceType: string
  referenceId: string
  userEmail: string | null
  pagePath: string
  reviewUrl: string
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

async function insertEmailLog(
  supabase: SupabaseClient,
  log: WorkflowNotificationLog & { status: string; errorMessage?: string }
) {
  const id = randomUUID()
  const base = {
    id,
    workflow_instance_id: log.instanceId,
    notification_type: log.notificationType,
    recipient_email: log.recipientEmail,
    subject: log.subject,
    provider: 'brevo_smtp',
    metadata: {
      definitionKey: log.definitionKey,
      instanceId: log.instanceId,
      referenceType: log.referenceType,
      referenceId: log.referenceId,
      userEmail: log.userEmail,
      path: log.pagePath,
      reviewUrl: log.reviewUrl,
    },
  }
  if (log.status === 'pending') {
    await supabase.from('email_logs').insert({ ...base, status: 'pending' })
  } else if (log.status === 'sent') {
    await supabase.from('email_logs').insert({ ...base, status: 'sent', sent_at: new Date().toISOString() })
  } else if (log.status === 'failed') {
    await supabase.from('email_logs').insert({ ...base, status: 'failed', failed_at: new Date().toISOString(), error_message: log.errorMessage || null })
  }
  return id
}

export async function sendWorkflowPendingNotification(params: {
  supabase: SupabaseClient
  workflowType: string
  definitionKey: string
  instanceId: string
  referenceType: string
  referenceId: string
  userEmail: string | null
  pagePath: string
  reviewUrl: string
  createdAt: string
  action?: 'pending' | 'approved' | 'rejected'
}): Promise<SendEmailResult> {
  const action = params.action || 'pending'
  const config = getEmailConfig()
  const recipientEmail = config?.adminEmail || ''
  const subject = workflowTypeLabel(params.workflowType, action)
  const notificationType = `${params.workflowType}_${action}`

  const logBase: WorkflowNotificationLog = {
    notificationType,
    recipientEmail,
    subject,
    instanceId: params.instanceId,
    definitionKey: params.definitionKey,
    referenceType: params.referenceType,
    referenceId: params.referenceId,
    userEmail: params.userEmail,
    pagePath: params.pagePath,
    reviewUrl: params.reviewUrl,
  }

  const supabase = params.supabase
  const emailLogId = await insertEmailLog(supabase, { ...logBase, status: 'pending' })

  if (!config || !config.adminEmail) {
    const errorMsg = !config ? 'Brevo SMTP not configured' : 'ADMIN_NOTIFICATION_EMAIL not configured'
    console.warn(`[email] ${errorMsg}, skipping email`)
    await supabase
      .from('email_logs')
      .update({ status: 'failed', failed_at: new Date().toISOString(), error_message: errorMsg })
      .eq('id', emailLogId)
    return { ok: false, error: errorMsg, emailLogId }
  }

  const typeLabel = workflowTypeLabel(params.workflowType, action)
  const lines = [
    `<h2>${typeLabel}</h2>`,
    `<table style="border-collapse:collapse;width:100%">`,
    `<tr><td style="padding:8px 12px;font-weight:700;border:1px solid #ddd">流程定义</td><td style="padding:8px 12px;border:1px solid #ddd;font-family:monospace">${params.definitionKey}</td></tr>`,
    `<tr><td style="padding:8px 12px;font-weight:700;border:1px solid #ddd">实例 ID</td><td style="padding:8px 12px;border:1px solid #ddd;font-family:monospace">${params.instanceId}</td></tr>`,
    `<tr><td style="padding:8px 12px;font-weight:700;border:1px solid #ddd">关联类型</td><td style="padding:8px 12px;border:1px solid #ddd">${params.referenceType}</td></tr>`,
    `<tr><td style="padding:8px 12px;font-weight:700;border:1px solid #ddd">关联 ID</td><td style="padding:8px 12px;border:1px solid #ddd;font-family:monospace">${params.referenceId}</td></tr>`,
    params.userEmail ? `<tr><td style="padding:8px 12px;font-weight:700;border:1px solid #ddd">用户邮箱</td><td style="padding:8px 12px;border:1px solid #ddd">${params.userEmail}</td></tr>` : '',
    params.pagePath ? `<tr><td style="padding:8px 12px;font-weight:700;border:1px solid #ddd">来源页面</td><td style="padding:8px 12px;border:1px solid #ddd">${params.pagePath}</td></tr>` : '',
    `<tr><td style="padding:8px 12px;font-weight:700;border:1px solid #ddd">提交时间</td><td style="padding:8px 12px;border:1px solid #ddd">${formatTokyoDateTime(params.createdAt)}</td></tr>`,
    `</table>`,
    `<p style="margin-top:20px"><a href="${params.reviewUrl}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px">${action === 'pending' ? '前往后台处理' : '查看详情'}</a></p>`,
    `<p class="small" style="margin-top:8px;color:#64748b">或复制以下链接到浏览器打开：<br><code style="font-size:12px">${params.reviewUrl}</code></p>`,
  ].join('\n')

  const result = await sendAdminNotification(subject, lines)
  if (result.ok) {
    await supabase
      .from('email_logs')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', emailLogId)
  } else {
    await supabase
      .from('email_logs')
      .update({ status: 'failed', failed_at: new Date().toISOString(), error_message: result.error || 'unknown' })
      .eq('id', emailLogId)
  }
  return { ...result, emailLogId }
}

function workflowTypeLabel(workflowType: string, action: string): string {
  const labels: Record<string, string> = {
    study_visitor: '学习网站新访客',
    logged_in_first_visit: '登录用户首次访问',
    membership_application: '会员申请',
  }
  const base = labels[workflowType] || workflowType
  if (action === 'pending') return `新的${base}已提交`
  if (action === 'approved') return `${base}已通过`
  if (action === 'rejected') return `${base}已驳回`
  return base
}
