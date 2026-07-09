import { redirect } from 'next/navigation'
import { unifiedLoginUrl } from '@/lib/unified-auth'

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = searchParams ? await searchParams : {}
  redirect(unifiedLoginUrl(params.next))
}
