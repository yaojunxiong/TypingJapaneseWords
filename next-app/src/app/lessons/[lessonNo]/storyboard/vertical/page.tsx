import MinnaNav from '@/components/minna-nav'
import TopLabelSync from '@/components/top-label-sync'
import VerticalPreviewClient from './vertical-preview-client'

export default function Page() {
  return (
    <main>
      <MinnaNav active="lessons" />
      <TopLabelSync label="第 1 课 · 短视频预览" />
      <VerticalPreviewClient />
    </main>
  )
}
