import { notFound } from 'next/navigation'
import MinnaNav from '@/components/minna-nav'
import TopLabelSync from '@/components/top-label-sync'
import { getStoryboardData } from '@/lib/storyboard-data'
import VerticalPreviewClient from './vertical-preview-client'

export default async function Page({
  params,
}: {
  params: Promise<{ lessonNo: string }>
}) {
  const { lessonNo: lessonNoParam } = await params
  const lessonNo = Number(lessonNoParam)
  const data = getStoryboardData(lessonNo)
  if (!data) notFound()

  return (
    <main>
      <MinnaNav active="lessons" />
      <TopLabelSync label={`第 ${lessonNo} 课 · 短视频预览`} />
      <VerticalPreviewClient
        lessonNo={lessonNo}
        storyboard={data.storyboard}
        review={data.review}
      />
    </main>
  )
}
