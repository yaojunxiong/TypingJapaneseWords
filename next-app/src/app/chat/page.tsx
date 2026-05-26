import MinnaNav from '@/components/minna-nav'
import ChatClient from '@/components/chat-client'

export default function ChatPage() {
  return (
    <main>
      <MinnaNav active="chat" />
      <h1>私信与群聊</h1>
      <p className="small">聊天迁移版：会话列表、消息详情、收发消息、群成员管理。</p>
      <ChatClient />
    </main>
  )
}
