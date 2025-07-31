'use client'

import { useState } from 'react'

interface HomepageTruncatedPromptProps {
  prompt: string
  maxLength?: number // characters
  className?: string
  style?: React.CSSProperties
  onClick?: () => void
}

export default function HomepageTruncatedPrompt({ 
  prompt, 
  maxLength = 120, 
  className = '', 
  style = {},
  onClick
}: HomepageTruncatedPromptProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const shouldTruncate = prompt.length > maxLength
  const displayText = shouldTruncate && !isExpanded 
    ? prompt.substring(0, maxLength).trim()
    : prompt
  
  const handleClick = () => {
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
      {displayText}
      {shouldTruncate && !isExpanded && (
        <span style={{ opacity: 0.6 }}>...</span>
      )}
      
      {shouldTruncate && (
        <div style={{ 
          marginTop: '0.5rem'
        }}>
          <button
            onClick={handleToggleExpand}
            style={{
              background: 'none',
              border: 'none',
              padding: '0',
              fontSize: '0.85em',
              fontWeight: '500',
              color: 'var(--yellow)',
              cursor: 'pointer',
              textDecoration: 'underline',
              textDecorationStyle: 'dotted',
              textUnderlineOffset: '2px',
              opacity: 0.8,
              transition: 'opacity 0.2s ease',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.color = 'var(--yellow-dark)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '0.8';
              e.currentTarget.style.color = 'var(--yellow)';
            }}
          >
            {isExpanded ? 'show less' : 'more'}
          </button>
        </div>
      )}
    </div>
  )
} 