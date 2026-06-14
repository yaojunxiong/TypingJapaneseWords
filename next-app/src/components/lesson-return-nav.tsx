'use client'

import Link from 'next/link'

export default function LessonReturnNav({ lessonNo, lang }: { lessonNo: number; lang: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <Link
        href={`/lessons/${lessonNo}`}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 14, fontWeight: 500, color: '#2563eb',
          padding: '8px 0',
        }}
      >
        ← {lang === 'en' ? `Return to Lesson ${lessonNo}` : `返回第 ${lessonNo} 课`}
      </Link>
    </div>
  )
}
