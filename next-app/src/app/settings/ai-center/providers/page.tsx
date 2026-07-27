export default function ProvidersPage() {
  return <PlaceholderPage title="Providers" description="AI model provider management will be displayed here." />
}

function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px', color: '#f1f5f9' }}>{title}</h1>
      <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>{description}</p>
    </div>
  )
}
