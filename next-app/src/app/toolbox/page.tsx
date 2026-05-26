import MinnaNav from '@/components/minna-nav'
import ToolboxClient from '@/components/toolbox-client'
import { getLang } from '@/lib/i18n'

export default async function ToolboxPage() {
  const lang = await getLang()
  return (
    <main>
      <MinnaNav active="toolbox" />
      <ToolboxClient lang={lang} />
    </main>
  )
}
