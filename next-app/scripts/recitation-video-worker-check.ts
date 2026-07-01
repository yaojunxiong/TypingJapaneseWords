import { createClient } from '@supabase/supabase-js'
import path from 'node:path'
import fs from 'node:fs/promises'
import { execSync } from 'node:child_process'

async function loadEnv() {
  const envFile = path.resolve(process.cwd(), '.env.local')
  try {
    await fs.access(envFile)
  } catch {
    console.error('❌ 未找到 .env.local 文件')
    console.error('   请参考 .env.video-worker.example 创建：')
    console.error('   cp .env.video-worker.example .env.local')
    process.exit(1)
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    process.loadEnvFile(envFile)
  }

  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    key: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  }
}

async function main() {
  console.log('🔍 Recitation Video Worker 环境检查\n')

  const { url, key } = await loadEnv()

  // 1. 检查 NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    console.log('  NEXT_PUBLIC_SUPABASE_URL  ...  缺失')
  } else {
    console.log('  NEXT_PUBLIC_SUPABASE_URL  ...  OK')
  }

  // 2. 检查 SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    console.log('  SUPABASE_SERVICE_ROLE_KEY  ...  缺失')
  } else {
    console.log('  SUPABASE_SERVICE_ROLE_KEY  ...  OK')
  }

  if (!url || !key) {
    console.error('\n❌ 请完成环境变量配置后再试。')
    process.exit(1)
  }

  // 3. 检查 ffmpeg
  try {
    execSync('ffmpeg -version', { stdio: 'pipe', encoding: 'utf-8' })
    console.log('  ffmpeg                     ...  OK')
  } catch {
    console.log('  ffmpeg                     ...  失败（未安装或不在 PATH 中）')
    console.error('\n❌ 请安装 ffmpeg：brew install ffmpeg')
    process.exit(1)
  }

  // 4. 检查 Supabase 连接
  try {
    const supabase = createClient(url, key)
    const { error } = await supabase
      .from('admin_recitation_video_projects')
      .select('id', { count: 'exact', head: true })
      .limit(0)

    if (error) {
      console.log('  Supabase 连接               ...  失败')
      console.error(`\n❌ 连接错误：${error.message}`)
      process.exit(1)
    }
    console.log('  Supabase 连接               ...  OK')
  } catch (err) {
    console.log('  Supabase 连接               ...  失败')
    console.error(`\n❌ 连接错误：${(err as Error).message}`)
    process.exit(1)
  }

  console.log('\n✅ 环境检查通过，可以启动 video-worker。')
}

main()
