import { type Message } from '@/lib/openai'

interface ChatMessageProps {
  message: Message
  time?: string
}

export function ChatMessage({ message, time }: ChatMessageProps) {
  return (
    <div className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
      <div className={`
        max-w-[85%] rounded-lg px-4 py-2 
        ${message.role === 'assistant' 
          ? 'bg-muted text-muted-foreground' 
          : 'bg-primary text-primary-foreground'
        }
      `}>
        <div className="prose dark:prose-invert">
          {message.content}
        </div>
        {time && (
          <div className="text-xs mt-1 opacity-50">
            {time}
          </div>
        )}
      </div>
    </div>
  )
} 