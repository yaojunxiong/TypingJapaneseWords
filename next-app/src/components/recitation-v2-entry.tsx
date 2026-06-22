import Link from 'next/link'
import { tr, type Lang } from '@/lib/i18n-server'

interface Props {
  lessonNo: number
  lang: Lang
}

export default function RecitationV2Entry({ lessonNo, lang }: Props) {
  const enabled = process.env.NEXT_PUBLIC_RECITATION_V2_ENABLED === 'true'

  if (!enabled) return null

  return (
    <section className="card" style={{ background: '#f0f9ff', borderColor: '#bae6fd' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 180, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 20 }}>🎙️</span>
            <strong>{tr(lang, '会话背诵 V2（新版）', 'Conversation Recitation V2')}</strong>
            <span style={{ fontSize: 11, background: '#818cf8', color: '#fff', padding: '2px 8px', borderRadius: 999 }}>
              NEW
            </span>
          </div>
          <p className="small" style={{ margin: 0 }}>
            {tr(lang,
              '逐句录音 → 系统评分 → 自动选最佳 → 生成完整会话音频',
              'Record per sentence → scored automatically → best take selected → full conversation audio')}
          </p>
        </div>
        <Link className="btn" href={`/lessons/${lessonNo}/recitation`} style={{ padding: '12px 20px' }}>
          {tr(lang, '开始背诵', 'Start Recitation')}
        </Link>
      </div>
    </section>
  )
}
