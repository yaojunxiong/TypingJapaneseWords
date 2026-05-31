import Link from 'next/link'
import MinnaNav from '@/components/minna-nav'
import { getLang, tr } from '@/lib/i18n'

export default async function ReviewCenterPage() {
  const lang = await getLang()

  return (
    <main>
      <MinnaNav active="favorites" />
      <section className="heroCard card">
        <div className="heroEmoji">📚</div>
        <h2>{tr(lang, '复习中心', 'Review Center')}</h2>
        <p className="small">{tr(lang, '管理错题、收藏例句、集中复习', 'Manage mistakes, save examples, and review')}</p>
      </section>

      <section className="card">
        <div className="practiceChoices" style={{ flexDirection: 'column' }}>
          <Link href="/review/wrong" className="practiceChoice" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', textDecoration: 'none' }}>
            <span>📝 {tr(lang, '错题本', 'Wrong Answers')}</span>
            <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>{tr(lang, '查看答错的题目', 'View incorrect answers')} →</span>
          </Link>
          <Link href="/review/favorites" className="practiceChoice" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', textDecoration: 'none' }}>
            <span>⭐ {tr(lang, '收藏例句', 'Saved Examples')}</span>
            <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>{tr(lang, '浏览收藏的例句', 'Browse saved items')} →</span>
          </Link>
          <Link href="/review/practice" className="practiceChoice" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', textDecoration: 'none' }}>
            <span>🎯 {tr(lang, '复习模式', 'Review Mode')}</span>
            <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>{tr(lang, '针对错题集中练习', 'Practice wrong answers')} →</span>
          </Link>
        </div>
      </section>
    </main>
  )
}
