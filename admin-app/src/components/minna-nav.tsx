import { getLang } from '@/lib/i18n-server'
import StudyMobileChrome, { type StudyNavKey } from '@/components/study-mobile-chrome'

type Props = {
  active: StudyNavKey
  showTopBar?: boolean
  showBottomNav?: boolean
}

export default async function MinnaNav({ active, showTopBar = true, showBottomNav = true }: Props) {
  const lang = await getLang()
  return (
    <StudyMobileChrome
      lang={lang}
      active={active}
      showTopBar={showTopBar}
      showBottomNav={showBottomNav}
    />
  )
}
