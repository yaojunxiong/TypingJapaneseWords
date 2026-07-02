import MinnaNav from '@/components/minna-nav'
import RecitationVideosClient from '@/components/recitation-videos-client'
import { getLang, tr } from '@/lib/i18n-server'

export const dynamic = 'force-dynamic'

export default async function VideosPage() {
  const lang = await getLang()

  return (
    <main>
      <MinnaNav active="videos" />
      <header style={{ margin: '14px 0 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 30 }} aria-hidden="true">🎬</span>
          <h1 style={{ margin: 0, fontSize: 26 }}>
            {tr(lang, '会话视频', 'Recitation Videos')}
          </h1>
        </div>
        <p className="small" style={{ margin: '8px 0 0', lineHeight: 1.6 }}>
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
