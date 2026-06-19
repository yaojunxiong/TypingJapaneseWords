import MinnaNav from '@/components/minna-nav'
import MistakesClient from '@/components/mistakes-client'
import { getLang } from '@/lib/i18n-server'

export default async function MistakesPage() {
  const lang = await getLang()
  return (
    <main>
      <MinnaNav active="toolbox" />
      <MistakesClient lang={lang} />
    </main>
  )
}
