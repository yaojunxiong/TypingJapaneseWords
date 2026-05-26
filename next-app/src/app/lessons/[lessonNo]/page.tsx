import Link from 'next/link'
import MinnaNav from '@/components/minna-nav'
import { LESSONS_1_50 } from '@/lib/minna-lessons'

export default async function LessonDetailPage({
  params
}: {
  params: Promise<{ lessonNo: string }>
}) {
  const { lessonNo } = await params
  const no = Math.max(1, Math.min(50, Number(lessonNo) || 1))
  const lesson = LESSONS_1_50.find((x) => x.no === no) || LESSONS_1_50[0]

  return (
    <main>
      <MinnaNav active="lessons" />

      <section className="heroCard card">
        <div className="heroEmoji">📘</div>
        <h2>第 {lesson.no} 课 · {lesson.title}</h2>
        <p className="small">{lesson.subtitle}</p>
      </section>

      <section className="card">
        <h3>学习入口</h3>
        <p><Link href="/toolbox">进入学习中心</Link></p>
        <p><Link href="/lessons">返回课程目录</Link></p>
      </section>
    </main>
  )
}
