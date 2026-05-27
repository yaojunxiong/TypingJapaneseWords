import MinnaNav from '@/components/minna-nav'
import HomeProgressClient from '@/components/home-progress-client'
import { getLang } from '@/lib/i18n'

export default async function Page() {
  const lang = await getLang()

  return (
    <main>
      <MinnaNav active="home" />
      <HomeProgressClient lang={lang} />
    </main>
  )
}
