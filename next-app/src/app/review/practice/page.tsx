import MinnaNav from '@/components/minna-nav'
import ReviewPracticeClient from '@/components/review-practice-client'
import { getLang } from '@/lib/i18n'

export default async function ReviewPracticePage() {
  const lang = await getLang()
  return (
    <main>
      <MinnaNav active="favorites" />
      <ReviewPracticeClient lang={lang} />
    </main>
  )
}
