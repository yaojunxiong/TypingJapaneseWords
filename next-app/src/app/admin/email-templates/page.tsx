import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { requireAdmin } from '@/lib/admin-auth'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

async function saveEmailTemplate(formData: FormData) {
  'use server'

  await requireAdmin()
  const key = String(formData.get('template_key') || '')
  if (!key) return

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  await supabase
    .from('email_templates')
    .update({
      subject: String(formData.get('subject') || '').trim(),
      body: String(formData.get('body') || '').trim(),
      enabled: formData.get('enabled') === 'on'
    })
    .eq('template_key', key)

  revalidatePath('/admin/email-templates')
}

export default async function AdminEmailTemplatesPage() {
  try {
    await requireAdmin()
  } catch {
    return <section className="card"><h2>无权限</h2><p><Link href="/">返回首页</Link></p></section>
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase
    .from('email_templates')
    .select('template_key,title,subject,body,enabled,updated_at')
    .order('template_key', { ascending: true })

  if (error) return <section className="card"><p>读取失败：{error.message}</p></section>

  return (
    <>
      <section className="heroCard card">
        <div className="heroEmoji">✉️</div>
        <h2>邮件模板</h2>
        <p className="small">可用变量：{'{{user_name}} {{post_title}} {{post_url}} {{admin_url}} {{review_note}} {{created_at}} {{site_name}}'}</p>
      </section>

      {(data || []).map((tpl) => (
        <form key={tpl.template_key} action={saveEmailTemplate} className="card forumForm">
          <input type="hidden" name="template_key" value={tpl.template_key} />
          <h2>{tpl.title}</h2>
          <p className="small">{tpl.template_key}</p>
          <label>
            <span>启用</span>
            <input name="enabled" type="checkbox" defaultChecked={Boolean(tpl.enabled)} />
          </label>
          <label>
            <span>Subject</span>
            <input name="subject" defaultValue={String(tpl.subject || '')} />
          </label>
          <label>
            <span>Body</span>
            <textarea name="body" rows={7} defaultValue={String(tpl.body || '')} />
          </label>
          <button className="btn" type="submit">保存模板</button>
        </form>
      ))}

      <section className="card">
        <p className="small"><Link href="/admin">← 返回后台首页</Link></p>
      </section>
    </>
  )
}
