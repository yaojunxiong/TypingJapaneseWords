import CapabilityDetailClient from '@/components/ai-center/capability-detail-client'

export const dynamic = 'force-dynamic'

export default async function CapabilityDetailPage({
  params,
}: {
  params: Promise<{ capabilityId: string }>
}) {
  const { capabilityId } = await params
  return <CapabilityDetailClient capabilityId={capabilityId} />
}
