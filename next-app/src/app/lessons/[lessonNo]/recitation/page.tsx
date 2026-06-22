import { Suspense } from 'react'
import RecitationPageClient from '@/components/recitation-page-client'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ lessonNo: string }>
}

export default async function RecitationPage({ params }: Props) {
  const { lessonNo } = await params
  const num = parseInt(lessonNo, 10)

  return (
    <Suspense fallback={<div className="page-container" style={{ textAlign: 'center', paddingTop: 40 }}>加载中...</div>}>
      <RecitationPageClient lessonNo={num} />
    </Suspense>
  )
}
