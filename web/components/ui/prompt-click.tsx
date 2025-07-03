"use client"

import React from "react"

interface PromptClickProps {
  prompt: string
  className?: string
}

export function PromptClick({ prompt, className = "" }: PromptClickProps) {
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // Visual feedback will be handled by CSS animation
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const handlePromptClick = (e: React.MouseEvent) => {
    copyToClipboard(prompt)
    // Add clicked class for animation
    const target = e.target as HTMLElement
    target.classList.add("clicked")
    setTimeout(() => {
      target.classList.remove("clicked")
    }, 600)
  }

  return (
    <div className={`prompt-showcase ${className}`} onClick={handlePromptClick}>
      "{prompt}"
    </div>
  )
} 