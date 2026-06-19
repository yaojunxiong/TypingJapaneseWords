import { Suspense } from 'react'
import MinnaNav from '@/components/minna-nav'
import ChatClient from '@/components/chat-client'
import { getLang, tr } from '@/lib/i18n-server'

export default async function ChatPage() {
  const lang = await getLang()
  return (
    <main>
      <MinnaNav active="chat" />
      <h1>{tr(lang, '私信与群聊', 'Direct Messages & Groups')}</h1>
      <p className="small">{tr(lang, '聊天迁移版：会话列表、消息详情、收发消息、群成员管理。', 'Chat migration: thread list, message details, messaging, and member management.')}</p>
      <Suspense fallback={<p className="small">{tr(lang, '聊天加载中...', 'Loading chat...')}</p>}>
        <ChatClient lang={lang} />
      </Suspense>
    </main>
  )
}
