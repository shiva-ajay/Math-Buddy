import { ChatHeader } from './ChatHeader'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'

export function ChatArea() {
  return (
    <div className="flex flex-col h-full min-w-0 overflow-hidden">
      <ChatHeader />
      <div className="flex-1 min-h-0 flex flex-col">
        <MessageList />
        <ChatInput />
      </div>
    </div>
  )
}
