import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function verify() {
  console.log('')
  console.log('========================================')
  console.log('  Production Recording Verification')
  console.log('========================================')
  console.log('')

  // 1. Check recording_takes table exists and count
  console.log('1. recording_takes table:')
  const { count, error: countError } = await supabase
    .from('recording_takes')
    .select('*', { count: 'exact', head: true })
  if (countError) {
    console.log(`   ❌ ERROR: ${countError.message}`)
  } else {
    console.log(`   ✅ Table exists, total records: ${count}`)
  }

  // 2. Query active (non-deleted) records
  const { data: active, error: activeError } = await supabase
    .from('recording_takes')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(20)

  if (activeError) {
    console.log(`   ❌ ERROR querying takes: ${activeError.message}`)
  } else {
    console.log(`   Active records: ${active?.length || 0}`)
    if (active && active.length > 0) {
      for (const r of active.slice(0, 5)) {
        console.log(`     - user=${r.user_id.slice(0,8)} lesson=${r.lesson_no} line=${r.line_no} take=${r.take_no} best=${r.is_best} status=${r.upload_status}`)
      }
      const latest = active[0]
      console.log('')
      console.log('   Latest recording (full):')
      console.log(`     id:             ${latest.id}`)
      console.log(`     user_id:        ${latest.user_id}`)
      console.log(`     lesson_no:      ${latest.lesson_no}`)
      console.log(`     line_no:        ${latest.line_no}`)
      console.log(`     take_no:        ${latest.take_no}`)
      console.log(`     storage_path:   ${latest.storage_path}`)
      console.log(`     audio_mime_type:${latest.audio_mime_type}`)
      console.log(`     duration_ms:    ${latest.duration_ms}`)
      console.log(`     score:          ${latest.score}`)
      console.log(`     is_best:        ${latest.is_best}`)
      console.log(`     upload_status:  ${latest.upload_status}`)
      console.log(`     created_at:     ${latest.created_at}`)
    }
  }

  // 3. Check Storage bucket
  console.log('')
  console.log('2. Storage bucket "recordings":')
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
  if (bucketError) {
    console.log(`   ❌ ERROR: ${bucketError.message}`)
  } else {
    const b = buckets.find(b => b.id === 'recordings')
    if (b) {
      console.log(`   ✅ Bucket exists`)
      console.log(`   id:      ${b.id}`)
      console.log(`   name:    ${b.name}`)
      console.log(`   public:  ${b.public}`)
      if (b.public) {
        console.log('   ❌ SECURITY RISK: Bucket is PUBLIC!')
      } else {
        console.log('   ✅ Bucket is private')
      }
    } else {
      console.log('   ❌ Bucket "recordings" does NOT exist')
    }
  }

  // 4. List files in recordings bucket (first level)
  if (buckets?.find(b => b.id === 'recordings')) {
    console.log('')
    console.log('3. Files in recordings bucket:')
    const { data: files, error: filesError } = await supabase.storage
      .from('recordings')
      .list()
    if (filesError) {
      console.log(`   ❌ ERROR: ${filesError.message}`)
    } else {
      console.log(`   Top-level folders: ${files?.length || 0}`)
      for (const f of (files || []).slice(0, 10)) {
        console.log(`     - ${f.name} (${f.id})`)
      }
    }
  }

  // 5. Check best take integrity
  if (active && active.length > 1) {
    console.log('')
    console.log('4. Best take integrity:')
    const bestTakes = active.filter(r => r.is_best)
    console.log(`   Total best takes: ${bestTakes.length}`)
    const groups = new Map()
    for (const r of active) {
      const key = `${r.user_id}-${r.lesson_no}-${r.line_no}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(r)
    }
    let allGood = true
    for (const [key, takes] of groups) {
      const bestCount = takes.filter(t => t.is_best).length
      if (bestCount > 1) {
        console.log(`   ⚠️  ${key}: ${bestCount} best takes (expected 1)`)
        allGood = false
      }
    }
    if (allGood && groups.size > 0) {
      console.log('   ✅ All lines have at most 1 best take')
    }
  }

  // 6. Check deleted records
  const { data: deleted, error: delError } = await supabase
    .from('recording_takes')
    .select('id, deleted_at')
    .not('deleted_at', 'is', null)
    .limit(5)
  if (!delError && deleted) {
    console.log('')
    console.log(`5. Soft-deleted records: ${deleted.length}`)
  }

  // 7. User count
  if (active && active.length > 0) {
    const uniqueUsers = new Set(active.map(r => r.user_id))
    console.log('')
    console.log(`6. Unique users with recordings: ${uniqueUsers.size}`)
  }

  console.log('')
  console.log('========================================')
  console.log('  Verification Complete')
  console.log('========================================')
  console.log('')
}

verify().catch(err => {
  console.error('Verification failed:', err)
  process.exit(1)
})
