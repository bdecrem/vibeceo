import { type Message } from '@/lib/openai'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

// Simple markdown link renderer
function renderMarkdownLinks(text: string): JSX.Element[] {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
  const parts: JSX.Element[] = []
  let lastIndex = 0
  let match

  while ((match = linkRegex.exec(text)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {text.slice(lastIndex, match.index)}
        </span>
      )
    }
    
    // Add the clickable link
    parts.push(
      <a
        key={`link-${match.index}`}
        href={match[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-800 underline font-medium"
      >
        {match[1]}
      </a>
    )
    
    lastIndex = match.index + match[0].length
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(
      <span key={`text-${lastIndex}`}>
        {text.slice(lastIndex)}
      </span>
    )
  }
  
  return parts.length > 0 ? parts : [<span key="text">{text}</span>]
}

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
          ? 'bg-[#1a3d3d]/10 text-[#1a3d3d] border border-[#1a3d3d]/10' 
          : 'bg-[#40e0d0]/10 text-[#1a3d3d] border border-[#40e0d0]/10'
        }`,
        isStreaming && 'animate-pulse'
      )}>
        <div className="prose dark:prose-invert prose-p:my-0 prose-pre:my-0 whitespace-pre-wrap">
          {renderMarkdownLinks(displayContent)}
          {isStreaming && (
            <span className="inline-block w-1.5 h-4 ml-0.5 -mb-0.5 bg-current animate-blink" />
          )}
        </div>
        {time && (
          <div className="text-xs mt-1 text-[#1a3d3d]/50">
            {time}
          </div>
        )}
      </div>
    </div>
  )
} 