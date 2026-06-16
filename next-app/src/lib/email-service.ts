type EmailConfig = {
  resendApiKey: string | null
  fromEmail: string
  adminEmail: string | null
}

type SendEmailResult = {
  ok: boolean
  error?: string
}

function getEmailConfig(): EmailConfig {
  return {
    resendApiKey: String(process.env.RESEND_API_KEY || '').trim() || null,
    fromEmail: String(process.env.EMAIL_FROM || 'noreply@jimmyyao.com').trim(),
    adminEmail: String(process.env.ADMIN_EMAIL || '').trim() || null,
  }
}

export function getEmailConfigStatus() {
  const config = getEmailConfig()
  return {
    resendConfigured: !!config.resendApiKey,
    fromEmailConfigured: !!config.fromEmail,
    adminEmailConfigured: !!config.adminEmail,
    allConfigured: !!config.resendApiKey && !!config.fromEmail && !!config.adminEmail,
    fromEmail: config.fromEmail,
    adminEmail: config.adminEmail || null,
  }
}

export function isEmailConfigured(): boolean {
  const config = getEmailConfig()
  return !!config.resendApiKey && !!config.fromEmail
}

async function sendEmail(to: string, subject: string, html: string): Promise<SendEmailResult> {
  const config = getEmailConfig()

  if (!config.resendApiKey) {
    console.warn('[email] RESEND_API_KEY not configured, skipping email')
    return { ok: false, error: 'RESEND_API_KEY not configured' }
  }
  if (!config.fromEmail) {
    console.warn('[email] EMAIL_FROM not configured, skipping email')
    return { ok: false, error: 'EMAIL_FROM not configured' }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: config.fromEmail, to: [to], subject, html }),
    })
    if (!res.ok) {
      const body = await res.text()
      console.error('[email] Resend API error:', res.status, body)
      return { ok: false, error: `Resend API error ${res.status}` }
    }
    return { ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown email error'
    console.error('[email] sendEmail failed:', message)
    return { ok: false, error: message }
  }
}

export async function sendAdminNotification(subject: string, html: string): Promise<SendEmailResult> {
  const config = getEmailConfig()
  if (!config.adminEmail) {
    console.warn('[email] ADMIN_EMAIL not configured, skipping admin notification')
    return { ok: false, error: 'ADMIN_EMAIL not configured' }
  }
  return sendEmail(config.adminEmail, subject, html)
}

export async function sendWorkflowPendingNotification(params: {
  workflowType: string
  instanceId: string
  createdAt: string
  metadata?: Record<string, string | null | undefined>
}): Promise<SendEmailResult> {
  const config = getEmailConfig()
  const typeLabel = params.workflowType === 'study_visitor' ? '学习网站新访客' : params.workflowType
  const subject = `[Minna] ${typeLabel}需要确认`

  const lines: string[] = [
    `<h2>新的${typeLabel}已提交</h2>`,
    `<table style="border-collapse:collapse;width:100%">`,
    `<tr><td style="padding:8px 12px;font-weight:700;border:1px solid #ddd">流程类型</td><td style="padding:8px 12px;border:1px solid #ddd">${params.workflowType}</td></tr>`,
    `<tr><td style="padding:8px 12px;font-weight:700;border:1px solid #ddd">实例 ID</td><td style="padding:8px 12px;border:1px solid #ddd;font-family:monospace">${params.instanceId}</td></tr>`,
    `<tr><td style="padding:8px 12px;font-weight:700;border:1px solid #ddd">提交时间</td><td style="padding:8px 12px;border:1px solid #ddd">${params.createdAt}</td></tr>`,
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
  lines.push(`<p style="margin-top:20px"><a href="${config.adminEmail ? `https://study.jimmyyao.com/admin` : '/'}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px">前往后台处理</a></p>`)

  return sendAdminNotification(subject, lines.join('\n'))
}
