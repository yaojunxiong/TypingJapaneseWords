import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Admin - Minna Next',
  description: 'Learning system admin panel',
  icons: {
    icon: '/favicon.ico'
  }
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
