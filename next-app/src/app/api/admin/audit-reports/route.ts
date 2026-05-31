import fs from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

const REPORTS_DIR = path.resolve(process.cwd(), 'reports')

const REPORT_FILES = [
  'lesson-migration-audit.md',
  'full-site-practice-check.md',
] as const

export async function GET() {
  try {
    await requireAdmin()

    const reports: { name: string; content: string }[] = []
    for (const name of REPORT_FILES) {
      try {
        const content = await fs.readFile(path.join(REPORTS_DIR, name), 'utf-8')
        reports.push({ name, content })
      } catch {
        reports.push({ name, content: '' })
      }
    }

    return NextResponse.json({ reports })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown error'
    if (message === 'not authenticated') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    if (message === 'not authorized') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
