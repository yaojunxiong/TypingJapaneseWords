import type { SupabaseClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

export type EmailProvider = 'mock' | 'gmail_gas' | 'resend' | 'mailtrap_sandbox' | 'brevo' | 'brevo_smtp'

type EmailSettings = {
  enabled: boolean
  provider: EmailProvider
  from_name: string
  from_email: string | null
  admin_email: string | null
  gas_webhook_url: string | null
  resend_from_email: string | null
}

type EmailTemplate = {
  template_key: string
  subject: string
  body: string
  enabled: boolean
}

type EmailInput = {
  to: string
  subject: string
  body: string
  templateKey?: string
  workflowType?: string
  referenceType?: string
  referenceId?: string
}

type TemplateInput = {
  templateKey: string
  to: string
  variables: Record<string, string | null | undefined>
  workflowType?: string
  referenceType?: string
  referenceId?: string
}

const defaultSettings: EmailSettings = {
  enabled: false,
  provider: 'mock',
  from_name: 'Minna Learning',
  from_email: null,
  admin_email: null,
  gas_webhook_url: null,
  resend_from_email: null
}

function renderTemplate(text: string, variables: Record<string, string | null | undefined>) {
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    return variables[key] || ''
  })
}

async function getEmailSettings(supabase: SupabaseClient): Promise<EmailSettings> {
  const { data, error } = await supabase
    .from('email_settings')
    .select('enabled,provider,from_name,from_email,admin_email,gas_webhook_url,resend_from_email')
    .eq('id', 1)
    .maybeSingle()

  if (error || !data) return defaultSettings
  const provider = String(data.provider || 'mock')
  return {
    enabled: Boolean(data.enabled),
    provider: provider === 'gmail_gas' || provider === 'resend' || provider === 'mailtrap_sandbox' || provider === 'brevo' || provider === 'brevo_smtp' ? provider : 'mock',
    from_name: String(data.from_name || defaultSettings.from_name),
    from_email: data.from_email ? String(data.from_email) : null,
    admin_email: data.admin_email ? String(data.admin_email) : null,
    gas_webhook_url: data.gas_webhook_url ? String(data.gas_webhook_url) : null,
    resend_from_email: data.resend_from_email ? String(data.resend_from_email) : null
  }
}

async function getEmailTemplate(supabase: SupabaseClient, templateKey: string): Promise<EmailTemplate | null> {
  const { data, error } = await supabase
    .from('email_templates')
    .select('template_key,subject,body,enabled')
    .eq('template_key', templateKey)
    .maybeSingle()

  if (error || !data) return null
  return data as EmailTemplate
}

async function sendViaGmailGas(settings: EmailSettings, input: EmailInput) {
  const url = settings.gas_webhook_url
  const secret = process.env.GAS_EMAIL_SECRET
  if (!url) throw new Error('GAS webhook URL is not configured')
  if (!secret) throw new Error('GAS_EMAIL_SECRET is not configured')

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret,
      to: input.to,
      subject: input.subject,
      body: input.body,
      fromName: settings.from_name,
      fromEmail: settings.from_email
    })
  })

  if (!res.ok) {
    const message = await res.text().catch(() => '')
    throw new Error(`GAS email failed: ${res.status}${message ? ` ${message}` : ''}`)
  }
}

async function sendViaResend(settings: EmailSettings, input: EmailInput) {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = settings.from_email
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured')
  if (!fromEmail) throw new Error('from_email is not configured')

  const from = settings.from_name ? `${settings.from_name} <${fromEmail}>` : fromEmail
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      text: input.body
    })
  })

  if (!res.ok) {
    const message = await res.text().catch(() => '')
    throw new Error(`Resend email failed: ${res.status}${message ? ` ${message}` : ''}`)
  }
}

async function sendViaBrevo(settings: EmailSettings, input: EmailInput) {
  const apiKey = process.env.BREVO_API_KEY
  const fromEmail = settings.from_email
  if (!apiKey) throw new Error('BREVO_API_KEY is not configured')
  if (!fromEmail) throw new Error('from_email is not configured')

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sender: {
        name: settings.from_name || 'Minna Learning',
        email: fromEmail
      },
      to: [{ email: input.to }],
      subject: input.subject,
      textContent: input.body
    })
  })

  if (!res.ok) {
    const message = await res.text().catch(() => '')
    throw new Error(`Brevo email failed: ${res.status}${message ? ` ${message}` : ''}`)
  }
}

async function sendViaMailtrapSandbox(settings: EmailSettings, input: EmailInput) {
  const host = process.env.MAILTRAP_SMTP_HOST
  const port = Number(process.env.MAILTRAP_SMTP_PORT || 587)
  const user = process.env.MAILTRAP_SMTP_USER
  const pass = process.env.MAILTRAP_SMTP_PASS
  const fromEmail = settings.from_email

  if (!host) throw new Error('MAILTRAP_SMTP_HOST is not configured')
  if (!Number.isInteger(port) || port < 1) throw new Error('MAILTRAP_SMTP_PORT is invalid')
  if (!user) throw new Error('MAILTRAP_SMTP_USER is not configured')
  if (!pass) throw new Error('MAILTRAP_SMTP_PASS is not configured')
  if (!fromEmail) throw new Error('from_email is not configured')

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  })
  const from = settings.from_name ? `${settings.from_name} <${fromEmail}>` : fromEmail

  await transporter.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    text: input.body
  })
}

async function sendViaBrevoSmtp(settings: EmailSettings, input: EmailInput) {
  const host = process.env.BREVO_SMTP_HOST
  const port = Number(process.env.BREVO_SMTP_PORT || 587)
  const user = process.env.BREVO_SMTP_USER
  const pass = process.env.BREVO_SMTP_PASS
  const fromEmail = settings.from_email

  if (!host) throw new Error('BREVO_SMTP_HOST is not configured')
  if (!Number.isInteger(port) || port < 1) throw new Error('BREVO_SMTP_PORT is invalid')
  if (!user) throw new Error('BREVO_SMTP_USER is not configured')
  if (!pass) throw new Error('BREVO_SMTP_PASS is not configured')
  if (!fromEmail) throw new Error('from_email is not configured')

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  })
  const from = settings.from_name ? `${settings.from_name} <${fromEmail}>` : fromEmail

  await transporter.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    text: input.body
  })
}

export async function sendEmail(supabase: SupabaseClient, input: EmailInput) {
  const settings = await getEmailSettings(supabase)
  const { data: logRow, error: logError } = await supabase
    .from('email_logs')
    .insert({
      template_key: input.templateKey || null,
      workflow_type: input.workflowType || null,
      reference_type: input.referenceType || null,
      reference_id: input.referenceId || null,
      to_email: input.to,
      subject: input.subject,
      body: input.body,
      provider: settings.provider,
      status: 'pending'
    })
    .select('id')
    .maybeSingle()

  if (logError) {
    console.error('email log insert failed', logError.message)
    return
  }

  if (!settings.enabled || settings.provider === 'mock') return
  const shouldSendPendingAdmin = input.templateKey === 'forum_post_pending_admin'
  const shouldSendTestEmail = input.templateKey === 'test_email'
  if ((settings.provider === 'resend' || settings.provider === 'brevo') && !shouldSendPendingAdmin) return
  if (settings.provider === 'brevo_smtp' && !shouldSendPendingAdmin && !shouldSendTestEmail) return

  try {
    if (settings.provider === 'gmail_gas') await sendViaGmailGas(settings, input)
    if (settings.provider === 'resend') await sendViaResend(settings, input)
    if (settings.provider === 'brevo') await sendViaBrevo(settings, input)
    if (settings.provider === 'mailtrap_sandbox') await sendViaMailtrapSandbox(settings, input)
    if (settings.provider === 'brevo_smtp') await sendViaBrevoSmtp(settings, input)

    await supabase
      .from('email_logs')
      .update({ status: 'sent', sent_at: new Date().toISOString(), error_message: null })
      .eq('id', logRow?.id)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown email error'
    await supabase
      .from('email_logs')
      .update({ status: 'failed', error_message: message })
      .eq('id', logRow?.id)
  }
}

export async function sendTemplateEmail(supabase: SupabaseClient, input: TemplateInput) {
  const template = await getEmailTemplate(supabase, input.templateKey)
  if (!template || !template.enabled) return

  await sendEmail(supabase, {
    to: input.to,
    subject: renderTemplate(template.subject, input.variables),
    body: renderTemplate(template.body, input.variables),
    templateKey: input.templateKey,
    workflowType: input.workflowType,
    referenceType: input.referenceType,
    referenceId: input.referenceId
  })
}

export async function getForumAdminNotificationEmails(supabase: SupabaseClient) {
  const settings = await getEmailSettings(supabase)
  if (settings.admin_email) return [settings.admin_email]

  const fallback = String(process.env.ADMIN_NOTIFICATION_EMAIL || 'yaojunxiong23@gmail.com')
  const { data, error } = await supabase.rpc('forum_admin_notification_emails')
  if (error || !Array.isArray(data) || data.length === 0) return [fallback]
  return data.map(String).filter(Boolean)
}

export async function notifyForumPostPending(
  supabase: SupabaseClient,
  input: { postId: string; title: string; authorEmail: string | null; postUrl?: string }
) {
  try {
    const emails = await getForumAdminNotificationEmails(supabase)
    await Promise.all(
      emails.map((email) =>
        sendTemplateEmail(supabase, {
          to: email,
          templateKey: 'forum_post_pending_admin',
          variables: {
            user_name: input.authorEmail || '未知用户',
            post_title: input.title,
            post_url: input.postUrl || `/messages/forum/${input.postId}`,
            admin_url: '/admin/forum?status=pending',
            review_note: '',
            created_at: new Date().toLocaleString('zh-CN'),
            site_name: 'Minna Learning'
          },
          workflowType: 'forum_post_review',
          referenceType: 'forum_post',
          referenceId: input.postId
        })
      )
    )
  } catch (error) {
    console.error('forum pending email notification failed', error)
  }
}

export async function notifyForumPostReviewResult(
  supabase: SupabaseClient,
  input: { postId: string; title: string; authorEmail: string | null; status: string; reviewNote: string | null }
) {
  if (!input.authorEmail) return
  const templateKey = input.status === 'approved'
    ? 'forum_post_approved_author'
    : input.status === 'rejected'
      ? 'forum_post_rejected_author'
      : ''
  if (!templateKey) return

  try {
    await sendTemplateEmail(supabase, {
      to: input.authorEmail,
      templateKey,
      variables: {
        user_name: input.authorEmail,
        post_title: input.title,
        post_url: `/messages/forum/${input.postId}`,
        admin_url: '/admin/forum',
        review_note: input.reviewNote || '',
        created_at: new Date().toLocaleString('zh-CN'),
        site_name: 'Minna Learning'
      },
      workflowType: 'forum_post_review',
      referenceType: 'forum_post',
      referenceId: input.postId
    })
  } catch (error) {
    console.error('forum review result email notification failed', error)
  }
}
