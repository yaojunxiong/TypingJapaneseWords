import MinnaNav from '@/components/minna-nav'
import WrongAnswersClient from '@/components/wrong-answers-client'
import { getLang } from '@/lib/i18n'

export default async function WrongAnswersPage() {
  const lang = await getLang()
  return (
    <main>
      <MinnaNav active="favorites" />
      <WrongAnswersClient lang={lang} />
    </main>
  )
}
