'use client'

import Link from 'next/link'
import type { CSSProperties } from 'react'
import MinnaTopStatsClient from '@/components/minna-top-stats-client'
import UserAuthEntry from '@/components/user-auth-entry'
import { tr, type Lang } from '@/lib/i18n'

export type StudyNavKey = 'home' | 'login' | 'me' | 'toolbox' | 'lessons' | 'messages' | 'favorites' | 'videos' | 'chat' | 'settings'

type NavItem = { key: StudyNavKey; label: string; href: string; icon: string }

type StudyTopStatusBarProps = {
  lang: Lang
  active?: StudyNavKey
  show?: boolean
  testId?: string
  style?: CSSProperties
}

type StudyBottomNavigationProps = {
  lang: Lang
  active: StudyNavKey
  show?: boolean
  testId?: string
}

type StudyMobileChromeProps = {
  lang: Lang
  active?: StudyNavKey
  showTopBar?: boolean
  showBottomNav?: boolean
  topBarTestId?: string
  bottomNavTestId?: string
  topBarStyle?: CSSProperties
}

function getPrimaryItems(lang: Lang): NavItem[] {
  return [
    { key: 'home', label: tr(lang, '首页', 'Home'), href: '/', icon: '🏠' },
    { key: 'lessons', label: tr(lang, '课程', 'Lessons'), href: '/lessons', icon: '🌳' },
    { key: 'toolbox', label: tr(lang, '学习', 'Learn'), href: '/toolbox', icon: '🧰' },
    { key: 'videos', label: tr(lang, '视频', 'Videos'), href: '/videos', icon: '🎬' },
    { key: 'messages', label: tr(lang, '消息', 'Inbox'), href: '/messages', icon: '🐟' },
  ]
}

function getExtraItems(lang: Lang): NavItem[] {
  return [
    { key: 'settings', label: tr(lang, '系统语言', 'Language'), href: '/settings', icon: '🌐' },
    { key: 'login', label: tr(lang, '登录', 'Sign in'), href: '/login', icon: '🔐' },
    { key: 'me', label: tr(lang, '我的', 'Me'), href: '/me', icon: '👤' },
    { key: 'chat', label: tr(lang, '聊天', 'Chat'), href: '/chat', icon: '💬' },
  ]
}

export function StudyTopStatusBar({ lang, active = 'home', show = true, testId, style }: StudyTopStatusBarProps) {
  if (!show) return null

  return (
    <header className="minnaTopClassic" data-testid={testId} style={style}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 10 }}>
        <div style={{ minWidth: 0, overflow: 'hidden' }}>
          <MinnaTopStatsClient lang={lang} active={active} />
        </div>
        <div className="minnaTopActions">
          <a
            className="minnaMainSiteLink"
            href="https://www.jimmyyao.com"
            title={tr(lang, '返回主站', 'Back to main site')}
            aria-label={tr(lang, '返回主站', 'Back to main site')}
          >
            <span className="minnaMainSiteMark">JY</span>
            <span className="minnaMainSiteText">{tr(lang, '主站', 'Main')}</span>
          </a>
          <UserAuthEntry lang={lang} />
        </div>
      </div>
    </header>
  )
}

export function StudyBottomNavigation({ lang, active, show = true, testId }: StudyBottomNavigationProps) {
  if (!show) return null

  const primaryItems = getPrimaryItems(lang)
  const extraItems = getExtraItems(lang)
  const activeInExtra = extraItems.some((item) => item.key === active)

  return (
    <nav className="card minnaNavCard" data-testid={testId}>
      {primaryItems.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={item.key === active ? 'miniTab active' : 'miniTab'}
        >
          <span className="miniTabIcon">{item.icon}</span>
          <b>{item.label}</b>
        </Link>
      ))}
      <details className={activeInExtra ? 'miniTabMore active' : 'miniTabMore'}>
        <summary className="miniTab">
          <span className="miniTabIcon">⚙️</span>
          <b>{tr(lang, '设置', 'More')}</b>
        </summary>
        <div className="miniTabMenu">
          {extraItems.map((item) => (
            <Link key={item.key} href={item.href} className={item.key === active ? 'miniTabMenuItem active' : 'miniTabMenuItem'}>
              <span>{item.icon}</span>
              <b>{item.label}</b>
            </Link>
          ))}
        </div>
      </details>
    </nav>
  )
}

export default function StudyMobileChrome({
  lang,
  active = 'home',
  showTopBar = true,
  showBottomNav = true,
  topBarTestId,
  bottomNavTestId,
  topBarStyle,
}: StudyMobileChromeProps) {
  return (
    <>
      <StudyTopStatusBar
        lang={lang}
        active={active}
        show={showTopBar}
        testId={topBarTestId}
        style={topBarStyle}
      />
      <StudyBottomNavigation
        lang={lang}
        active={active}
        show={showBottomNav}
        testId={bottomNavTestId}
      />
    </>
  )
}
