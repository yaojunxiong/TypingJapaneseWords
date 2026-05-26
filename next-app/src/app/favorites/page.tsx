import MinnaNav from '@/components/minna-nav'
import FavoritesClient from '@/components/favorites-client'

export default function FavoritesPage() {
  return (
    <main>
      <MinnaNav active="favorites" />
      <FavoritesClient />
    </main>
  )
}
