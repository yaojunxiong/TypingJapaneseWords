import { Suspense } from 'react'
import RecitationPageClient from '@/components/recitation-page-client'
import { getLang } from '@/lib/i18n-server'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ lessonNo: string }>
}

export default async function RecitationPage({ params }: Props) {
  const { lessonNo } = await params
  const num = parseInt(lessonNo, 10)
  const lang = await getLang()

  return (
    <Suspense fallback={<div className="page-container" style={{ textAlign: 'center', paddingTop: 40 }}>加载中...</div>}>
      <RecitationPageClient lessonNo={num} lang={lang} />
    </Suspense>
  )
}
