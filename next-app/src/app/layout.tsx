import type { Metadata } from 'next'
import './globals.css'
import { getLang } from '@/lib/i18n'
import AuthCodeRedirect from '@/components/auth-code-redirect'

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
        <AuthCodeRedirect />
        {children}
      </body>
    </html>
  )
}
