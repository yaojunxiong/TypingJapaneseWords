import MinnaNav from '@/components/minna-nav'
import FavoritesClient from '@/components/favorites-client'
import { getLang } from '@/lib/i18n-server'

export default async function FavoritesPage() {
  const lang = await getLang()
  return (
    <main>
      <MinnaNav active="favorites" />
      <FavoritesClient lang={lang} />
    </main>
  )
}
