'use client'

import { useState } from 'react'

interface TruncatedPromptProps {
  prompt: string
  maxLength?: number // characters
  className?: string
  style?: React.CSSProperties
  onClick?: () => void
  copyOnClick?: boolean
}

export default function TruncatedPrompt({ 
  prompt, 
  maxLength = 120, 
  className = '', 
  style = {},
  onClick,
  copyOnClick = false
}: TruncatedPromptProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const shouldTruncate = prompt.length > maxLength
  const displayText = shouldTruncate && !isExpanded 
    ? prompt.substring(0, maxLength).trim() + '...'
    : prompt
  
  const handleClick = () => {
    if (copyOnClick) {
      navigator.clipboard.writeText(prompt).then(() => {
        alert('📋 Prompt copied! Send it as an SMS to get started.')
      }).catch(() => {
        alert(`📋 Prompt: ${prompt}`)
      })
    }
    
    if (onClick) {
      onClick()
    }
  }
  
  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering parent click handlers
    setIsExpanded(!isExpanded)
  }
  
  return (
    <div className={className} style={style} onClick={handleClick}>
      "{displayText}"
      {shouldTruncate && (
        <button
          onClick={handleToggleExpand}
          className="ml-2 text-xs opacity-70 hover:opacity-100 transition-opacity underline hover:no-underline"
          style={{
            fontSize: '0.75rem',
            fontWeight: 'normal',
            fontStyle: 'normal',
            background: 'none',
            border: 'none',
            padding: 0,
            color: 'inherit'
          }}
        >
          {isExpanded ? 'LESS' : 'MORE'}
        </button>
      )}
    </div>
  )
} 