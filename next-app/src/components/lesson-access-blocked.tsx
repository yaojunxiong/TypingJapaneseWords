import Link from 'next/link'
import type { LessonAccessResult } from '@/lib/learning-access'
import type { Lang } from '@/lib/i18n-server'
import { tr } from '@/lib/i18n-server'

export default function LessonAccessBlocked({ access, lang }: { access: LessonAccessResult; lang: Lang }) {
  const requiredLesson = Math.max(1, Number(access.requiredLesson || access.lessonNo - 1 || 1))
  const message = access.message || `请先完成第 ${requiredLesson} 课会话背诵后再学习本课`

  return (
    <section className="card" style={{ textAlign: 'center', marginTop: 16 }}>
      <h2>{tr(lang, '课程暂未解锁', 'Lesson Locked')}</h2>
      <p className="small" style={{ fontSize: 15 }}>{lang === 'en'
        ? `Please complete Lesson ${requiredLesson} recitation before studying this lesson.`
        : message}</p>
      <p style={{ marginTop: 14 }}>
        <Link className="btn" href="/lessons">{tr(lang, '返回课程列表', 'Back to Lessons')}</Link>
      </p>
    </section>
  )
}
