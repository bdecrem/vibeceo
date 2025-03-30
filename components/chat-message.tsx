import { type Message } from '@/lib/openai'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface ChatMessageProps {
  message: Message
  time?: string
}

export function ChatMessage({ message, time }: ChatMessageProps) {
  const [displayContent, setDisplayContent] = useState(message.content)
  const isStreaming = message.role === 'assistant' && message.content !== displayContent

  useEffect(() => {
    setDisplayContent(message.content)
  }, [message.content])

  return (
    <div className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
      <div className={cn(`
        max-w-[85%] rounded-lg px-4 py-2 
        ${message.role === 'assistant' 
          ? 'bg-[#3B0A64]/10 text-[#3B0A64] border border-[#3B0A64]/10' 
          : 'bg-[#D1A6CB]/10 text-[#3B0A64] border border-[#D1A6CB]/10'
        }`,
        isStreaming && 'animate-pulse'
      )}>
        <div className="prose dark:prose-invert prose-p:my-0 prose-pre:my-0 whitespace-pre-wrap">
          {displayContent}
          {isStreaming && (
            <span className="inline-block w-1.5 h-4 ml-0.5 -mb-0.5 bg-current animate-blink" />
          )}
        </div>
        {time && (
          <div className="text-xs mt-1 text-[#3B0A64]/50">
            {time}
          </div>
        )}
      </div>
    </div>
  )
} 