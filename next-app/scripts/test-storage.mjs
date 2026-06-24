import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ycjuceortcduakxscfes.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljanVjZW9ydGNkdWFreHNjZmVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4ODA4ODMsImV4cCI6MjA5NDQ1Njg4M30.DZ92IY5x24eSuxbQBrisuJOQXLKMmF2LqQap-lK11kM'
const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  console.log('=== Checking recordings bucket ===')
  
  const { data: buckets, error: bucketErr } = await supabase.storage.listBuckets()
  if (bucketErr) {
    console.log('listBuckets error:', bucketErr.message)
  } else {
    console.log('Buckets:', JSON.stringify(buckets.map(b => ({ id: b.id, name: b.name, public: b.public }))))
  }
  
  // Try to list files in recordings
  console.log('\n=== Listing recordings bucket ===')
  const { data: files, error: listErr } = await supabase.storage.from('recordings').list()
  if (listErr) {
    console.log('list error:', listErr.message)
  } else {
    console.log('Files:', files?.length || 0)
  }
  
  // Try to upload a tiny test blob
  console.log('\n=== Test upload (anon) ===')
  const testBlob = new Blob(['fake audio data'], { type: 'audio/webm' })
  const { error: uploadErr } = await supabase.storage
    .from('recordings')
    .upload('test-unauthorized.webm', testBlob)
  if (uploadErr) {
    console.log('upload error (expected 401/403):', uploadErr.message)
  } else {
    console.log('upload succeeded (unexpected)')
  }
  
  // Check recording_takes table
  console.log('\n=== Checking recording_takes ===')
  const { data: takes, error: takesErr } = await supabase
    .from('recording_takes')
    .select('id, user_id, lesson_no, line_no, take_no, storage_path, upload_status, is_best, score, created_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(10)
  if (takesErr) {
    console.log('query error:', takesErr.message)
  } else {
    console.log(`Active takes: ${takes?.length || 0}`)
    if (takes && takes.length > 0) {
      for (const t of takes) {
        console.log(`  - lesson=${t.lesson_no} line=${t.line_no} take=${t.take_no} best=${t.is_best} status=${t.upload_status} user=${t.user_id.slice(0,8)}...`)
      }
      console.log('\nLatest take full:', JSON.stringify(takes[0], null, 2))
    }
  }
}

test().catch(console.error)
