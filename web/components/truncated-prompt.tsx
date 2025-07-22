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
    ? prompt.substring(0, maxLength).trim()
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
      <div>
        "{displayText}
        {shouldTruncate && !isExpanded && (
          <span style={{ opacity: 0.6 }}>...</span>
        )}"
      </div>
      
      {shouldTruncate && !isExpanded && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end',
          marginTop: '2px'
        }}>
          <button
            onClick={handleToggleExpand}
            style={{
              background: 'none',
              border: 'none',
              padding: '0',
              fontSize: '0.85em',
              fontWeight: '500',
              color: 'currentColor',
              cursor: 'pointer',
              textDecoration: 'underline',
              textDecorationStyle: 'dotted',
              textUnderlineOffset: '2px',
              opacity: 0.8,
              transition: 'opacity 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '0.8';
            }}
          >
            more
          </button>
        </div>
      )}
      
      {shouldTruncate && isExpanded && (
        <>
          "{displayText}"
                     <div style={{ 
             display: 'flex', 
             justifyContent: 'flex-end',
             marginTop: '2px'
           }}>
            <button
              onClick={handleToggleExpand}
              style={{
                background: 'none',
                border: 'none',
                padding: '0',
                fontSize: '0.8em',
                fontWeight: '500',
                color: 'currentColor',
                cursor: 'pointer',
                textDecoration: 'underline',
                textDecorationStyle: 'dotted',
                textUnderlineOffset: '2px',
                opacity: 0.8,
                transition: 'opacity 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.8';
              }}
            >
              show less
            </button>
          </div>
        </>
      )}
    </div>
  )
} 