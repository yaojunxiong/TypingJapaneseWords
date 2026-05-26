import MinnaNav from '@/components/minna-nav'
import MistakesClient from '@/components/mistakes-client'

export default function MistakesPage() {
  return (
    <main>
      <MinnaNav active="toolbox" />
      <MistakesClient />
    </main>
  )
}
