import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export function GET() {
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA || ''
  const commitRef = process.env.VERCEL_GIT_COMMIT_REF || ''
  const deploymentId = process.env.VERCEL_DEPLOYMENT_ID || ''
  const environment = process.env.VERCEL_ENV || ''

  return NextResponse.json({
    commitSha,
    commitRef,
    deploymentId,
    environment,
  })
}
