import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Minna Next',
  description: 'Minna no Nihongo - Next.js migration shell'
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
