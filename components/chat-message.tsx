import { type Message } from '@/lib/claude'

interface ChatMessageProps {
  message: Message
  time: string
}

export function ChatMessage({ message, time }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'
  const isSystem = message.role === 'system'

  return (
    <div className="flex justify-start">
      <div className="flex flex-row items-end max-w-[95%]">
        <div className={`rounded-lg p-3 break-words ${
          isUser 
            ? "bg-primary text-primary-foreground" 
            : isSystem
              ? "bg-muted text-muted-foreground"
              : "bg-secondary text-secondary-foreground"
        }`}>
          <p>{message.content}</p>
          <span
            className={`text-xs ${
              isUser 
                ? "text-primary-foreground/70" 
                : "text-muted-foreground"
            } block mt-1`}
          >
            {time}
          </span>
        </div>
      </div>
    </div>
  )
} 