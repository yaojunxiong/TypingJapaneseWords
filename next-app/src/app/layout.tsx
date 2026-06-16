import type { Metadata } from 'next'
import './globals.css'
import { getLang } from '@/lib/i18n'
import VisitorActivityTracker from '@/components/visitor-activity-tracker'

export const metadata: Metadata = {
  title: 'Minna Next',
  description: 'Minna no Nihongo - Next.js migration shell',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' }
    ],
    apple: '/apple-touch-icon.png'
  },
  manifest: '/site.webmanifest'
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
