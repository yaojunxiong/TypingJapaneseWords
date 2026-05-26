import MinnaNav from '@/components/minna-nav'
import ToolboxClient from '@/components/toolbox-client'

export default function ToolboxPage() {
  return (
    <main>
      <MinnaNav active="toolbox" />
      <ToolboxClient />
    </main>
  )
}
