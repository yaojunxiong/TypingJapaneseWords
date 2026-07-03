import Link from 'next/link'
import { notFound } from 'next/navigation'
import MinnaNav from '@/components/minna-nav'
import StoryboardPageClient from '@/components/storyboard/storyboard-page-client'
import TopLabelSync from '@/components/top-label-sync'
import storyboardData from '@/data/minna/storyboards/lesson-01.json'
import type { StoryboardLesson } from '@/types/storyboard'

export default async function StoryboardPage({
  params,
}: {
  params: Promise<{ lessonNo: string }>
}) {
  const { lessonNo } = await params
  if (Number(lessonNo) !== 1) notFound()

  const storyboard = storyboardData as StoryboardLesson

  return (
    <main>
      <MinnaNav active="lessons" />
      <TopLabelSync label="第 1 课 · 课文图解分镜" />
      <div style={{ width: '100%', maxWidth: 430, margin: '0 auto' }}>
        <header className="card" style={{ marginBottom: 14 }}>
          <Link href="/lessons/1" style={{ display: 'inline-block', marginBottom: 10, fontSize: 13 }}>
            ← 返回课程
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <span style={{
              padding: '5px 9px',
              color: '#075985',
              fontSize: 12,
              fontWeight: 850,
              background: '#e0f2fe',
              borderRadius: 999,
            }}>
              课文图解分镜
            </span>
            <span className="small" style={{ fontSize: 12 }}>静态预览 v1</span>
          </div>
          <h1 style={{ margin: '10px 0 4px', fontSize: 24 }}>第 1 课｜初めまして</h1>
          <p className="small" style={{ margin: 0, lineHeight: 1.65 }}>
            按真实课文逐句拆解，先看懂三人关系和说话方向，再开始背诵。
          </p>
        </header>

        <StoryboardPageClient storyboard={storyboard} />
      </div>
    </main>
  )
}
