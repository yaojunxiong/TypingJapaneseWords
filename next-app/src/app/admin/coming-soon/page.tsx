import Link from 'next/link'

export default async function AdminComingSoonPage({
  searchParams
}: {
  searchParams?: Promise<{ feature?: string }>
}) {
  const params = await searchParams
  const feature = params?.feature || '此功能'

  return (
    <>
      <section className="heroCard card">
        <div className="heroEmoji">🚧</div>
        <h2>{feature}</h2>
        <p className="small">当前状态：开发中</p>
      </section>
      <section className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <p>此功能正在开发中，敬请期待。</p>
        <p style={{ marginTop: '1.5rem' }}>
          <Link className="btn" href="/admin">返回后台首页</Link>
        </p>
      </section>
    </>
  )
}
