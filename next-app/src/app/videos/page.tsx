import MinnaNav from '@/components/minna-nav'
import RecitationVideosClient from '@/components/recitation-videos-client'
import { getLang, tr } from '@/lib/i18n-server'

export const dynamic = 'force-dynamic'

export default async function VideosPage() {
  const lang = await getLang()

  return (
    <main
      style={{
        maxWidth: 'none',
        paddingLeft: 0,
        paddingRight: 0,
        paddingBottom: 0,
        overflow: 'hidden',
      }}
    >
      <MinnaNav active="videos" />
      <header
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        <h1>{tr(lang, '会话视频', 'Recitation Videos')}</h1>
        <p>
          {tr(
            lang,
            '用教材原声先听懂每课会话，再跟读背诵。',
            'Understand each conversation with the original audio, then shadow and recite it.'
          )}
        </p>
      </header>
      <RecitationVideosClient lang={lang} />
    </main>
  )
}
