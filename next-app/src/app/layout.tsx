import type { Metadata } from 'next'
import './globals.css'
import { getLang } from '@/lib/i18n'
import VisitorActivityTracker from '@/components/visitor-activity-tracker'

export const metadata: Metadata = {
  title: 'Minna Next',
  description: 'Minna no Nihongo - Next.js migration shell'
}

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  const lang = await getLang()
  return (
    <html lang={lang === 'en' ? 'en' : 'zh-CN'}>
      <body>
        <VisitorActivityTracker />
        {children}
      </body>
    </html>
  )
}
