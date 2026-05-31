/**
 * Apply "ready_to_publish" drafts from Supabase to local JSON files.
 *
 * Usage:
 *   npx tsx scripts/publish-drafts.ts
 *
 * This script:
 *   1. Fetches all drafts with status 'ready_to_publish' from Supabase
 *   2. Loads the corresponding lesson JSON files
 *   3. Overlays draft fields onto the matching items
 *   4. Writes updated JSON files
 *   5. Updates draft status to 'published'
 *   6. Records the publish in lesson_publish_logs
 */

import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const ROOT = path.resolve(process.cwd())
const LESSON_DIR = path.join(ROOT, 'src', 'data', 'minna', 'lessons')

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface DraftRow {
  id: string
  lesson_no: number
  stage: string
  item_id: string
  draft_data: Record<string, unknown>
  status: string
  message: string | null
  created_at: string
}

/* ------------------------------------------------------------------ */
/*  Supabase client                                                    */
/* ------------------------------------------------------------------ */

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL not set')

  // Use service role key for admin operations if available
  const key = serviceKey || supabaseKey
  if (!key) throw new Error('No Supabase key found')

  return createClient(supabaseUrl, key, {
    auth: { persistSession: false },
  })
}

/* ------------------------------------------------------------------ */
/*  Main                                                              */
/* ------------------------------------------------------------------ */

async function main() {
  console.log('📦 Publishing drafts...\n')

  const supabase = getSupabase()

  // 1. Fetch ready_to_publish drafts
  const { data: drafts, error } = await supabase
    .from('lesson_drafts')
    .select('*')
    .eq('status', 'ready_to_publish')
    .order('lesson_no', { ascending: true })
    .order('stage', { ascending: true })

  if (error) {
    console.error('❌ Failed to fetch drafts:', error.message)
    process.exit(1)
  }

  if (!drafts || drafts.length === 0) {
    console.log('✅ No drafts to publish.')
    return
  }

  console.log(`Found ${drafts.length} draft(s) to publish.\n`)

  // Group drafts by lesson_no
  const groups = new Map<number, DraftRow[]>()
  for (const d of drafts) {
    if (!groups.has(d.lesson_no)) groups.set(d.lesson_no, [])
    groups.get(d.lesson_no)!.push(d)
  }

  let updatedFiles = 0
  let updatedItems = 0

  for (const [lessonNo, group] of groups) {
    const filePath = path.join(LESSON_DIR, `lesson-${String(lessonNo).padStart(2, '0')}.json`)

    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  Lesson file not found: ${filePath}`)
      continue
    }

    // 2. Load lesson JSON
    const raw = fs.readFileSync(filePath, 'utf-8')
    const lesson = JSON.parse(raw)

    // Group drafts by stage within this lesson
    const stageGroups = new Map<string, DraftRow[]>()
    for (const d of group) {
      if (!stageGroups.has(d.stage)) stageGroups.set(d.stage, [])
      stageGroups.get(d.stage)!.push(d)
    }

    let lessonChanges = 0

    for (const [stage, stageDrafts] of stageGroups) {
      const section = lesson.sections?.find((s: any) => s.type === stage)
      if (!section) {
        console.warn(`⚠️  Section "${stage}" not found in lesson ${lessonNo}`)
        continue
      }

      const items = section.items as Record<string, unknown>[] | undefined
      if (!items) continue

      // 3. Overlay draft fields onto matching items
      for (const draft of stageDrafts) {
        const item = items.find((i) => String(i.id || '') === draft.item_id)
        if (!item) {
          console.warn(`⚠️  Item "${draft.item_id}" not found in lesson ${lessonNo} / ${stage}`)
          continue
        }

        Object.assign(item, draft.draft_data)
        lessonChanges++
        updatedItems++
      }
    }

    if (lessonChanges > 0) {
      // Write back to file
      fs.writeFileSync(filePath, JSON.stringify(lesson, null, 2) + '\n', 'utf-8')
      updatedFiles++
      console.log(`✅ Lesson ${String(lessonNo).padStart(2, '0')}: ${lessonChanges} item(s) updated`)
    }
  }

  console.log(`\n📝 ${updatedFiles} file(s) written, ${updatedItems} item(s) updated`)

  // 5. Update draft status to 'published'
  const draftIds = drafts.map((d) => d.id)
  const { error: updateError } = await supabase
    .from('lesson_drafts')
    .update({ status: 'published' })
    .in('id', draftIds)

  if (updateError) {
    console.error('❌ Failed to update draft status:', updateError.message)
  } else {
    console.log(`✅ ${draftIds.length} draft(s) marked as published`)
  }

  // 6. Create publish log
  const affectedLessons = [...groups.keys()].sort()
  const stages = [...new Set(drafts.map((d) => d.stage))]

  const { error: logError } = await supabase
    .from('lesson_publish_logs')
    .insert({
      draft_ids: draftIds,
      summary: {
        lessons: affectedLessons,
        stages,
        items: draftIds,
        total: drafts.length,
      },
      status: 'success',
    })

  if (logError) {
    console.error('❌ Failed to create publish log:', logError.message)
  } else {
    console.log('✅ Publish log created')
  }

  console.log('\n🎉 Publish complete!')
  console.log('\nNext steps:')
  console.log('  git add -A')
  console.log(`  git commit -m "content: publish lesson drafts ${new Date().toISOString().slice(0, 10)}"`)
  console.log('  git push origin main')
  console.log('  npx vercel --prod')
}

main().catch((err) => {
  console.error('❌ Fatal error:', err)
  process.exit(1)
})
